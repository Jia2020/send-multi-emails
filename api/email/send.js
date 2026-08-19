import nodemailer from 'nodemailer';

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

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
}
