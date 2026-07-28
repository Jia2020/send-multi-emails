import React, { useState, useEffect, useRef } from 'react';
import { SplitPdfPage } from '../types';
import { renderHighResPageDataUrl } from '../utils/pdf';
import {
  X,
  Download,
  FileText,
  ArrowLeft,
  ArrowRight,
  Edit3,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Maximize2,
  Move,
} from 'lucide-react';

interface PagePreviewModalProps {
  page: SplitPdfPage | null;
  totalPagesCount: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onUpdateFileName?: (pageNumber: number, newFileName: string) => void;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  page,
  totalPagesCount,
  onClose,
  onNavigate,
  onUpdateFileName,
}) => {
  if (!page) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(page.fileName);

  // Zoom & High-Def render state
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isHdLoading, setIsHdLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & render HD image when page changes
  useEffect(() => {
    setNameInput(page.fileName);
    setIsEditing(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setHighResUrl(null);

    let isMounted = true;
    setIsHdLoading(true);

    renderHighResPageDataUrl(page.pdfBytes, 2.5)
      .then((url) => {
        if (isMounted && url) {
          setHighResUrl(url);
        }
      })
      .finally(() => {
        if (isMounted) setIsHdLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page.pageNumber, page.pdfBytes]);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === 'ArrowLeft') {
        if (page.pageNumber > 1) onNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        if (page.pageNumber < totalPagesCount) onNavigate('next');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, page.pageNumber, totalPagesCount, zoomScale]);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && onUpdateFileName) {
      const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
      onUpdateFileName(page.pageNumber, finalName);
    } else {
      setNameInput(page.fileName);
    }
    setIsEditing(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = page.pdfBlobUrl;
    link.download = page.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(0.5, Math.round((prev - 0.25) * 100) / 100);
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleDoubleTapZoom = () => {
    if (zoomScale === 1) {
      setZoomScale(2);
    } else {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Pan dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col h-[92vh]">
        
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            
            {isEditing ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  onBlur={handleSaveName}
                  autoFocus
                  className="px-2.5 py-1 text-xs border border-blue-500 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none font-medium"
                  placeholder="Rename filename..."
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  title="Save filename"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/80 px-2 py-1 rounded-lg transition-colors group/edit truncate"
                title="Click to rename page filename"
              >
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                  Page {page.pageNumber}: <span className="text-blue-600 dark:text-blue-400">{page.fileName}</span>
                </h3>
                <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/edit:text-blue-500 shrink-0" />
              </div>
            )}
            
            <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
              ({page.width}x{page.height}px)
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={`Download: ${page.fileName}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: HD Indicator & Zoom / Scale Controls */}
        <div className="px-5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* HD Badge & Status */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>HD Clear Render (2.5x)</span>
            </span>
            {isHdLoading && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 animate-pulse font-medium">
                Enhancing details...
              </span>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.5}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="px-2 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 min-w-[50px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoomScale >= 4}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">100%</span>
            </button>

            <button
              onClick={handleToggleDoubleTapZoom}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Fit / 2x Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick instructions */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400">
            <Move className="w-3 h-3 text-slate-400" />
            <span>Double-click or scroll wheel to zoom • Drag to pan when zoomed</span>
          </div>
        </div>

        {/* Content View Area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-hidden select-none ${
            zoomScale > 1
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-zoom-in'
          }`}
        >
          {/* Main Image with Crisp High-Def & Zoom Transform */}
          <img
            src={highResUrl || page.thumbnailUrl}
            alt={`Page ${page.pageNumber}`}
            onDoubleClick={handleToggleDoubleTapZoom}
            style={{
              transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${
                panOffset.y / zoomScale
              }px)`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800/80"
          />

          {/* Navigation Controls */}
          {page.pageNumber > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('prev');
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all hover:scale-110 shadow-xl border border-slate-700/60 cursor-pointer"
              title="Previous Page (Left Arrow)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {page.pageNumber < totalPagesCount && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('next');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all hover:scale-110 shadow-xl border border-slate-700/60 cursor-pointer"
              title="Next Page (Right Arrow)"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Footer text snippet */}
        {page.textSnippet && (
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page Text Content Snippet:{' '}
            </span>
            "{page.textSnippet}"
          </div>
        )}
      </div>
    </div>
  );
};
