import React, { useState } from 'react';
import { Recipient, SplitPdfPage, GeneratedPdfBundle } from '../types';
import { Mail, Trash2, X, FileText, CheckCircle, Send, Sparkles, Layers } from 'lucide-react';

interface RecipientCardProps {
  recipient: Recipient;
  allPages: SplitPdfPage[];
  onRemovePage: (recipientId: string, pageNumber: number) => void;
  onRemoveBundle?: (recipientId: string, bundleId: string) => void;
  onClearPages: (recipientId: string) => void;
  onRemoveRecipient: (recipientId: string) => void;
  onDropPage: (recipientId: string, pageNumberData: string) => void;
  onOpenDispatch: (recipientId: string) => void;
}

export const RecipientCard: React.FC<RecipientCardProps> = ({
  recipient,
  allPages,
  onRemovePage,
  onRemoveBundle,
  onClearPages,
  onRemoveRecipient,
  onDropPage,
  onOpenDispatch,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter full page objects assigned to this recipient
  const assignedPageObjects = allPages.filter((p) =>
    recipient.assignedPages.includes(p.pageNumber)
  );

  const assignedBundles = recipient.assignedBundles || [];
  const totalAttachmentsCount = assignedPageObjects.length + assignedBundles.length;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dragData = e.dataTransfer.getData('text/plain');
    if (dragData) {
      onDropPage(recipient.id, dragData);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col bg-white dark:bg-slate-800 shadow-xs ${
        isDragOver
          ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/30 dark:bg-blue-950/30 scale-[1.01]'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Recipient Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-start space-x-3">
          <div className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center shrink-0 ${recipient.colorTag}`}>
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                {recipient.email}
              </span>
              {recipient.name && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {recipient.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mounted <span className="font-bold text-slate-700 dark:text-slate-200">{totalAttachmentsCount}</span> PDF attachment(s)
            </p>
          </div>
        </div>

        {/* Delete contact button */}
        <button
          onClick={() => onRemoveRecipient(recipient.id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
          title="Remove this recipient"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drop Target Area & Assigned Items */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 min-h-[140px]">
        {totalAttachmentsCount === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors flex flex-col items-center justify-center space-y-2 ${
              isDragOver
                ? 'border-blue-500 bg-blue-100/50 text-blue-700'
                : 'border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-400">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {isDragOver ? 'Release mouse to assign PDF to this email' : 'Drag PDF pages or merged PDF bundles here'}
            </p>
            <p className="text-[11px] text-slate-400">
              Supports merged multi-page PDFs or single-page PDFs
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Assigned PDFs:</span>
              <button
                onClick={() => onClearPages(recipient.id)}
                className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* List of assigned custom PDF Bundles */}
            {assignedBundles.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Merged PDF Bundles ({assignedBundles.length}):
                </div>
                <div className="space-y-1">
                  {assignedBundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg p-2 text-xs"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{bundle.fileName}</div>
                          <div className="text-[10px] text-slate-400">
                            {bundle.includedPageNumbers.length} pages ({bundle.fileSizeFormatted})
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveBundle && onRemoveBundle(recipient.id, bundle.id)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Remove bundle from recipient"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of assigned single page thumbnails */}
            {assignedPageObjects.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Single-page PDFs ({assignedPageObjects.length}):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {assignedPageObjects.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="group/item relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 flex flex-col space-y-1 text-xs"
                    >
                      <div className="relative aspect-[3/4] bg-white dark:bg-slate-800 rounded overflow-hidden flex items-center justify-center">
                        <img
                          src={page.thumbnailUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => onRemovePage(recipient.id, page.pageNumber)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity shadow-xs"
                          title="Unassign page"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-1 text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Page {page.pageNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {page.fileSizeFormatted}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Action */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {totalAttachmentsCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {totalAttachmentsCount} attachment(s) attached
              </span>
            ) : (
              'No attachments assigned'
            )}
          </span>

          <button
            onClick={() => onOpenDispatch(recipient.id)}
            disabled={totalAttachmentsCount === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
              totalAttachmentsCount > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-md'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Send to this Email
          </button>
        </div>
      </div>
    </div>
  );
};
