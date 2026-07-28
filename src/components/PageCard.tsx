import React, { useState, useEffect } from 'react';
import { SplitPdfPage, Recipient } from '../types';
import { Eye, Download, GripVertical, CheckCircle2, Plus, Mail, Edit3, Check } from 'lucide-react';

interface PageCardProps {
  page: SplitPdfPage;
  recipients: Recipient[];
  isSelected: boolean;
  onToggleSelect: (pageNumber: number) => void;
  onPreview: (page: SplitPdfPage) => void;
  onQuickAssign: (pageNumber: number, recipientId: string) => void;
  onDragStart: (e: React.DragEvent, pageNumber: number) => void;
  onUpdateFileName: (pageNumber: number, newFileName: string) => void;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  recipients,
  isSelected,
  onToggleSelect,
  onPreview,
  onQuickAssign,
  onDragStart,
  onUpdateFileName,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(page.fileName);

  useEffect(() => {
    setNameInput(page.fileName);
  }, [page.fileName]);

  // Find recipients assigned to this page
  const assignedRecipients = recipients.filter((r) =>
    r.assignedPages.includes(page.pageNumber)
  );

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
      onUpdateFileName(page.pageNumber, finalName);
    } else {
      setNameInput(page.fileName);
    }
    setIsEditingName(false);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = page.pdfBlobUrl;
    link.download = page.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, page.pageNumber)}
      className={`group relative bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing flex flex-col overflow-hidden ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
          : assignedRecipients.length > 0
          ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/10'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {/* Checkbox for batch select */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(page.pageNumber)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
          />
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Page {page.pageNumber}
          </span>
        </div>

        {/* Drag Indicator */}
        <div
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing flex items-center gap-1 text-[11px]"
          title="Drag & drop to recipient on the right"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Page Custom Rename Bar */}
      <div className="px-2.5 py-1.5 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] gap-1">
        {isEditingName ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 w-full"
          >
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setNameInput(page.fileName);
                  setIsEditingName(false);
                }
              }}
              onBlur={handleSaveName}
              autoFocus
              className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-500 rounded text-[11px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
              placeholder="Rename filename..."
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer shrink-0"
              title="Save filename"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingName(true);
            }}
            className="flex items-center justify-between w-full group/name hover:bg-blue-50 dark:hover:bg-blue-950/50 px-1 py-0.5 rounded cursor-pointer transition-colors"
            title="Click to rename file (used automatically on download)"
          >
            <div className="flex items-center gap-1 truncate font-medium text-slate-700 dark:text-slate-200">
              <Edit3 className="w-3 h-3 text-slate-400 group-hover/name:text-blue-500 shrink-0" />
              <span className="truncate text-[11px]">{page.fileName}</span>
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover/name:opacity-100 shrink-0 font-bold ml-1">
              Rename
            </span>
          </div>
        )}
      </div>

      {/* Thumbnail Canvas View */}
      <div
        onClick={() => onPreview(page)}
        className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900/50 overflow-hidden flex items-center justify-center p-2 group-hover:bg-slate-200/50 transition-colors cursor-pointer"
      >
        <img
          src={page.thumbnailUrl}
          alt={`PDF Page ${page.pageNumber}`}
          className="max-h-full max-w-full object-contain rounded shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
        />

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(page);
            }}
            className="p-2 bg-white/90 text-slate-800 hover:bg-white rounded-full shadow-md text-xs font-medium transition-transform hover:scale-110 flex items-center gap-1"
            title="Enlarge & preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 bg-white/90 text-slate-800 hover:bg-white rounded-full shadow-md text-xs font-medium transition-transform hover:scale-110 flex items-center gap-1"
            title="Download single-page PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Page metadata watermark */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/70 text-white text-[10px] rounded font-mono backdrop-blur-xs">
          {page.fileSizeFormatted}
        </div>
      </div>

      {/* Page Text Snippet (If available) */}
      {page.textSnippet && (
        <div className="px-2.5 py-1.5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
          "{page.textSnippet}"
        </div>
      )}

      {/* Assigned Email Badges / Quick Assign Footer */}
      <div className="p-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex flex-col gap-2 mt-auto">
        {assignedRecipients.length > 0 ? (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Assigned to {assignedRecipients.length} email(s):
            </div>
            <div className="flex flex-wrap gap-1">
              {assignedRecipients.map((r) => (
                <span
                  key={r.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate max-w-[120px] ${r.colorTag}`}
                  title={r.email}
                >
                  {r.email}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Unassigned</span>
            {recipients.length > 0 && (
              <div className="relative group/menu">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onQuickAssign(page.pageNumber, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] py-0.5 px-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded border-0 cursor-pointer focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    + Quick assign...
                  </option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
