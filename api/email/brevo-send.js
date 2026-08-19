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
}
