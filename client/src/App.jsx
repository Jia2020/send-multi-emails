import { useEffect, useState } from 'react';
import EmailSetup from './components/EmailSetup.jsx';
import PageGrid from './components/PageGrid.jsx';
import RecipientPanel from './components/RecipientPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { openPdfFromBytes, mergePdfFiles, mergePages, splitPage, bytesToBase64 } from './pdfUtils.js';
import { testEmail, sendEmail, gasSend, brevoSend, elasticSend } from './api.js';
import { useI18n } from './i18n.jsx';

const STORAGE_KEY = 'pdfmail_config_v1';
const DEFAULTS = {
  mode: 'elastic',
  elasticApiKey: '',
  elasticFromName: '',
  elasticFromEmail: '',
  elasticTestEmail: '',
  brevoApiKey: '',
  brevoFromName: '',
  brevoFromEmail: '',
  brevoTestEmail: '',
  gasUrl: '',
  gasFromName: '',
  gasTestEmail: '',
  provider: 'outlook',
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  fromName: '',
  user: '',
  pass: '',
  subject: 'PDF 文件',
  body: '您好，附件是发给您的 PDF 文件，请查收。',
};

function loadConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

let uid = 0;
const nextId = () => ++uid;

export default function App() {
  const { t, msg, lang, setLang } = useI18n();
  const [config, setConfig] = useState(loadConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [connected, setConnected] = useState(false);
  const [doc, setDoc] = useState(null);
  const [pageNames, setPageNames] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [recipients, setRecipients] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [pdfs, setPdfs] = useState({});
  const [statuses, setStatuses] = useState({});
  const [generating, setGenerating] = useState(() => new Set());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (_) {}
  }, [config]);

  function updateConfig(patch) {
    setConfig((c) => ({ ...c, ...patch }));
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    let r;
    if (config.mode === 'gas') {
      const toEmail = config.gasTestEmail || '';
      if (!toEmail) {
        setTesting(false);
        setTestResult({ ok: false, message: t('app.fillTestEmail') });
        return;
      }
      r = await gasSend({
        url: config.gasUrl,
        fromName: config.gasFromName || t('app.title'),
        to: toEmail,
        subject: t('app.testSubject'),
        text: t('app.testBodyGas'),
      });
    } else if (config.mode === 'brevo') {
      const toEmail = config.brevoTestEmail || '';
      if (!toEmail) {
        setTesting(false);
        setTestResult({ ok: false, message: t('app.fillTestEmail') });
        return;
      }
      r = await brevoSend({
        apiKey: config.brevoApiKey,
        fromName: config.brevoFromName || t('app.title'),
        fromEmail: config.brevoFromEmail,
        toName: t('app.testName'),
        toEmail,
        subject: t('app.testSubject'),
        text: t('app.testBodyBrevo'),
      });
    } else if (config.mode === 'elastic') {
      const toEmail = config.elasticTestEmail || '';
      if (!toEmail) {
        setTesting(false);
        setTestResult({ ok: false, message: t('app.fillTestEmail') });
        return;
      }
      r = await elasticSend({
        apiKey: config.elasticApiKey,
        fromName: config.elasticFromName || t('app.title'),
        fromEmail: config.elasticFromEmail,
        toEmail,
        subject: t('app.testSubject'),
        text: t('app.testBodyElastic'),
      });
    } else {
      r = await testEmail({
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: config.pass,
      });
    }
    setTesting(false);
    setTestResult(r);
    if (r.ok) setConnected(true);
  }

  async function handleFiles(files) {
    const pdfs = [...files].filter((f) => /\.pdf$/i.test(f.name));
    if (!pdfs.length) {
      alert(t('app.pickPdf'));
      return;
    }
    let bytes;
    let name;
    let labels = null;
    if (pdfs.length === 1) {
      const arr = await pdfs[0].arrayBuffer();
      bytes = new Uint8Array(arr);
      name = pdfs[0].name;
    } else {
      const r = await mergePdfFiles(pdfs);
      bytes = r.bytes;
      labels = r.labels;
      name = t('app.mergedName', { base: pdfs[0].name.replace(/\.pdf$/i, ''), n: pdfs.length });
    }
    const d = await openPdfFromBytes(bytes, name);
    setDoc((prev) => {
      if (prev?.pdfjsDoc) prev.pdfjsDoc.destroy();
      return d;
    });
    setPageNames(labels ? Object.fromEntries(labels.map((l, i) => [i, l])) : {});
    setSelected(new Set());
    setAssignments({});
    setPdfs((prev) => {
      Object.values(prev).forEach((p) => URL.revokeObjectURL(p.blobUrl));
      return {};
    });
    setStatuses({});
  }

  function toggleSelect(i) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function selectAll() {
    setSelected((s) => {
      if (s.size === doc.pages.length) return new Set();
      return new Set(doc.pages.map((p) => p.index));
    });
  }

  function dragPage(e, indexes) {
    e.dataTransfer.setData('application/x-pdf-pages', JSON.stringify(indexes));
    e.dataTransfer.effectAllowed = 'copy';
  }

  const SAVED_KEY = 'pdfmail_saved_recipients_v1';
  const [savedRecipients, setSavedRecipients] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedRecipients));
    } catch (_) {}
  }, [savedRecipients]);

  function addRecipient(name, email, saveToSaved) {
    setRecipients((rs) => [...rs, { id: nextId(), name, email }]);
    if (saveToSaved) {
      setSavedRecipients((s) =>
        s.some((r) => r.email.toLowerCase() === email.toLowerCase())
          ? s
          : [...s, { id: nextId(), name, email }],
      );
    }
  }

  const GROUPS_KEY = 'pdfmail_groups_v1';
  const [groups, setGroups] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    } catch (_) {}
  }, [groups]);

  // 从常用收件人中选择成员保存为群（同名群覆盖更新）
  function saveGroup(name, memberIds) {
    const members = savedRecipients
      .filter((r) => memberIds.has(r.id))
      .map((r) => ({ id: r.id, name: r.name || '', email: r.email }));
    if (!members.length) return 0;
    setGroups((gs) => {
      const exists = gs.find((g) => g.name === name);
      if (exists) {
        return gs.map((g) => (g.name === name ? { ...g, members } : g));
      }
      return [...gs, { id: nextId(), name, members }];
    });
    return members.length;
  }

  function removeGroup(id) {
    setGroups((gs) => gs.filter((g) => g.id !== id));
  }

  function removeSaved(id) {
    setSavedRecipients((s) => s.filter((r) => r.id !== id));
  }

  function useSaved(r) {
    setRecipients((rs) =>
      rs.some((x) => x.email.toLowerCase() === r.email.toLowerCase())
        ? rs
        : [...rs, { id: nextId(), name: r.name, email: r.email }],
    );
  }

  function updateRecipient(id, patch) {
    setRecipients((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRecipient(id) {
    setRecipients((rs) => rs.filter((r) => r.id !== id));
    setAssignments((a) => {
      const n = { ...a };
      delete n[id];
      return n;
    });
    setPdfs((p) => {
      const n = { ...p };
      if (n[id]) URL.revokeObjectURL(n[id].blobUrl);
      delete n[id];
      return n;
    });
    setStatuses((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });
  }

  function dropPages(rid, indexes) {
    setAssignments((a) => {
      const cur = a[rid] || [];
      const added = indexes.filter((i) => !cur.includes(i));
      if (!added.length) return a;
      return { ...a, [rid]: [...cur, ...added] };
    });
  }

  function removePage(rid, pi) {
    setAssignments((a) => ({ ...a, [rid]: (a[rid] || []).filter((i) => i !== pi) }));
  }

  function handlePageNameChange(index, value) {
    setPageNames((n) => ({ ...n, [index]: value }));
  }

  function handlePdfNameChange(value) {
    setDoc((d) => (d ? { ...d, name: value } : d));
  }

  function handleApplyAllNames(value) {
    setPageNames((n) => {
      const next = { ...n };
      doc.pages.forEach((p) => { next[p.index] = value; });
      return next;
    });
  }

  function docBase() {
    return (doc?.name || 'document').replace(/\.pdf$/i, '').trim() || 'document';
  }

  function triggerDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function handleDownloadSelected() {
    if (!doc) return;
    if (!selected.size) {
      alert(t('app.selectPagesFirst'));
      return;
    }
    const indexes = [...selected].sort((a, b) => a - b);
    const out = await mergePages(doc.bytes, indexes);
    const labels = indexes.map((p) => (pageNames[p] || '').trim() || `${p + 1}`);
    triggerDownload(out, `${docBase()}_${labels.join('-')}.pdf`);
  }

  async function handleDownloadPage(index) {
    if (!doc) return;
    const out = await splitPage(doc.bytes, index);
    const label = (pageNames[index] || '').trim() || `${index + 1}`;
    triggerDownload(out, `${docBase()}_${label}.pdf`);
  }

  async function generate(rid) {
    const pages = assignments[rid];
    if (!pages || !pages.length) return;
    setGenerating((s) => new Set(s).add(rid));
    try {
      const out = await mergePages(doc.bytes, pages);
      const blob = new Blob([out], { type: 'application/pdf' });
      const base = (doc.name || 'document').replace(/\.pdf$/i, '').trim() || 'document';
      const labels = pages.map((p) => (pageNames[p] || '').trim() || `${p + 1}`);
      const filename = `${base}_${labels.join('-')}.pdf`;
      setPdfs((p) => ({
        ...p,
        [rid]: {
          id: nextId(),
          filename,
          blobUrl: URL.createObjectURL(blob),
          size: out.length,
          pageCount: pages.length,
          bytes: out,
          pageIndexes: [...pages],
        },
      }));
    } catch (e) {
      alert(t('app.genPdfFail', { msg: e.message }));
    }
    setGenerating((s) => {
      const n = new Set(s);
      n.delete(rid);
      return n;
    });
  }

  function removePdf(rid) {
    setPdfs((p) => {
      const n = { ...p };
      if (n[rid]) URL.revokeObjectURL(n[rid].blobUrl);
      delete n[rid];
      return n;
    });
  }

  async function doSend(rid, pdf) {
    const rec = recipients.find((r) => r.id === rid);
    if (!pdf || !rec) return;
    setStatuses((s) => ({ ...s, [rid]: 'sending' }));
    let r;
    if (config.mode === 'gas') {
      r = await gasSend({
        url: config.gasUrl,
        fromName: config.gasFromName || t('app.title'),
        to: rec.email,
        subject: rec.subject || config.subject,
        text: rec.body || config.body,
        attachments: [
          {
            filename: pdf.filename,
            contentType: 'application/pdf',
            content: bytesToBase64(pdf.bytes),
          },
        ],
      });
    } else if (config.mode === 'brevo') {
      r = await brevoSend({
        apiKey: config.brevoApiKey,
        fromName: config.brevoFromName || t('app.title'),
        fromEmail: config.brevoFromEmail,
        toName: rec.name || '',
        toEmail: rec.email,
        subject: rec.subject || config.subject,
        text: rec.body || config.body,
        attachments: [
          {
            filename: pdf.filename,
            contentType: 'application/pdf',
            content: bytesToBase64(pdf.bytes),
          },
        ],
      });
    } else if (config.mode === 'elastic') {
      r = await elasticSend({
        apiKey: config.elasticApiKey,
        fromName: config.elasticFromName || t('app.title'),
        fromEmail: config.elasticFromEmail,
        toEmail: rec.email,
        subject: rec.subject || config.subject,
        text: rec.body || config.body,
        attachments: [
          {
            filename: pdf.filename,
            contentType: 'application/pdf',
            content: bytesToBase64(pdf.bytes),
          },
        ],
      });
    } else {
      r = await sendEmail({
        smtp: {
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: config.user,
          pass: config.pass,
        },
        from: { name: config.fromName, email: config.user },
        to: { name: rec.name, email: rec.email },
        subject: rec.subject || config.subject,
        text: rec.body || config.body,
        attachments: [
          {
            filename: pdf.filename,
            contentType: 'application/pdf',
            content: bytesToBase64(pdf.bytes),
          },
        ],
      });
    }
    setStatuses((s) => ({ ...s, [rid]: r.ok ? 'success' : `err:${r.message}` }));
  }

  function send(rid, pdfId) {
    const pdf = Object.values(pdfs).find((x) => x.id === pdfId);
    doSend(rid, pdf);
  }

  function dropPdf(rid, pdfId) {
    send(rid, pdfId);
  }

  async function sendAll() {
    const targets = recipients.filter((r) => pdfs[r.id]);
    await Promise.all(targets.map((r) => doSend(r.id, pdfs[r.id])));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <span className="logo-icon">PDF</span>
          <h1>{t('app.title')}</h1>
        </div>
        <div className="topbar-right">
          <span className="tagline">{t('app.tagline')}</span>
          <div className="lang-switch">
            <button
              className={lang === 'zh' ? 'active' : ''}
              onClick={() => setLang('zh')}
            >
              中文
            </button>
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <ErrorBoundary>
          <EmailSetup
            config={config}
            onChange={updateConfig}
            connected={connected}
            testing={testing}
            result={testResult}
            onTest={handleTest}
          />

          <div className="main-row">
            <PageGrid
              doc={doc}
              onFile={handleFiles}
              selected={selected}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onClearSelect={() => setSelected(new Set())}
              onDragPage={dragPage}
              pageNames={pageNames}
              onPageNameChange={handlePageNameChange}
              pdfName={doc?.name || ''}
              onPdfNameChange={handlePdfNameChange}
              onDownloadSelected={handleDownloadSelected}
              onDownloadPage={handleDownloadPage}
              onApplyAllNames={handleApplyAllNames}
            />

            <RecipientPanel
              recipients={recipients}
              assignments={assignments}
              pdfs={pdfs}
              statuses={statuses}
              generating={generating}
              onAddRecipient={addRecipient}
              onRemoveRecipient={removeRecipient}
              onDropPages={dropPages}
              onRemovePage={removePage}
              onGenerate={generate}
              onRemovePdf={removePdf}
              onSend={send}
              onDropPdf={dropPdf}
              onSendAll={sendAll}
              onUpdateRecipient={updateRecipient}
              defaultSubject={config.subject}
              defaultBody={config.body}
              savedRecipients={savedRecipients}
              onRemoveSaved={removeSaved}
              onUseSaved={useSaved}
              groups={groups}
              onSaveGroup={saveGroup}
              onRemoveGroup={removeGroup}
            />
          </div>
        </ErrorBoundary>
      </main>

      <footer className="foot">
        <p className="muted">
          {t('app.usage')}
        </p>
      </footer>
    </div>
  );
}
