import { useEffect, useRef, useState } from 'react';
import { renderPageToCanvas } from '../pdfUtils';
import { useI18n } from '../i18n.jsx';

function PageThumb({ pdfjsDoc, pageNumber, maxWidth = 200 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    renderPageToCanvas(pdfjsDoc, pageNumber, canvasRef.current, maxWidth).catch(() => {});
  }, [pdfjsDoc, pageNumber, maxWidth]);
  return <canvas ref={canvasRef} className="page-canvas" />;
}

function PreviewModal({ pdfjsDoc, page, pageName, pdfName, onPageNameChange, onPdfNameChange, onDownload, onClose }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  useEffect(() => {
    renderPageToCanvas(pdfjsDoc, page.index + 1, canvasRef.current, 760).catch(() => {});
  }, [pdfjsDoc, page.index]);

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('pages.previewTitle', { n: page.index + 1 })}</h3>
          <div className="modal-actions">
            <button className="btn small" onClick={onDownload}>{t('pages.downloadPage')}</button>
            <button className="ghost-btn" onClick={onClose}>{t('common.close')}</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="preview-canvas-wrap">
            <canvas ref={canvasRef} className="preview-canvas" />
          </div>
          <div className="preview-fields">
            <label className="field">
              <span>{t('pages.pageName')}</span>
              <input
                type="text"
                value={pageName || ''}
                placeholder={t('common.page', { n: page.index + 1 })}
                onChange={(e) => onPageNameChange(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('pages.pdfName')}</span>
              <input
                type="text"
                value={pdfName || ''}
                placeholder={t('pages.docNamePh')}
                onChange={(e) => onPdfNameChange(e.target.value)}
              />
            </label>
            <p className="hint">{t('pages.nameHint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchNameModal({ pages, pageNames, onSet, onApplyAll, onClose }) {
  const { t } = useI18n();
  const [all, setAll] = useState('');

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('pages.batchTitle')}</h3>
          <button className="ghost-btn" onClick={onClose}>{t('common.close')}</button>
        </div>
        <div className="modal-body batch-name-body">
          <div className="batch-all">
            <input
              type="text"
              value={all}
              placeholder={t('pages.batchPh')}
              onChange={(e) => setAll(e.target.value)}
            />
            <button
              className="btn primary"
              disabled={!all.trim()}
              onClick={() => { onApplyAll(all.trim()); setAll(''); }}
            >
              {t('pages.applyAll')}
            </button>
          </div>
          <div className="batch-list">
            {pages.map((p) => (
              <div key={p.index} className="batch-row">
                <span className="batch-idx">{t('common.page', { n: p.index + 1 })}</span>
                <input
                  type="text"
                  value={pageNames[p.index] || ''}
                  placeholder={t('common.page', { n: p.index + 1 })}
                  onChange={(e) => onSet(p.index, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PageGrid({
  doc,
  onFile,
  selected,
  onToggleSelect,
  onSelectAll,
  onDragPage,
  pageNames,
  onPageNameChange,
  pdfName,
  onPdfNameChange,
  onDownloadSelected,
  onDownloadPage,
  onApplyAllNames,
}) {
  const { t } = useI18n();
  const [dragOver, setDragOver] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [showBatch, setShowBatch] = useState(false);
  const fileRef = useRef(null);

  function handleFiles(files) {
    const list = files ? [...files] : [];
    const pdfs = list.filter((f) => /\.pdf$/i.test(f.name));
    if (pdfs.length) onFile(pdfs);
    else if (list.length) alert(t('pages.pickPdf'));
  }

  if (!doc) {
    return (
      <div className="card">
        <div className="card-head">
          <span className="step-badge">2</span>
          <div>
            <h2>{t('pages.titleUpload')}</h2>
            <p className="muted">{t('pages.uploadDesc')}</p>
          </div>
        </div>
        <div
          className={`dropzone ${dragOver ? 'over' : ''}`}
          onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="dz-icon">PDF</div>
          <p><strong>{t('pages.dropHere')}</strong> {t('pages.orClick')}</p>
          <p className="muted">{t('pages.mergeNote')}</p>
        </div>
      </div>
    );
  }

  const allSelected = selected.size === doc.pages.length;

  return (
    <div className="card">
      <div className="card-head">
        <span className="step-badge">2</span>
        <div>
          <h2>{t('pages.titlePages')}</h2>
          <p className="muted">{t('pages.meta', { name: pdfName || doc.name, n: doc.pages.length })}</p>
        </div>
        <div className="head-actions">
          <button className="ghost-btn" onClick={() => setShowBatch(true)}>{t('pages.batchName')}</button>
          <button
            className="ghost-btn"
            disabled={selected.size === 0}
            onClick={onDownloadSelected}
            title={t('pages.downloadSelectedTitle')}
          >
            {t('pages.downloadSelected')}
          </button>
          <button className="ghost-btn" onClick={onSelectAll}>{allSelected ? t('pages.deselectAll') : t('pages.selectAll')}</button>
          <button className="ghost-btn" onClick={() => fileRef.current && fileRef.current.click()}>{t('pages.changeFile')}</button>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </div>
      <p className="hint">{t('pages.hint')}</p>
      <div className="page-grid">
        {doc.pages.map((p) => (
          <div
            key={p.index}
            className={`page-card ${selected.has(p.index) ? 'sel' : ''}`}
            draggable
            onDragStart={(e) => onDragPage(e, selected.has(p.index) ? [...selected] : [p.index])}
            onClick={() => setPreviewIndex(p.index)}
            title={t('pages.pageTitle')}
          >
            <label className="page-check" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected.has(p.index)}
                onChange={() => onToggleSelect(p.index)}
              />
            </label>
            <PageThumb pdfjsDoc={doc.pdfjsDoc} pageNumber={p.index + 1} />
            <div className="page-meta">
              <span title={pageNames[p.index] || ''}>{pageNames[p.index] || t('common.page', { n: p.index + 1 })}</span>
              {selected.has(p.index) && <span className="pill ok">{t('pages.selected')}</span>}
            </div>
          </div>
        ))}
      </div>

      {previewIndex !== null && (
        <PreviewModal
          pdfjsDoc={doc.pdfjsDoc}
          page={doc.pages[previewIndex]}
          pageName={pageNames[previewIndex]}
          pdfName={pdfName}
          onPageNameChange={(v) => onPageNameChange(previewIndex, v)}
          onPdfNameChange={onPdfNameChange}
          onDownload={() => onDownloadPage(previewIndex)}
          onClose={() => setPreviewIndex(null)}
        />
      )}

      {showBatch && (
        <BatchNameModal
          pages={doc.pages}
          pageNames={pageNames}
          onSet={onPageNameChange}
          onApplyAll={onApplyAllNames}
          onClose={() => setShowBatch(false)}
        />
      )}
    </div>
  );
}
