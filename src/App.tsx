import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { PdfUploader } from './components/PdfUploader';
import { PageCard } from './components/PageCard';
import { RecipientManager } from './components/RecipientManager';
import { RecipientCard } from './components/RecipientCard';
import { DispatchModal } from './components/DispatchModal';
import { PagePreviewModal } from './components/PagePreviewModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { EmailLoginModal } from './components/EmailLoginModal';
import { SplitPdfPage, Recipient, PdfDocumentMeta, GeneratedPdfBundle, UserAccount } from './types';
import { splitPdfFile, createSamplePdf, mergePagesToBundle } from './utils/pdf';
import { GeneratedPdfCard } from './components/GeneratedPdfCard';
import { FileText, Mail, Send, CheckSquare, Square, Search, Filter, Sparkles, Layers, ArrowRightLeft, Download, Archive } from 'lucide-react';

export default function App() {
  const [documentMeta, setDocumentMeta] = useState<PdfDocumentMeta | null>(null);
  const [pages, setPages] = useState<SplitPdfPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // User Sender Account State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('pdf_dispatcher_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      email: 'dispatcher.song@gmail.com',
      name: 'Manager Song (PDF Dispatcher)',
      provider: 'Gmail',
      isLoggedIn: true,
      loginTime: '08:00',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
    };
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleUserLogin = (account: UserAccount) => {
    setCurrentUser(account);
    localStorage.setItem('pdf_dispatcher_user', JSON.stringify(account));
    setIsLoginOpen(false);
  };


  // Recipients state (starts empty with 0 recipients)
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Generated PDF bundles state
  const [generatedBundles, setGeneratedBundles] = useState<GeneratedPdfBundle[]>([]);

  // UI state
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  
  const [previewPage, setPreviewPage] = useState<SplitPdfPage | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [dispatchRecipientId, setDispatchRecipientId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Handler for uploading local PDF
  const handlePdfUpload = async (file: File) => {
    setIsProcessing(true);
    setProgressText('Initializing PDF engine...');
    setProgressPercent(10);

    try {
      const { meta, pages: splitPages } = await splitPdfFile(file, file.name, (curr, total) => {
        setProgressText(`Splitting and rendering page ${curr} / ${total}...`);
        setProgressPercent(Math.round(10 + (curr / total) * 85));
      });

      setDocumentMeta(meta);
      setPages(splitPages);
      setSelectedPageNumbers([]);
      
      // Clear assigned pages on new upload
      setRecipients((prev) => prev.map((r) => ({ ...r, assignedPages: [] })));
    } catch (err) {
      console.error('PDF Processing error:', err);
      alert('Failed to parse PDF. Please ensure you selected a valid, unlocked PDF file.');
    } finally {
      setIsProcessing(false);
      setProgressPercent(100);
    }
  };

  // Handler for loading sample PDF
  const handleLoadSample = async () => {
    setIsProcessing(true);
    setProgressText('Generating sample multi-page PDF report...');
    setProgressPercent(20);

    try {
      const { file } = await createSamplePdf();
      await handlePdfUpload(file);
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
      setIsProcessing(false);
    }
  };

  // Reset application state
  const handleReset = () => {
    setDocumentMeta(null);
    setPages([]);
    setSelectedPageNumbers([]);
    setRecipients((prev) => prev.map((r) => ({ ...r, assignedPages: [] })));
  };

  // Recipient management
  const handleAddRecipient = (email: string, name?: string, colorTag?: string) => {
    const newRecipient: Recipient = {
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      email,
      name,
      colorTag: colorTag || 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
      assignedPages: [],
      assignedBundles: [],
    };
    setRecipients((prev) => [...prev, newRecipient]);
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAllRecipients = () => {
    setRecipients([]);
  };

  // Create new PDF Bundle from selected pages
  const handleCreateBundleFromSelected = async () => {
    if (selectedPageNumbers.length === 0 || !documentMeta) return;

    const selectedPageObjs = pages.filter((p) => selectedPageNumbers.includes(p.pageNumber));
    if (selectedPageObjs.length === 0) return;

    try {
      setIsProcessing(true);
      setProgressText('Merging selected pages into new PDF bundle...');
      
      const bundle = await mergePagesToBundle(selectedPageObjs, documentMeta.fileName);
      setGeneratedBundles((prev) => [bundle, ...prev]);
      
      // Clear selected pages after bundle creation
      setSelectedPageNumbers([]);
    } catch (err) {
      console.error('Failed to create PDF bundle:', err);
      alert('Failed to generate PDF bundle, please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBundle = (bundleId: string) => {
    setGeneratedBundles((prev) => prev.filter((b) => b.id !== bundleId));
    setRecipients((prev) =>
      prev.map((r) => ({
        ...r,
        assignedBundles: r.assignedBundles ? r.assignedBundles.filter((b) => b.id !== bundleId) : [],
      }))
    );
  };

  const handleAssignBundleToRecipient = (recipientId: string, bundleId: string) => {
    const bundleToAssign = generatedBundles.find((b) => b.id === bundleId);
    if (!bundleToAssign) return;

    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === recipientId) {
          const currentBundles = r.assignedBundles || [];
          if (currentBundles.some((b) => b.id === bundleId)) return r;
          return { ...r, assignedBundles: [...currentBundles, bundleToAssign] };
        }
        return r;
      })
    );
  };

  const handleRemoveBundleFromRecipient = (recipientId: string, bundleId: string) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === recipientId) {
          return {
            ...r,
            assignedBundles: (r.assignedBundles || []).filter((b) => b.id !== bundleId),
          };
        }
        return r;
      })
    );
  };

  // Drag & Drop Assignment logic
  const handleAssignPage = (recipientId: string, pageNumber: number | number[]) => {
    const numbersToAssign = Array.isArray(pageNumber) ? pageNumber : [pageNumber];

    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === recipientId) {
          // Merge numbers uniquely
          const updated = Array.from(new Set([...r.assignedPages, ...numbersToAssign])).sort((a, b) => a - b);
          return { ...r, assignedPages: updated };
        }
        return r;
      })
    );
  };

  const handleRemovePageAssignment = (recipientId: string, pageNumber: number) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === recipientId) {
          return { ...r, assignedPages: r.assignedPages.filter((p) => p !== pageNumber) };
        }
        return r;
      })
    );
  };

  const handleClearRecipientPages = (recipientId: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === recipientId ? { ...r, assignedPages: [] } : r))
    );
  };

  // Page selection toggle for batching
  const handleToggleSelectPage = (pageNumber: number) => {
    setSelectedPageNumbers((prev) =>
      prev.includes(pageNumber) ? prev.filter((n) => n !== pageNumber) : [...prev, pageNumber]
    );
  };

  const handleSelectAllPages = () => {
    if (selectedPageNumbers.length === filteredPages.length) {
      setSelectedPageNumbers([]);
    } else {
      setSelectedPageNumbers(filteredPages.map((p) => p.pageNumber));
    }
  };

  // Update custom page filename
  const handleUpdatePageFileName = (pageNumber: number, newFileName: string) => {
    const trimmed = newFileName.trim();
    if (!trimmed) return;
    const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;

    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.pageNumber === pageNumber) {
          return { ...p, fileName: finalName };
        }
        return p;
      })
    );

    if (previewPage && previewPage.pageNumber === pageNumber) {
      setPreviewPage((prev) => (prev ? { ...prev, fileName: finalName } : null));
    }
  };

  // Download selected single pages in a ZIP archive with custom names
  const handleDownloadSelectedPagesZip = async () => {
    if (selectedPageNumbers.length === 0) return;
    const selectedPageObjs = pages.filter((p) => selectedPageNumbers.includes(p.pageNumber));
    if (selectedPageObjs.length === 0) return;

    try {
      setIsProcessing(true);
      setProgressText('Packaging renamed pages into ZIP archive...');

      const zip = new JSZip();
      for (const p of selectedPageObjs) {
        zip.file(p.fileName, p.pdfBytes);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);

      const baseDocName = documentMeta ? documentMeta.fileName.replace(/\.[^/.]+$/, '') : 'PDF_Pages';
      const zipName = `${baseDocName}_Selected_${selectedPageObjs.length}_Pages.zip`;

      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('ZIP package error:', err);
      alert('Failed to package ZIP archive, please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag start handler (supports single or multi-page selection drag)
  const handleDragStart = (e: React.DragEvent, pageNumber: number) => {
    let pagesToDrag = [pageNumber];
    if (selectedPageNumbers.includes(pageNumber) && selectedPageNumbers.length > 1) {
      pagesToDrag = selectedPageNumbers;
    }
    e.dataTransfer.setData('text/plain', pagesToDrag.join(','));
  };

  // Filter & Search pages
  const filteredPages = pages.filter((page) => {
    // Search query filter
    const matchesSearch =
      searchQuery === '' ||
      `Page ${page.pageNumber}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page.textSnippet && page.textSnippet.toLowerCase().includes(searchQuery.toLowerCase()));

    // Assigned status filter
    const isAssigned = recipients.some((r) => r.assignedPages.includes(page.pageNumber));
    if (filterStatus === 'assigned') return matchesSearch && isAssigned;
    if (filterStatus === 'unassigned') return matchesSearch && !isAssigned;
    return matchesSearch;
  });

  // Open dispatch modal
  const handleOpenDispatch = (recipientId?: string) => {
    setDispatchRecipientId(recipientId || null);
    setIsDispatchOpen(true);
  };

  // Preview page navigation
  const handlePreviewNavigate = (direction: 'prev' | 'next') => {
    if (!previewPage) return;
    const currentIndex = pages.findIndex((p) => p.pageNumber === previewPage.pageNumber);
    if (direction === 'prev' && currentIndex > 0) {
      setPreviewPage(pages[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < pages.length - 1) {
      setPreviewPage(pages[currentIndex + 1]);
    }
  };

  // Calculate total pages assigned
  const totalAssignedPagesCount = Array.from(
    new Set(recipients.flatMap((r) => r.assignedPages))
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      
      {/* App Navigation Header */}
      <Header
        hasDocument={Boolean(documentMeta)}
        onReset={handleReset}
        onLoadSample={handleLoadSample}
        onOpenHelp={() => setIsHelpOpen(true)}
        isProcessing={isProcessing}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
      />


      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {!documentMeta ? (
          /* Welcome & File Upload View */
          <div className="py-8 space-y-6">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800">
                PDF Splitter & Drag-and-Drop Dispatcher
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Split PDF Pages & Dispatch to Multiple Emails via Drag & Drop
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload your multi-page PDF document, split it into individual pages, drag & drop pages to recipient email cards, and dispatch with custom email content.
              </p>
            </div>

            <PdfUploader
              onFileUpload={handlePdfUpload}
              onLoadSample={handleLoadSample}
              isProcessing={isProcessing}
              progressText={progressText}
              progressPercent={progressPercent}
            />
          </div>
        ) : (
          /* Active Document Workspace View */
          <div className="space-y-6">
            
            {/* Document Meta Banner */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {documentMeta.fileName}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-normal">
                      Total {documentMeta.totalPages} Pages ({documentMeta.fileSizeFormatted})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Split into {pages.length} single page(s) • Assigned {totalAssignedPagesCount} / {pages.length} pages
                  </p>
                </div>
              </div>

              {/* Action trigger to start dispatch modal */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleOpenDispatch()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Launch Email Dispatch Hub
                </button>
              </div>
            </div>

            {/* Recipient Input Manager Bar */}
            <RecipientManager
              recipients={recipients}
              onAddRecipient={handleAddRecipient}
              onRemoveRecipient={handleRemoveRecipient}
              onClearAll={handleClearAllRecipients}
            />

            {/* Workspace Split Layout: Left Page Gallery | Right Email Drop Zones */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: PDF Split Pages Gallery (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Pages Filter & Search Control Bar */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
                  
                  {/* Select All / Batch Drag / Combine Action */}
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <button
                      onClick={handleSelectAllPages}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {selectedPageNumbers.length > 0 && selectedPageNumbers.length === filteredPages.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Select All ({selectedPageNumbers.length})</span>
                    </button>

                    {selectedPageNumbers.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={handleCreateBundleFromSelected}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-in fade-in duration-150"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Generate PDF Bundle ({selectedPageNumbers.length} pages)
                        </button>
                        <button
                          onClick={handleDownloadSelectedPagesZip}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-in fade-in duration-150"
                          title="Download selected pages as a ZIP file with custom page names"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Download Renamed Pages ({selectedPageNumbers.length} ZIP)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter Status Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filterStatus === 'all'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({pages.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('unassigned')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filterStatus === 'unassigned'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Unassigned
                    </button>
                    <button
                      onClick={() => setFilterStatus('assigned')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filterStatus === 'assigned'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Assigned
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[140px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search page or text..."
                      className="w-full pl-8 pr-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                </div>

                {/* Generated PDF Bundles Rack */}
                {generatedBundles.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                          <Layers className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          Generated PDF Bundles ({generatedBundles.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        Drag cards to recipient drop zones on the right
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {generatedBundles.map((bundle) => (
                        <GeneratedPdfCard
                          key={bundle.id}
                          bundle={bundle}
                          recipients={recipients}
                          onDeleteBundle={handleDeleteBundle}
                          onDragStartBundle={(e, bundleId) => {
                            e.dataTransfer.setData('text/plain', `bundle:${bundleId}`);
                          }}
                          onQuickAssignBundle={handleAssignBundleToRecipient}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Page Cards Grid */}
                {filteredPages.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 space-y-2">
                    <p className="text-xs font-medium">No PDF pages found matching filter criteria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredPages.map((page) => (
                      <PageCard
                        key={page.pageNumber}
                        page={page}
                        recipients={recipients}
                        isSelected={selectedPageNumbers.includes(page.pageNumber)}
                        onToggleSelect={handleToggleSelectPage}
                        onPreview={setPreviewPage}
                        onQuickAssign={(pageNum, recId) => handleAssignPage(recId, pageNum)}
                        onDragStart={handleDragStart}
                        onUpdateFileName={handleUpdatePageFileName}
                      />
                    ))}
                  </div>
                )}

              </div>

              {/* Right Column: Email Drop Zones (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Recipient Email Cards ({recipients.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Drag cards into recipients below
                  </span>
                </div>

                {recipients.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 space-y-2">
                    <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold">No recipient emails yet</p>
                    <p className="text-[11px]">Add recipient emails in the bar above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recipients.map((recipient) => (
                      <RecipientCard
                        key={recipient.id}
                        recipient={recipient}
                        allPages={pages}
                        onRemovePage={handleRemovePageAssignment}
                        onRemoveBundle={handleRemoveBundleFromRecipient}
                        onClearPages={handleClearRecipientPages}
                        onRemoveRecipient={handleRemoveRecipient}
                        onDropPage={(recId, dropData) => {
                          const stringVal = String(dropData);
                          if (stringVal.startsWith('bundle:')) {
                            const bundleId = stringVal.replace('bundle:', '');
                            handleAssignBundleToRecipient(recId, bundleId);
                          } else {
                            const pageNumbers = stringVal.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
                            handleAssignPage(recId, pageNumbers);
                          }
                        }}
                        onOpenDispatch={handleOpenDispatch}
                      />
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Modals */}
      <DispatchModal
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        recipients={recipients}
        allPages={pages}
        documentFileName={documentMeta?.fileName || 'PDF Document'}
        activeRecipientId={dispatchRecipientId}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <EmailLoginModal
        isOpen={isLoginOpen}
        onLogin={handleUserLogin}
        currentAccount={currentUser}
        onClose={() => setIsLoginOpen(false)}
        defaultEmail="dispatcher.song@gmail.com"
      />


      <PagePreviewModal
        page={previewPage}
        totalPagesCount={pages.length}
        onClose={() => setPreviewPage(null)}
        onNavigate={handlePreviewNavigate}
        onUpdateFileName={handleUpdatePageFileName}
      />

      <HelpGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Global Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center text-xs text-slate-400">
        <p>PDF Splitter & Email Dispatcher • Split PDF pages accurately and dispatch directly to recipient inbox</p>
      </footer>

    </div>
  );
}
