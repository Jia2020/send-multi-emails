import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const LANG_KEY = 'pdfmail_lang';

const zh = {
  common: {
    close: '关闭',
    cancel: '取消',
    selectAll: '全选',
    clearAll: '清空',
    page: '第 {n} 页',
  },
  app: {
    title: 'PDF 分页发件助手',
    tagline: '拆分 PDF → 分配页面 → 一键发邮件',
    pickPdf: '请选择 PDF 文件',
    mergedName: '{base} 等{n}个文件合并.pdf',
    fillTestEmail: '请先填写测试接收邮箱',
    testSubject: 'PDF 分页发件助手 连接测试',
    testName: '测试',
    testBodyGas: '这是一封连接测试邮件，收到说明 Gmail 通道配置正常，可以开始发送 PDF 邮件了。',
    testBodyBrevo: '这是一封连接测试邮件，收到说明 Brevo 配置正常，可以开始发送 PDF 邮件了。',
    testBodyElastic: '这是一封连接测试邮件，收到说明 Elastic Email 配置正常，可以开始发送 PDF 邮件了。',
    genPdfFail: '生成 PDF 失败：{msg}',
    selectPagesFirst: '请先勾选要下载的页面',
    usage: '使用说明：1. 配置邮箱并测试连接 → 2. 上传 PDF 自动拆页 → 3. 添加收件人，把页面拖入收件人卡片 → 4. 点击「生成新 PDF」合成附件 → 5. 拖拽 PDF 到发送区或点击「发送邮件」',
  },
  email: {
    title: '邮箱设置',
    connected: '已连接',
    descElastic: 'Elastic Email 免费通道：100 封/天，Gmail / Hotmail / Yahoo 都能作为发件人，不限来源 IP',
    descBrevo: 'Brevo 免费通道：免费 300 封/天，Gmail / Hotmail / Yahoo 都能作为发件人，无需邮箱授权码',
    descGas: 'Gmail 免费通道：部署一次脚本，用你的 Gmail 发件，本地和线上都能用',
    descSmtp: 'SMTP 通道：适合 Hotmail / Outlook、Yahoo 等邮箱',
    tabGmail: 'Gmail 免费',
    testBtn: '测试连接',
    testing: '正在测试…',
    subjectLabel: '邮件主题（发送时的默认主题）',
    bodyLabel: '邮件正文（发送时的默认正文）',
    pdfPlaceholder: 'PDF 文件',
    bodyPlaceholder: '您好，附件是发给您的 PDF 文件，请查收。',
    hintElastic: 'Elastic Email 免费 100 封/天，发件人显示为你验证过的邮箱；API Key 仅保存在当前浏览器本地。',
    hintBrevo: 'Brevo 通道免费 300 封/天，发件人显示为你验证过的邮箱；API Key 仅保存在当前浏览器本地。',
    hintGas: 'Gmail 通道免费、无需授权码，发件人显示为你的 Gmail 地址；Hotmail / Yahoo 请用 Elastic Email 或 SMTP 通道。',
    hintSmtp: '邮箱密码仅保存在当前浏览器本地，用于直连你的 SMTP 服务器。',
    stepsElastic: '使用步骤：1. 在 elasticemail.com 免费注册（免费额度 100 封/天，无需信用卡）→ 2. 「设置」→「发件人（Senders）」→ 添加你的 Gmail / Hotmail / Yahoo 邮箱，平台会向该邮箱发验证邮件，点链接确认 → 3. 右侧「API Keys」新建密钥 → 4. 把密钥填入上方 → 5. 点「测试连接」。不限制来源 IP，本地和线上都能用。',
    stepsBrevo: '使用步骤：1. 在 brevo.com 免费注册（免费额度 300 封/天）→ 2. 「发件人」→ 添加发件人，填你的 Gmail / Hotmail / Yahoo 邮箱，Brevo 会向该邮箱发一封验证邮件，点链接确认 → 3. 「SMTP 与 API」→「API 密钥」新建密钥，把 xkeysib- 开头的密钥填入上方 → 4. 点「测试连接」。免费版即可发送含 PDF 附件的邮件。',
    stepsGas: '部署步骤：1. 打开 script.google.com 新建项目，把项目根目录的 gmail-gas-code.js 内容粘贴进去并保存 → 2. 「部署」→「新建部署」→ 类型选「Web 应用」，执行身份选「我（你的 Gmail 账号）」，访问权限选「任何人」→ 3. 按提示授权 → 4. 复制 /exec 结尾的网址填入上方。普通 Google 账号每日可发 100 封。不要公开分享脚本地址。',
    fieldApiKey: 'API Key',
    yourApiKey: '你的 API Key',
    yourName: '你的名字',
    fromName: '发件人姓名（可选）',
    fromEmail: '发件邮箱地址',
    testEmail: '测试接收邮箱（测试连接用）',
    gasUrl: '脚本地址（GAS Web App URL）',
    provider: '邮箱服务商',
    emailAddr: '邮箱地址',
    password: '密码 / 授权码',
    smtpHost: 'SMTP 服务器',
    port: '端口',
    ssl: '使用 SSL / TLS 安全连接',
    show: '显示',
    hide: '隐藏',
    hintPrefix: '提示：{hint}',
  },
  prov: {
    outlook: { name: 'Hotmail / Outlook', hint: '使用账号密码（Microsoft 账号）登录即可，若开启了两步验证则需使用「应用密码」' },
    yahoo: { name: 'Yahoo 邮箱', hint: '需开启两步验证，并使用「应用专用密码」作为密码' },
    gmail: { name: 'Gmail（SMTP）', hint: '需开启两步验证并使用「应用专用密码」，而非登录密码' },
    qq: { name: 'QQ 邮箱', hint: '需在 QQ 邮箱设置中开启 SMTP 服务，使用「授权码」作为密码' },
    '163': { name: '163 邮箱', hint: '需开启 SMTP 服务，使用「客户端授权码」作为密码' },
    custom: { name: '自定义 SMTP', hint: '自行填写 SMTP 服务器' },
  },
  pages: {
    pickPdf: '请选择 PDF 文件',
    titleUpload: '上传 PDF',
    uploadDesc: '支持一次选择多个 PDF，将自动合并成一份新 PDF 再拆分成每一页',
    dropHere: '拖拽一个或多个 PDF 到这里',
    orClick: '或点击选择文件',
    mergeNote: '多个 PDF 会按选择顺序合并成一份新文档',
    titlePages: '已拆分的页面',
    meta: '{name} · 共 {n} 页',
    batchName: '批量命名',
    downloadSelected: '下载选中页',
    downloadSelectedTitle: '下载勾选页面合成的 PDF',
    selectAll: '全选',
    deselectAll: '取消全选',
    changeFile: '更换文件',
    hint: '点击页面放大预览并改名；勾选多页后可拖拽分配或直接下载合成 PDF。',
    pageTitle: '点击放大预览 / 拖拽分配',
    selected: '已选',
    previewTitle: '第 {n} 页预览',
    downloadPage: '下载本页 PDF',
    pageName: '页面名称',
    pdfName: 'PDF 名称',
    docNamePh: '文档名称',
    nameHint: '页面名称与 PDF 名称会用于生成新 PDF 的文件名。',
    batchTitle: '批量修改页面名称',
    batchPh: '输入统一名称，例如：合同',
    applyAll: '应用到全部页面',
  },
  rec: {
    title: '收件人',
    sendAll: '全部发送',
    namePh: '姓名（可选）',
    emailPh: '邮箱',
    addBtn: '添加收件人',
    invalidEmail: '请输入有效的邮箱地址',
    groups: '群',
    newGroup: '新建群',
    groupNamePh: '输入群名称，如：财务部 / 全体客户',
    saveGroup: '保存群',
    existingGroups: '已有群（点击一键载入全部成员）',
    memberCount: '{n} 人',
    loadGroupTitle: '点击载入 {n} 人',
    delGroup: '删除群',
    draftHint: '点击下方常用收件人勾选群成员，然后输入群名保存',
    groupNameRequired: '请输入群名称',
    groupSaved: '群「{name}」已保存，共 {n} 人（同名群已更新）',
    groupNoMember: '请至少勾选一位常用收件人',
    groupLoaded: '已从群「{name}」添加 {n} 人',
    groupAlreadyLoaded: '群「{name}」的所有成员都已在列表中',
    savedPick: '常用收件人（点击勾选成员）',
    savedClick: '常用收件人（点击快速添加）',
    savedTitle: '常用收件人',
    choose: '点击勾选 {n}',
    unchoose: '点击取消勾选 {n}',
    addSaved: '点击添加 {n}',
    count: '共 {n} 位收件人',
    showEmails: '查看全部邮箱',
    hideEmails: '收起邮箱列表',
    emptyTitle: '还没有收件人',
    emptyTip: '在上方输入邮箱添加收件人',
    delete: '删除',
    dropPagesTip: '拖拽页面到此处',
    genPdf: '生成新 PDF',
    generating: '生成中…',
    view: '查看',
    remove: '移除',
    subjectLabel: '邮件主题（留空用全局默认）',
    bodyLabel: '邮件内容（留空用全局默认）',
    subjectPh: 'PDF 文件',
    bodyPh: '您好，附件是发给您的 PDF 文件，请查收。',
    pageUnit: '页',
    sendBtn: '发送邮件',
    sending: '正在发送…',
    sent: '已发送 ✓',
    dropSendTip: '拖拽 PDF 到此处发送邮件',
  },
  err: {
    page: '页面出错了',
    errHint: '遇到以下错误，请刷新页面重试：',
    reload: '刷新页面',
    smtpConfig: '请填写完整的 SMTP 配置',
    sendConfig: '缺少发信配置',
    smtpOk: '连接成功，邮箱登录有效',
    brevoConfig: '请填写完整的 Brevo 配置（API Key、发件邮箱、收件邮箱）',
    elasticConfig: '请填写完整的 Elastic Email 配置（API Key、发件邮箱、收件邮箱）',
    connFail: '连接失败：{msg}',
    sendFail: '发送失败：{msg}',
    sentTo: '已成功发送到 {email}',
    gasNetwork: '网络错误：请求被拒绝。请检查：1) 部署脚本时「谁可以访问」必须选「任何人」；2) 脚本地址必须是 /exec 结尾的部署地址；3) 修改代码后已重新部署新版本。',
    gasBadReply: '脚本返回异常，请检查部署配置',
  },
};

const en = {
  common: {
    close: 'Close',
    cancel: 'Cancel',
    selectAll: 'Select all',
    clearAll: 'Clear',
    page: 'Page {n}',
  },
  app: {
    title: 'PDF Split Mail',
    tagline: 'Split PDF → assign pages → send email in one click',
    pickPdf: 'Please choose PDF files',
    mergedName: '{base} ({n} files merged).pdf',
    fillTestEmail: 'Please fill in a test recipient email first',
    testSubject: 'PDF Split Mail connection test',
    testName: 'Test',
    testBodyGas: 'This is a connection test email. If you receive it, the Gmail channel is configured correctly and you can start sending PDF emails.',
    testBodyBrevo: 'This is a connection test email. If you receive it, the Brevo setup is correct and you can start sending PDF emails.',
    testBodyElastic: 'This is a connection test email. If you receive it, the Elastic Email setup is correct and you can start sending PDF emails.',
    genPdfFail: 'Failed to generate PDF: {msg}',
    selectPagesFirst: 'Please select the pages to download first',
    usage: 'How to use: 1. Configure email and test connection → 2. Upload PDF, pages are split automatically → 3. Add recipients, drag pages onto each recipient card → 4. Click "Generate New PDF" to build the attachment → 5. Drag the PDF to the send area or click "Send Email"',
  },
  email: {
    title: 'Email Setup',
    connected: 'Connected',
    descElastic: 'Elastic Email free channel: 100 emails/day, use Gmail / Hotmail / Yahoo as sender, no IP restrictions',
    descBrevo: 'Brevo free channel: 300 emails/day, use Gmail / Hotmail / Yahoo as sender, no app password needed',
    descGas: 'Gmail free channel: deploy the script once, send from your Gmail, works locally and online',
    descSmtp: 'SMTP channel: works with Hotmail / Outlook, Yahoo, etc.',
    tabGmail: 'Gmail (Free)',
    testBtn: 'Test Connection',
    testing: 'Testing…',
    subjectLabel: 'Default email subject',
    bodyLabel: 'Default email body',
    pdfPlaceholder: 'PDF file',
    bodyPlaceholder: 'Hello, please find the attached PDF file.',
    hintElastic: 'Elastic Email free tier: 100 emails/day; the sender shows your verified email. The API Key is stored only in your browser locally.',
    hintBrevo: 'Brevo free tier: 300 emails/day; the sender shows your verified email. The API Key is stored only in your browser locally.',
    hintGas: 'Gmail channel is free with no app password needed; the sender shows your Gmail address. For Hotmail / Yahoo, use the Elastic Email or SMTP channel.',
    hintSmtp: 'Your email password is stored only in your browser locally and used to connect directly to your SMTP server.',
    stepsElastic: 'Steps: 1. Sign up free at elasticemail.com (100 emails/day, no credit card) → 2. Settings → Senders → add your Gmail / Hotmail / Yahoo email, confirm the verification link sent to it → 3. Create an API Key on the right → 4. Paste the key above → 5. Click Test Connection. No IP restriction — works locally and online.',
    stepsBrevo: 'Steps: 1. Sign up free at brevo.com (300 emails/day) → 2. Senders → add your Gmail / Hotmail / Yahoo email, confirm the verification email → 3. SMTP & API → API Keys, create one starting with xkeysib- and paste it above → 4. Click Test Connection. The free plan can send emails with PDF attachments.',
    stepsGas: 'Deployment steps: 1. Open script.google.com, create a new project, paste the gmail-gas-code.js content from the project root and save → 2. Deploy → New deployment → type "Web app", run as "Me (your Gmail)", access "Anyone" → 3. Authorize when prompted → 4. Copy the /exec URL above. A regular Google account can send 100 emails/day. Do not share the script URL publicly.',
    fieldApiKey: 'API Key',
    yourApiKey: 'Your API Key',
    yourName: 'Your name',
    fromName: 'Sender name (optional)',
    fromEmail: 'Sender email address',
    testEmail: 'Test recipient email (for connection test)',
    gasUrl: 'Script URL (GAS Web App URL)',
    provider: 'Email provider',
    emailAddr: 'Email address',
    password: 'Password / App password',
    smtpHost: 'SMTP server',
    port: 'Port',
    ssl: 'Use SSL / TLS secure connection',
    show: 'Show',
    hide: 'Hide',
    hintPrefix: 'Hint: {hint}',
  },
  prov: {
    outlook: { name: 'Hotmail / Outlook', hint: 'Log in with your Microsoft account password. If two-step verification is enabled, use an App Password.' },
    yahoo: { name: 'Yahoo Mail', hint: 'Enable two-step verification and use an App-Specific Password.' },
    gmail: { name: 'Gmail (SMTP)', hint: 'Enable two-step verification and use an App-Specific Password, not your login password.' },
    qq: { name: 'QQ Mail', hint: 'Enable the SMTP service in QQ Mail settings and use the authorization code as the password.' },
    '163': { name: '163 Mail', hint: 'Enable the SMTP service and use the client authorization code as the password.' },
    custom: { name: 'Custom SMTP', hint: 'Fill in your own SMTP server settings.' },
  },
  pages: {
    pickPdf: 'Please choose PDF files',
    titleUpload: 'Upload PDF',
    uploadDesc: 'Select one or more PDFs; they will be merged into one document and split into pages',
    dropHere: 'Drag one or more PDFs here',
    orClick: 'or click to choose files',
    mergeNote: 'Multiple PDFs are merged into one document in the order you select them',
    titlePages: 'Split pages',
    meta: '{name} · {n} pages',
    batchName: 'Rename batch',
    downloadSelected: 'Download selected',
    downloadSelectedTitle: 'Download the merged PDF of selected pages',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    changeFile: 'Change file',
    hint: 'Click a page to preview and rename it; select multiple pages to drag-assign or download as a merged PDF.',
    pageTitle: 'Click to preview / drag to assign',
    selected: 'Selected',
    previewTitle: 'Page {n} preview',
    downloadPage: 'Download this page PDF',
    pageName: 'Page name',
    pdfName: 'PDF name',
    docNamePh: 'Document name',
    nameHint: 'The page name and PDF name are used for the generated PDF filename.',
    batchTitle: 'Rename pages in batch',
    batchPh: 'Enter a uniform name, e.g. Contract',
    applyAll: 'Apply to all pages',
  },
  rec: {
    title: 'Recipients',
    sendAll: 'Send all',
    namePh: 'Name (optional)',
    emailPh: 'Email',
    addBtn: 'Add recipient',
    invalidEmail: 'Please enter a valid email address',
    groups: 'Groups',
    newGroup: 'New group',
    groupNamePh: 'Enter a group name, e.g. Finance / All clients',
    saveGroup: 'Save group',
    existingGroups: 'Saved groups (click to load all members)',
    memberCount: '{n} members',
    loadGroupTitle: 'Click to load {n} members',
    delGroup: 'Delete group',
    draftHint: 'Click saved recipients below to select group members, then enter a name and save',
    groupNameRequired: 'Please enter a group name',
    groupSaved: 'Group "{name}" saved with {n} members (same-name group updated)',
    groupNoMember: 'Please select at least one saved recipient',
    groupLoaded: 'Added {n} members from group "{name}"',
    groupAlreadyLoaded: 'All members of "{name}" are already in the list',
    savedPick: 'Saved recipients (click to pick group members)',
    savedClick: 'Saved recipients (click to add)',
    savedTitle: 'Saved recipients',
    choose: 'Click to pick {n}',
    unchoose: 'Click to unpick {n}',
    addSaved: 'Click to add {n}',
    count: '{n} recipients',
    showEmails: 'View all emails',
    hideEmails: 'Hide email list',
    emptyTitle: 'No recipients yet',
    emptyTip: 'Enter an email above to add a recipient',
    delete: 'Delete',
    dropPagesTip: 'Drag pages here',
    genPdf: 'Generate New PDF',
    generating: 'Generating…',
    view: 'View',
    remove: 'Remove',
    subjectLabel: 'Subject (leave empty for default)',
    bodyLabel: 'Body (leave empty for default)',
    subjectPh: 'PDF file',
    bodyPh: 'Hello, please find the attached PDF file.',
    pageUnit: 'pages',
    sendBtn: 'Send Email',
    sending: 'Sending…',
    sent: 'Sent ✓',
    dropSendTip: 'Drag a PDF here to send the email',
  },
  err: {
    page: 'Something went wrong',
    errHint: 'An error occurred. Please refresh the page:',
    reload: 'Refresh page',
    smtpConfig: 'Please fill in the complete SMTP configuration',
    sendConfig: 'Missing sending configuration',
    smtpOk: 'Connected, email login is valid',
    brevoConfig: 'Please fill in the complete Brevo configuration (API Key, sender email, recipient email)',
    elasticConfig: 'Please fill in the complete Elastic Email configuration (API Key, sender email, recipient email)',
    connFail: 'Connection failed: {msg}',
    sendFail: 'Send failed: {msg}',
    sentTo: 'Successfully sent to {email}',
    gasNetwork: 'Network error: request rejected. Check: 1) When deploying the script, "Who has access" must be "Anyone"; 2) The script URL must end with /exec; 3) After editing the code, redeploy a new version.',
    gasBadReply: 'The script returned an unexpected response, please check the deployment',
  },
};

const dictionaries = { zh, en };

const I18nContext = createContext({ lang: 'zh', t: (k) => k, msg: (m) => m, setLang: () => {} });

export { I18nContext };

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

function getDict(lang) {
  return dictionaries[lang] || zh;
}

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);
}

// 把后端返回的中文消息翻译成当前语言
function translateServerMessage(t, message) {
  if (!message || typeof message !== 'string') return message;
  const exact = [
    ['请填写完整的 SMTP 配置', 'err.smtpConfig'],
    ['缺少发信配置', 'err.sendConfig'],
    ['连接成功，邮箱登录有效', 'err.smtpOk'],
    ['请填写完整的 Brevo 配置（API Key、发件邮箱、收件邮箱）', 'err.brevoConfig'],
    ['请填写完整的 Elastic Email 配置（API Key、发件邮箱、收件邮箱）', 'err.elasticConfig'],
    ['脚本返回异常，请检查部署配置', 'err.gasBadReply'],
    ['网络错误：请求被拒绝。请检查：1) 部署脚本时「谁可以访问」必须选「任何人」；2) 脚本地址必须是 /exec 结尾的部署地址；3) 修改代码后已重新部署新版本。', 'err.gasNetwork'],
  ];
  for (const [cn, key] of exact) {
    if (message === cn) return t(key);
  }
  const prefix = [
    ['连接失败：', 'err.connFail'],
    ['发送失败：', 'err.sendFail'],
    ['已成功发送到 ', 'err.sentTo'],
  ];
  for (const [cn, key] of prefix) {
    if (message.startsWith(cn)) {
      return t(key, { msg: message.slice(cn.length) });
    }
  }
  return message;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const v = localStorage.getItem(LANG_KEY);
      return v === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_) {}
  }, [lang]);

  const t = useCallback(
    (key, vars) => interpolate(lookup(getDict(lang), key), vars),
    [lang],
  );

  const msg = useCallback((message) => translateServerMessage(t, message), [t]);

  const setLang = useCallback((l) => setLangState(l === 'en' ? 'en' : 'zh'), []);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, msg }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
