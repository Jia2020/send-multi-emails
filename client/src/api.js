const API = '/api';

async function post(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function testEmail(cfg) {
  return post('/email/test', cfg);
}

export function sendEmail(payload) {
  return post('/email/send', payload);
}

export function brevoSend(payload) {
  return post('/email/brevo-send', payload);
}

export function elasticSend(payload) {
  return post('/email/elastic-send', payload);
}

// Gmail 免费通道：浏览器直连 Google Apps Script Web App。
// 用 text/plain 发送 JSON，避免触发 CORS 预检（GAS 不处理 OPTIONS）。
export async function gasSend({ url, fromName, to, subject, text, attachments = [] }) {
  const payload = { fromName, to, subject, text, attachments };
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      ok: false,
      message:
        '网络错误：请求被拒绝。请检查：1) 部署脚本时「谁可以访问」必须选「任何人」；' +
        '2) 脚本地址必须是 /exec 结尾的部署地址；3) 修改代码后已重新部署新版本。',
    };
  }
  if (!res.ok) {
    return { ok: false, message: `HTTP ${res.status}` };
  }
  try {
    const data = await res.json();
    return data;
  } catch (_) {
    const text = await res.text().catch(() => '');
    return { ok: false, message: text.slice(0, 300) || '脚本返回异常，请检查部署配置' };
  }
}
