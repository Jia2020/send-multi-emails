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
}
