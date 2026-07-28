import React, { useState, useRef } from 'react';
import { Upload, FileUp, Sparkles, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface PdfUploaderProps {
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  progressText?: string;
  progressPercent?: number;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  onFileUpload,
  onLoadSample,
  isProcessing,
  progressText,
  progressPercent,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onFileUpload(file);
      } else {
        alert('Please select a valid PDF file format (.pdf)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileUpload(file);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 px-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 shadow-sm ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/30 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-blue-400 hover:bg-slate-50/80 dark:hover:bg-slate-800'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {progressText || 'Parsing and splitting PDF pages...'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extracting individual pages and rendering HD preview thumbnails...
              </p>
            </div>

            {progressPercent !== undefined && (
              <div className="w-64 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Drag & drop multi-page PDF here, or click to browse
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports any multi-page PDF document. The system automatically splits each page into an independent PDF attachment ready to drag and drop to recipient emails.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                Choose PDF File
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Use Sample PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
