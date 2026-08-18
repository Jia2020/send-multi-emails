import { useState } from 'react';
import { formatSize } from '../pdfUtils';
import { useI18n } from '../i18n.jsx';

function RecipientCard({
  recipient,
  assignedPages,
  pdf,
  status,
  generating,
  onDropPages,
  onRemovePage,
  onRemoveRecipient,
  onGenerate,
  onRemovePdf,
  onSend,
  onDropPdf,
  onUpdate,
  defaultSubject,
  defaultBody,
}) {
  const { t } = useI18n();
  const [overPage, setOverPage] = useState(false);
  const [overSend, setOverSend] = useState(false);

  return (
    <div className="recipient-card">
      <div className="rc-head">
        <div className="avatar">{recipient.name ? recipient.name[0].toUpperCase() : '?'}</div>
        <div className="rc-id">
          <strong>{recipient.name}</strong>
          <span className="muted">{recipient.email}</span>
        </div>
        <button className="ghost-btn rc-del" onClick={onRemoveRecipient} title={t('rec.delete')}>{t('rec.delete')}</button>
      </div>

      <div
        className={`drop-zone ${overPage ? 'over' : ''} ${assignedPages.length ? 'filled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOverPage(true); }}
        onDragLeave={() => setOverPage(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOverPage(false);
          try {
            const idx = JSON.parse(e.dataTransfer.getData('application/x-pdf-pages'));
            onDropPages(idx);
          } catch (_) {}
        }}
      >
        {assignedPages.length === 0 ? (
          <p className="muted dz-tip">{t('rec.dropPagesTip')}</p>
        ) : (
          <div className="assigned">
            {assignedPages.map((pi) => (
              <span key={pi} className="chip">
                {t('common.page', { n: pi + 1 })}
                <button className="chip-x" onClick={() => onRemovePage(pi)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rc-actions">
        <button
          className="btn"
          disabled={assignedPages.length === 0 || generating}
          onClick={onGenerate}
        >
          {generating ? t('rec.generating') : t('rec.genPdf')}
        </button>
      </div>

      {pdf && (
        <div className="pdf-chip" draggable onDragStart={(e) => e.dataTransfer.setData('application/x-pdf-file', pdf.id)}>
          <div className="pdf-icon">PDF</div>
          <div className="pdf-info">
            <strong>{pdf.filename}</strong>
            <span className="muted">{pdf.pageCount} {t('rec.pageUnit')} · {formatSize(pdf.size)}</span>
          </div>
          <div className="pdf-actions">
            <a className="ghost-btn" href={pdf.blobUrl} download={pdf.filename} title={t('rec.view')}>{t('rec.view')}</a>
            <button className="ghost-btn" onClick={onRemovePdf}>{t('rec.remove')}</button>
          </div>
        </div>
      )}

      <div className="mail-fields">
        <label className="field">
          <span>{t('rec.subjectLabel')}</span>
          <input
            type="text"
            value={recipient.subject || ''}
            placeholder={defaultSubject || t('rec.subjectPh')}
            onChange={(e) => onUpdate({ subject: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{t('rec.bodyLabel')}</span>
          <textarea
            rows="2"
            value={recipient.body || ''}
            placeholder={defaultBody || t('rec.bodyPh')}
            onChange={(e) => onUpdate({ body: e.target.value })}
          />
        </label>
      </div>

      <div
        className={`send-zone ${overSend ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOverSend(true); }}
        onDragLeave={() => setOverSend(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOverSend(false);
          try {
            const id = e.dataTransfer.getData('application/x-pdf-file');
            if (id) onDropPdf(id);
          } catch (_) {}
        }}
      >
        {status === 'sending' ? (
          <span className="status sending">{t('rec.sending')}</span>
        ) : status === 'success' ? (
          <span className="status ok">{t('rec.sent')}</span>
        ) : status && status.startsWith('err:') ? (
          <span className="status err">{msg(status.slice(4))}</span>
        ) : (
          <p className="muted dz-tip">{t('rec.dropSendTip')}</p>
        )}
        <button className="btn primary small" disabled={!pdf || status === 'sending'} onClick={onSend}>
          {t('rec.sendBtn')}
        </button>
      </div>
    </div>
  );
}

export default function RecipientPanel({
  recipients,
  assignments,
  pdfs,
  statuses,
  generating,
  onAddRecipient,
  onRemoveRecipient,
  onDropPages,
  onRemovePage,
  onGenerate,
  onRemovePdf,
  onSend,
  onDropPdf,
  onSendAll,
  onUpdateRecipient,
  defaultSubject,
  defaultBody,
  savedRecipients,
  onRemoveSaved,
  onUseSaved,
  groups,
  onSaveGroup,
  onRemoveGroup,
}) {
  const { t, msg } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  // 新建群草稿：{ name, memberIds: Set }
  const [draft, setDraft] = useState(null);

  function submit() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr(t('rec.invalidEmail'));
      return;
    }
    onAddRecipient(name.trim(), email.trim(), true);
    setName('');
    setEmail('');
    setErr('');
  }

  function startDraft() {
    setDraft({ name: '', memberIds: new Set() });
    setNotice(t('rec.draftHint'));
  }

  function toggleDraftMember(r) {
    setDraft((d) => {
      const memberIds = new Set(d.memberIds);
      if (memberIds.has(r.id)) memberIds.delete(r.id);
      else memberIds.add(r.id);
      return { ...d, memberIds };
    });
  }

  function selectAllDraft() {
    setDraft((d) => ({ ...d, memberIds: new Set(savedRecipients.map((r) => r.id)) }));
  }

  function clearDraft() {
    setDraft((d) => ({ ...d, memberIds: new Set() }));
  }

  function saveDraft() {
    const n = draft.name.trim();
    if (!n) {
      setNotice(t('rec.groupNameRequired'));
      return;
    }
    const cnt = onSaveGroup(n, draft.memberIds);
    if (cnt) {
      setNotice(t('rec.groupSaved', { name: n, n: cnt }));
      setDraft(null);
    } else {
      setNotice(t('rec.groupNoMember'));
    }
  }

  function loadGroup(g) {
    const existing = new Set(recipients.map((r) => r.email.toLowerCase()));
    const newOnes = (g.members || []).filter((m) => !existing.has(m.email.toLowerCase()));
    newOnes.forEach((m) => onAddRecipient(m.name, m.email, false));
    setNotice(
      newOnes.length
        ? t('rec.groupLoaded', { name: g.name, n: newOnes.length })
        : t('rec.groupAlreadyLoaded', { name: g.name }),
    );
  }

  const canSendAll = recipients.some((r) => pdfs[r.id]);

  return (
    <div className="card">
      <div className="card-head">
        <span className="step-badge">3</span>
        <div>
          <h2>{t('rec.title')}</h2>
        </div>
        {recipients.length > 0 && (
          <button className="btn primary" disabled={!canSendAll} onClick={onSendAll}>
            {t('rec.sendAll')}
          </button>
        )}
      </div>

      <div className="add-recipient">
        <input
          type="text"
          placeholder={t('rec.namePh')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder={t('rec.emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn primary" onClick={submit}>{t('rec.addBtn')}</button>
      </div>
      {err && <p className="err-text">{err}</p>}

      <div className="groups-section">
        <div className="group-head">
          <p className="saved-title" style={{ margin: 0 }}>{t('rec.groups')}</p>
          {!draft && (
            <button className="ghost-btn" onClick={startDraft}>{t('rec.newGroup')}</button>
          )}
        </div>
        {draft && (
          <div className="group-draft">
            <input
              type="text"
              placeholder={t('rec.groupNamePh')}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
            />
            <div className="group-draft-actions">
              <button className="btn primary" onClick={saveDraft}>{t('rec.saveGroup')}</button>
              <button className="btn" onClick={() => setDraft(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {groups.length > 0 && (
          <div className="saved-recipients" style={{ marginTop: 8 }}>
            <p className="saved-title">{t('rec.existingGroups')}</p>
            <div className="saved-list">
              {groups.map((g) => (
                <span
                  key={g.id}
                  className="saved-chip group-chip"
                  onClick={() => loadGroup(g)}
                  title={t('rec.loadGroupTitle', { n: g.members.length })}
                >
                  <span className="saved-name">{g.name}</span>
                  <span className="saved-mail">{t('rec.memberCount', { n: g.members.length })}</span>
                  <button
                    className="chip-x"
                    onClick={(e) => { e.stopPropagation(); onRemoveGroup(g.id); }}
                    title={t('rec.delGroup')}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        {notice && <p className="notice">{notice}</p>}
      </div>

      {savedRecipients.length > 0 && (
        <div className="saved-recipients">
          <div className="saved-title-row">
            <p className="saved-title">
              {draft ? t('rec.savedPick') : t('rec.savedClick')}
            </p>
            {draft && (
              <div className="draft-bulk">
                <button className="ghost-btn" onClick={selectAllDraft}>{t('common.selectAll')}</button>
                <button className="ghost-btn" onClick={clearDraft}>{t('common.clearAll')}</button>
              </div>
            )}
          </div>
          <div className="saved-list">
            {savedRecipients.map((r) => (
              <span
                key={r.id}
                className={`saved-chip ${draft && draft.memberIds.has(r.id) ? 'selected' : ''}`}
                onClick={() => (draft ? toggleDraftMember(r) : onUseSaved(r))}
                title={draft
                  ? (draft.memberIds.has(r.id) ? t('rec.unchoose', { n: r.name || r.email }) : t('rec.choose', { n: r.name || r.email }))
                  : t('rec.addSaved', { n: r.name || r.email })}
              >
                {draft && <span className="draft-check">{draft.memberIds.has(r.id) ? '✓' : ''}</span>}
                <span className="saved-name">{r.name || r.email.split('@')[0]}</span>
                <span className="saved-mail">{r.email}</span>
                <button
                  className="chip-x"
                  onClick={(e) => { e.stopPropagation(); onRemoveSaved(r.id); }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {recipients.length === 0 ? (
        <div className="empty-tip">
          <p>{t('rec.emptyTitle')}</p>
          <p className="muted">{t('rec.emptyTip')}</p>
        </div>
      ) : (
        <>
          <div className="preview-head">
            <span className="muted">{t('rec.count', { n: recipients.length })}</span>
            <button className="ghost-btn" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? t('rec.hideEmails') : t('rec.showEmails')}
            </button>
          </div>
          {showPreview && (
            <div className="preview-box">
              {recipients.map((r) => (
                <div key={r.id} className="preview-row">
                  <span>{r.name}</span>
                  <span className="muted">{r.email}</span>
                </div>
              ))}
            </div>
          )}
          <div className="recipient-grid">
            {recipients.map((r) => (
              <RecipientCard
                key={r.id}
                recipient={r}
                assignedPages={assignments[r.id] || []}
                pdf={pdfs[r.id] || null}
                status={statuses[r.id]}
                generating={generating.has(r.id)}
                onDropPages={(idx) => onDropPages(r.id, idx)}
                onRemovePage={(pi) => onRemovePage(r.id, pi)}
                onGenerate={() => onGenerate(r.id)}
                onRemovePdf={() => onRemovePdf(r.id)}
                onSend={() => pdfs[r.id] && onSend(r.id, pdfs[r.id].id)}
                onDropPdf={(pdfId) => onDropPdf(r.id, pdfId)}
                onRemoveRecipient={() => onRemoveRecipient(r.id)}
                onUpdate={(patch) => onUpdateRecipient(r.id, patch)}
                defaultSubject={defaultSubject}
                defaultBody={defaultBody}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
