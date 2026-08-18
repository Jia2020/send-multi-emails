import React from 'react';
import { GeneratedPdfBundle, Recipient } from '../types';
import { FileText, Download, GripVertical, CheckCircle2, Trash2, Eye } from 'lucide-react';

interface GeneratedPdfCardProps {
  bundle: GeneratedPdfBundle;
  recipients: Recipient[];
  onDeleteBundle: (bundleId: string) => void;
  onDragStartBundle: (e: React.DragEvent, bundleId: string) => void;
  onQuickAssignBundle: (bundleId: string, recipientId: string) => void;
}

export const GeneratedPdfCard: React.FC<GeneratedPdfCardProps> = ({
  bundle,
  recipients,
  onDeleteBundle,
  onDragStartBundle,
  onQuickAssignBundle,
}) => {
  const assignedRecipients = recipients.filter((r) =>
    r.assignedBundles?.some((b) => b.id === bundle.id)
  );

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = bundle.pdfBlobUrl;
    link.download = bundle.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartBundle(e, bundle.id)}
      className="group relative bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-800/90 rounded-xl border border-blue-200 dark:border-blue-900/60 p-3 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between space-y-2.5"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={bundle.fileName}>
              {bundle.fileName}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Contains {bundle.includedPageNumbers.length} page(s) (Pages: P{bundle.includedPageNumbers.join(', P')})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleDownload}
            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteBundle(bundle.id)}
            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
            title="Delete generated PDF"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <GripVertical className="w-4 h-4 text-slate-400 cursor-grab active:cursor-grabbing" title="Drag to recipient on the right" />
        </div>
      </div>

      {/* Thumbnail + Info Bar */}
      <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-100 dark:border-slate-700/60">
        {bundle.thumbnailUrl && (
          <img
            src={bundle.thumbnailUrl}
            alt={bundle.fileName}
            className="w-10 h-12 object-contain bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shrink-0"
          />
        )}
        <div className="text-[11px] space-y-0.5 min-w-0 flex-1">
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Size: <span className="font-mono text-slate-800 dark:text-slate-100">{bundle.fileSizeFormatted}</span>
          </div>
          <div className="text-slate-400 text-[10px]">
            Drag directly to recipient on right
          </div>
        </div>
      </div>

      {/* Assignment Footer */}
      <div className="pt-2 border-t border-blue-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
        {assignedRecipients.length > 0 ? (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Assigned to {assignedRecipients.map((r) => r.email).join(', ')}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-400">
            <span>Unassigned</span>
            {recipients.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onQuickAssignBundle(bundle.id, e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-[11px] py-0.5 px-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 cursor-pointer"
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};
