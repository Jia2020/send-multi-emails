import React from 'react';
import { X, Upload, Mail, MousePointerClick, Send, Download, CheckCircle2 } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            PDF Splitter & Dispatcher User Guide
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-500" />
                Upload Multi-Page PDF
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Click to upload a local PDF or click "Load Sample PDF" to try it out. The embedded <code className="text-blue-600 bg-blue-50 dark:bg-blue-950 px-1 rounded">pdf-lib</code> engine splits each page into an independent PDF with HD preview thumbnails.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-500" />
                Add Email Recipients
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Type recipient emails in the manager bar (e.g. <code className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-1 rounded">finance@company.com</code>), or use "Quick Add Common Recipients" to set up recipient cards instantly.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <MousePointerClick className="w-4 h-4 text-purple-500" />
                Drag & Drop Pages to Recipients
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Drag any PDF page card on the left and drop it into the recipient card on the right! You can also check multiple pages for batch dragging or use quick assignment.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
              4
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-500" />
                Compose & Dispatch Emails
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Click "Launch Email Dispatcher". You can use Gemini AI to draft customized email copy for each recipient, send direct emails via SMTP, open local email clients, or download zip packages.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            Got it, let's start
          </button>
        </div>

      </div>
    </div>
  );
};
