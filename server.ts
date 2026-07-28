import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Middleware to ensure all /api responses set Content-Type: application/json and support CORS
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') {
      return res.status(200).json({ ok: true });
    }
    next();
  });

  // Initialize Gemini AI client server-side safely
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Gemini AI initialization failed:', e);
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // SMTP Connection Tester (supports test-smtp, verify-smtp, connect-email, login-email)
  const handleSmtpTest: express.RequestHandler = async (req, res) => {
    if (req.method === 'GET') {
      return res.json({
        status: 'ok',
        endpoint: 'SMTP connection tester',
        usage: 'Send POST request with { user, pass, smtpHost, smtpPort } to test email login.',
      });
    }

    try {
      const { smtpHost, smtpPort, secure, user, pass } = req.body || {};

      if (!user || !pass) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a Gmail or Yahoo email address and 16-character App Password.',
        });
      }

      const cleanUser = String(user).trim();
      const cleanPass = String(pass).trim().replace(/\s+/g, '');
      const lowerUser = cleanUser.toLowerCase();
      const host = (smtpHost || '').trim();

      const isYahoo = host.includes('yahoo') || lowerUser.endsWith('@yahoo.com') || lowerUser.includes('@yahoo.');
      const isGmail = host.includes('gmail') || lowerUser.endsWith('@gmail.com');

      const portNum = Number(smtpPort) || (isYahoo ? 465 : 587);
      const isSecure = isNaN(secure) ? portNum === 465 : Boolean(secure);

      let transporter: nodemailer.Transporter;

      if (isGmail) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: cleanUser, pass: cleanPass },
        });
      } else if (isYahoo) {
        transporter = nodemailer.createTransport({
          service: 'yahoo',
          auth: { user: cleanUser, pass: cleanPass },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: host || 'smtp.mail.yahoo.com',
          port: portNum,
          secure: isSecure,
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000,
        });
      }

      await transporter.verify();

      const providerName = isGmail ? 'Google Gmail' : isYahoo ? 'Yahoo Mail' : 'SMTP';

      return res.json({
        success: true,
        message: `${providerName} SMTP verification successful! Connection is working normally and ready to dispatch emails.`,
      });
    } catch (err: any) {
      console.error('SMTP verification error:', err);
      let clientMsg = err?.message || 'SMTP verification failed, please check host address and App Password.';
      if (err?.code === 'EAUTH' || (err?.response && err.response.includes('535'))) {
        clientMsg = 'Email authentication failed (535): Invalid user or password! Make sure 2-Step Verification is enabled and a 16-character App Password is used.';
      } else if (err?.code === 'ETIMEDOUT' || err?.code === 'ESOCKET') {
        clientMsg = 'SMTP connection timed out. Please check network connection or SMTP port settings.';
      }

      return res.status(400).json({
        success: false,
        error: clientMsg,
      });
    }
  };

  const smtpRoutes = [
    '/api/test-smtp',
    '/api/test-smtp/',
    '/api/verify-smtp',
    '/api/verify-smtp/',
    '/api/connect-email',
    '/api/connect-email/',
    '/api/login-email',
    '/api/login-email/',
  ];
  smtpRoutes.forEach((route) => {
    app.all(route, handleSmtpTest);
  });

  // AI-assisted email subject and body generator endpoint
  app.all(['/api/ai-suggest-email', '/api/ai-suggest-email/'], async (req, res) => {
    if (req.method === 'GET') {
      return res.json({ status: 'ok', endpoint: 'AI Suggest Email' });
    }
    try {
      const { recipientEmail, recipientName, pageNumbers, textSnippet, fileName } = req.body || {};

      if (!ai) {
        // Fallback generator when Gemini API key is not present
        return res.json({
          subject: `Document Pages (${pageNumbers?.join(', ') || '1'}) from ${fileName || 'PDF'}`,
          body: `Hello ${recipientName || recipientEmail || 'Recipient'},\n\nPlease find attached page(s) ${pageNumbers?.join(', ') || '1'} from the document "${fileName || 'PDF'}".\n\nIf you have any questions, please feel free to reach out.\n\nBest regards,`,
          aiGenerated: false,
        });
      }

      const prompt = `You are a professional corporate email copywriter. Generate a concise, clear, and contextually relevant email subject and body for sending specific split PDF pages to a recipient.
Recipient Email: ${recipientEmail}
Recipient Name: ${recipientName || 'Not specified'}
Attached PDF Page Numbers: ${pageNumbers?.join(', ')}
Original File Name: ${fileName}
Extracted Text Snippet from Page(s): "${textSnippet || 'Financial / HR / Legal document page'}"

Return ONLY valid JSON with two fields:
"subject": string (professional subject line)
"body": string (polite professional body text including greeting, context, attachment reference, and sign-off)`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);

      return res.json({
        subject: parsed.subject || `Document Pages ${pageNumbers?.join(', ')}`,
        body: parsed.body || `Hello,\n\nPlease find attached page(s) ${pageNumbers?.join(', ')}.`,
        aiGenerated: true,
      });
    } catch (err: any) {
      console.error('AI Suggestion error:', err);
      return res.json({
        subject: `Document Pages ${req.body?.pageNumbers?.join(', ') || '1'} - ${req.body?.fileName || 'PDF'}`,
        body: `Hello,\n\nPlease find attached the requested PDF page(s).\n\nBest regards,`,
        aiGenerated: false,
        error: err?.message,
      });
    }
  });

  // Real Email Dispatcher via Nodemailer
  app.all(['/api/send-email', '/api/send-email/'], async (req, res) => {
    if (req.method === 'GET') {
      return res.json({ status: 'ok', endpoint: 'Send Email' });
    }
    try {
      const { sender, recipientEmail, subject, body, attachments } = req.body || {};

      if (!recipientEmail) {
        return res.status(400).json({ success: false, error: 'Recipient email address is missing' });
      }

      let transporter: nodemailer.Transporter;
      let fromAddress = sender?.email?.trim() || 'dispatcher.song@gmail.com';
      let fromName = sender?.name?.trim() || 'PDF Dispatcher';

      // 1. Check if user provided their SMTP app password
      if (sender?.appPassword && sender?.appPassword.trim()) {
        const cleanUser = (sender.email || '').trim();
        const cleanPass = sender.appPassword.trim().replace(/\s+/g, '');
        const lowerUser = cleanUser.toLowerCase();
        const host = (sender.smtpHost || '').trim();

        const isYahoo = host.includes('yahoo') || lowerUser.endsWith('@yahoo.com') || lowerUser.includes('@yahoo.');
        const isGmail = host.includes('gmail') || lowerUser.endsWith('@gmail.com');

        if (isGmail) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
          });
        } else if (isYahoo) {
          transporter = nodemailer.createTransport({
            host: 'smtp.mail.yahoo.com',
            port: 465,
            secure: true, // SSL required by Yahoo
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: { rejectUnauthorized: false },
          });
        } else {
          const portNum = Number(sender.smtpPort) || 465;
          transporter = nodemailer.createTransport({
            host: host || 'smtp.mail.yahoo.com',
            port: portNum,
            secure: portNum === 465 || sender.secure === true,
            auth: {
              user: cleanUser,
              pass: cleanPass,
            },
            tls: { rejectUnauthorized: false },
          });
        }
        fromAddress = cleanUser;
        fromName = sender.name || cleanUser.split('@')[0];
      } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // 2. Use system-configured environment SMTP
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: { rejectUnauthorized: false },
        });
        fromAddress = process.env.SMTP_USER;
      } else {
        // Return clear error requiring the App Password
        return res.status(400).json({
          success: false,
          error: 'App Password not configured! Please enter your 16-character App Password in the modal and try again.',
        });
      }

      // Convert attachments from base64 safely
      const mailAttachments = (attachments || []).map((att: { filename: string; content: string }) => {
        const cleanContent = (att.content || '').replace(/^data:[^;]+;base64,/, '');
        const filename = att.filename && att.filename.endsWith('.pdf') ? att.filename : `${att.filename || 'document'}.pdf`;
        return {
          filename,
          content: Buffer.from(cleanContent, 'base64'),
          contentType: 'application/pdf',
          disposition: 'attachment',
        };
      });

      const bodyText = body || 'Hello, please find your assigned PDF document in the attachment.';
      const bodyHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h3 style="color: #0f172a; margin-top: 0; font-size: 17px; font-weight: 700;">📄 You have received a new PDF document</h3>
          <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px; background-color: #f8fafc; padding: 14px; border-radius: 8px; border-left: 4px solid #6366f1;">${bodyText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div style="font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            📎 Please view or download the attached PDF document.<br/>
            Sender Account: ${fromAddress}
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: recipientEmail,
        replyTo: fromAddress,
        subject: subject || 'PDF Document Attachment Dispatch',
        text: bodyText,
        html: bodyHtml,
        attachments: mailAttachments,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);

      return res.json({
        success: true,
        trackingId: info.messageId || 'MSG-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        recipientEmail,
        subject,
        timestamp: new Date().toISOString(),
        message: `Email successfully sent from (${fromAddress}) to ${recipientEmail}`,
        previewUrl: previewUrl || undefined,
      });
    } catch (err: any) {
      console.error('Real Send Email error:', err);
      let errMsg = err?.message || 'Send failed, please check SMTP configuration.';
      if (err?.code === 'EAUTH' || (err?.response && err.response.includes('535'))) {
        errMsg = 'Email authentication failed (535): Invalid account or password! Make sure 2-Step Verification is enabled and a 16-character App Password is used.';
      }
      return res.status(500).json({
        success: false,
        error: errMsg,
      });
    }
  });

  // Explicit API 404 fallback before Vite middleware to ensure ALL /api/* requests receive JSON, never HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint ${req.method} ${req.path} not found.`,
    });
  });

  // Express global API error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express API error:', err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'Server encountered an error processing request.',
    });
  });

  // Vite development middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PDF Split & Email Dispatcher server listening on http://localhost:${PORT}`);
  });
}

startServer();
