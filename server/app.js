import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));

function buildTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port),
    secure: Boolean(cfg.secure),
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });
}

app.post('/api/email/test', async (req, res) => {
  const { host, port, secure, user, pass } = req.body || {};
  if (!host || !port || !user || !pass) {
    return res.status(400).json({ ok: false, message: '请填写完整的 SMTP 配置' });
  }
  let transporter;
  try {
    transporter = buildTransporter({ host, port, secure, user, pass });
    await transporter.verify();
    res.json({ ok: true, message: '连接成功，邮箱登录有效' });
  } catch (err) {
    res.json({ ok: false, message: `连接失败：${err.message}` });
  } finally {
    if (transporter) transporter.close();
  }
});

app.post('/api/email/send', async (req, res) => {
  const { smtp, from, to, subject, text, attachments } = req.body || {};
  if (!smtp || !from || !to) {
    return res.status(400).json({ ok: false, message: '缺少发信配置' });
  }
  const mail = {
    from: from.name ? `"${from.name}" <${from.email}>` : from.email,
    to: to.name ? `"${to.name}" <${to.email}>` : to.email,
    subject: subject || '',
    text: text || '',
  };
  if (Array.isArray(attachments) && attachments.length) {
    mail.attachments = attachments.map((a) => ({
      filename: a.filename,
      contentType: a.contentType || 'application/pdf',
      content: Buffer.from(a.content, 'base64'),
    }));
  }
  let transporter;
  try {
    transporter = buildTransporter(smtp);
    await transporter.sendMail(mail);
    res.json({ ok: true, message: `已成功发送到 ${to.email}` });
  } catch (err) {
    res.json({ ok: false, message: `发送失败：${err.message}` });
  } finally {
    if (transporter) transporter.close();
  }
});

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

async function brevoSend({ apiKey, fromName, fromEmail, toName, toEmail, subject, text, attachments = [] }) {
  const body = {
    sender: { name: fromName || '', email: fromEmail },
    to: [{ name: toName || '', email: toEmail }],
    subject: subject || '',
    textContent: text || '',
  };
  const list = attachments.filter((a) => a.filename && a.content);
  if (list.length) {
    body.attachment = list.map((a) => ({ name: a.filename, content: a.content }));
  }
  const r = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg =
      data.message ||
      (Array.isArray(data.errors) && data.errors.length ? data.errors[0].message : '') ||
      `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

app.post('/api/email/brevo-send', async (req, res) => {
  const { apiKey, fromName, fromEmail, toName, toEmail, subject, text, attachments } = req.body || {};
  if (!apiKey || !fromEmail || !toEmail) {
    return res.status(400).json({ ok: false, message: '请填写完整的 Brevo 配置（API Key、发件邮箱、收件邮箱）' });
  }
  try {
    await brevoSend({ apiKey, fromName, fromEmail, toName, toEmail, subject, text, attachments });
    res.json({ ok: true, message: `已成功发送到 ${toEmail}` });
  } catch (err) {
    res.json({ ok: false, message: `发送失败：${err.message}` });
  }
});

const ELASTIC_ENDPOINT = 'https://api.elasticemail.com/v4/emails/transactional';

async function elasticSend({ apiKey, fromName, fromEmail, toEmail, subject, text, attachments = [] }) {
  const body = {
    Recipients: { To: [toEmail] },
    Content: {
      From: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      Subject: subject || '',
      Body: [{ ContentType: 'PlainText', Charset: 'utf-8', Content: text || '' }],
    },
  };
  const list = attachments.filter((a) => a.filename && a.content);
  if (list.length) {
    body.Content.Attachments = list.map((a) => ({
      BinaryContent: a.content,
      Name: a.filename,
      ContentType: a.contentType || 'application/pdf',
    }));
  }
  const r = await fetch(ELASTIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-elasticemail-apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.Error || `HTTP ${r.status}`);
  }
  return data;
}

app.post('/api/email/elastic-send', async (req, res) => {
  const { apiKey, fromName, fromEmail, toEmail, subject, text, attachments } = req.body || {};
  if (!apiKey || !fromEmail || !toEmail) {
    return res.status(400).json({ ok: false, message: '请填写完整的 Elastic Email 配置（API Key、发件邮箱、收件邮箱）' });
  }
  try {
    await elasticSend({ apiKey, fromName, fromEmail, toEmail, subject, text, attachments });
    res.json({ ok: true, message: `已成功发送到 ${toEmail}` });
  } catch (err) {
    res.json({ ok: false, message: `发送失败：${err.message}` });
  }
});

export default app;
