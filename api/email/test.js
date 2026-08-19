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
}
