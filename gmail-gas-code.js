/**
 * Gmail 免费发信通道（Google Apps Script Web App）
 *
 * 部署步骤：
 * 1. 打开 https://script.google.com 新建项目，删除默认代码，粘贴本文件全部内容，保存
 * 2. 点击右上角「部署」→「新建部署」→ 类型选择「Web 应用」
 * 3. 「执行身份」选择：我（你的 Gmail 账号）
 * 4. 「谁可以访问」选择：任何人
 * 5. 点击「部署」，按提示授权（同意 Google 访问你的 Gmail 发信）
 * 6. 复制部署后生成的 Web App URL（以 /exec 结尾），填入前端「Gmail 免费通道」的
 *    「脚本地址」输入框，再点「测试连接」即可
 *
 * 配额：普通 Google 账号每天可发 100 封邮件。
 * 注意：不要公开分享此脚本地址，拿到链接的人可以代你发信。
 *
 * 修改代码后如何生效：
 * 代码改动不会自动生效，需「部署」→「管理部署」→ 点击铅笔图标编辑 →「版本」选
 * 「新建版本」→ 保存后重新部署，才会用上新代码。
 */

// 浏览器直接访问脚本地址时收到的是 GET 请求，返回一个提示页避免报错
function doGet() {
  return HtmlService.createHtmlOutput(
    '<meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#333;line-height:1.7}h1{font-size:20px}</style>' +
      '<h1>Gmail 邮件发送端点已就绪</h1>' +
      '<p>此地址只接受 POST 请求（由「PDF 分页发件助手」前端调用），直接打开浏览器不会发信。</p>' +
      '<p>请回到应用，把本地址填入「Gmail 免费通道」的脚本地址，然后点击「测试连接」。</p>',
  );
}

function doPost(e) {
  var res = { ok: false, message: '' };
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('请求体为空');
    }
    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    var subject = data.subject;
    var text = data.text || '';
    var fromName = data.fromName || 'PDF 分页发件助手';
    var attachments = Array.isArray(data.attachments) ? data.attachments : [];

    if (!to || !subject) {
      throw new Error('缺少必要参数（to / subject）');
    }

    var blobs = attachments
      .filter(function (a) {
        return a.filename && a.content;
      })
      .map(function (a) {
        return Utilities.newBlob(
          Utilities.base64Decode(a.content),
          a.contentType || 'application/pdf',
          a.filename,
        );
      });

    var options = { name: fromName };
    if (blobs.length) options.attachments = blobs;

    GmailApp.sendEmail(to, subject, text, options);
    res.ok = true;
    res.message = '已成功发送到 ' + to;
  } catch (err) {
    res.message = '发送失败：' + err.message;
  }

  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
