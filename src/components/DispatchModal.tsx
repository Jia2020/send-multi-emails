import React, { useState } from 'react';
import { Recipient, SplitPdfPage, DispatchLogItem, UserAccount } from '../types';
import { X, Send, Sparkles, CheckCircle2, AlertCircle, ChevronRight, FileText, UserCheck, ShieldCheck, Key, Trash2, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { mergePagesToBundle, uint8ArrayToBase64 } from '../utils/pdf';
import { safeFetchJson, toErrorString } from '../utils/api';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  allPages: SplitPdfPage[];
  documentFileName: string;
  activeRecipientId?: string | null;
  currentUser?: UserAccount | null;
  onOpenLogin?: () => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  recipients,
  allPages,
  documentFileName,
  activeRecipientId,
  currentUser,
  onOpenLogin,
}) => {

  if (!isOpen) return null;

  // Filter recipients who actually have assigned pages or bundles
  const validRecipients = recipients.filter(
    (r) => r.assignedPages.length > 0 || (r.assignedBundles && r.assignedBundles.length > 0)
  );
  
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    activeRecipientId && validRecipients.some((r) => r.id === activeRecipientId)
      ? activeRecipientId
      : validRecipients[0]?.id || ''
  );

  const selectedRecipient = validRecipients.find((r) => r.id === selectedRecipientId);

  // Email subject & body states per recipient
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [bodies, setBodies] = useState<Record<string, string>>({});

  const [isSending, setIsSending] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogItem[]>([]);

  // Helper functions for default Subject & Body
  const getDefaultSubject = (r: Recipient) =>
    `[PDF Attachment Dispatch] ${documentFileName} - Pages ${r.assignedPages.join(', ')}`;

  const getDefaultBody = (r: Recipient) =>
    `Dear ${r.name || r.email},\n\nHello! Attached are your requested PDF pages (${r.assignedPages.join(', ')}) from document "${documentFileName}".\n\nIf you have any questions, please feel free to contact us.\n\nBest regards!`;

  // Get current subject & body or default
  const currentSubject = selectedRecipient
    ? subjects[selectedRecipient.id] !== undefined
      ? subjects[selectedRecipient.id]
      : getDefaultSubject(selectedRecipient)
    : '';

  const currentBody = selectedRecipient
    ? bodies[selectedRecipient.id] !== undefined
      ? bodies[selectedRecipient.id]
      : getDefaultBody(selectedRecipient)
    : '';

  const handleSubjectChange = (val: string) => {
    if (selectedRecipient) {
      setSubjects((prev) => ({ ...prev, [selectedRecipient.id]: val }));
    }
  };

  const handleBodyChange = (val: string) => {
    if (selectedRecipient) {
      setBodies((prev) => ({ ...prev, [selectedRecipient.id]: val }));
    }
  };

  // AI Smart Compose button handler
  const handleAiCompose = async () => {
    if (!selectedRecipient) return;

    setIsAiGenerating(true);
    const assignedPagesObj = allPages.filter((p) =>
      selectedRecipient.assignedPages.includes(p.pageNumber)
    );
    const textSnippet = assignedPagesObj.map((p) => p.textSnippet || '').join('\n');

    try {
      const result = await safeFetchJson('/api/ai-suggest-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: selectedRecipient.email,
          recipientName: selectedRecipient.name,
          pageNumbers: selectedRecipient.assignedPages,
          fileName: documentFileName,
          textSnippet,
        }),
      });

      if (result.ok && result.data) {
        if (result.data.subject) handleSubjectChange(result.data.subject);
        if (result.data.body) handleBodyChange(result.data.body);
      }
    } catch (err) {
      console.error('AI draft failed:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Dispatch current or batch
  const handleDispatch = async (batchAll = false) => {
    const targets = batchAll ? validRecipients : selectedRecipient ? [selectedRecipient] : [];
    if (targets.length === 0) return;

    if (!currentUser?.appPassword) {
      onOpenLogin();
      setDispatchLogs((prev) => [
        {
          id: Math.random().toString(),
          recipientEmail: targets[0]?.email || 'N/A',
          pageNumbers: targets[0]?.assignedPages || [],
          timestamp: new Date().toLocaleTimeString(),
          status: 'failed',
          message: `❌ Not sent: Please configure your 16-character App Password in the Sender Authentication window first.`,
          subject: 'Missing Sender App Password',
          bodyPreview: 'Please complete sender email configuration and try again.',
          attachments: [],
        },
        ...prev,
      ]);
      return;
    }

    setIsSending(true);

    for (const r of targets) {
      const subj = subjects[r.id] !== undefined ? subjects[r.id] : getDefaultSubject(r);
      const bodyText = bodies[r.id] !== undefined ? bodies[r.id] : getDefaultBody(r);
      const assignedPagesObj = allPages.filter((p) => r.assignedPages.includes(p.pageNumber));

      try {
        // Merge assigned PDF pages into a single PDF attachment for the recipient
        const bundle = await mergePagesToBundle(
          assignedPagesObj,
          documentFileName,
          `${documentFileName.replace(/\.[^/.]+$/, '')}_P${r.assignedPages.join('_')}`
        );

        // Convert Uint8Array PDF bytes to Base64 safely
        const base64Pdf = uint8ArrayToBase64(bundle.pdfBytes);

        const result = await safeFetchJson('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: currentUser,
            recipientEmail: r.email,
            subject: subj,
            body: bodyText,
            attachments: [
              {
                filename: bundle.fileName,
                content: base64Pdf,
              },
            ],
          }),
        });

        if (result.ok && result.data?.success) {
          setDispatchLogs((prev) => [
            {
              id: result.data.trackingId || Math.random().toString(),
              recipientEmail: r.email,
              recipientName: r.name,
              pageNumbers: r.assignedPages,
              timestamp: new Date().toLocaleTimeString(),
              status: 'success',
              message: `✅ Successfully sent from your account (${currentUser?.provider || 'SMTP'}) to ${r.email} (Attachment: ${bundle.fileName}) [Note: If not seen in inbox, check Spam/Junk folder]`,
              subject: subj,
              bodyPreview: bodyText.slice(0, 80) + '...',
              attachments: [bundle.fileName],
            },
            ...prev,
          ]);
        } else {
          const errMsg = toErrorString(result.error) || toErrorString(result.data?.error) || 'Failed to send email';
          throw new Error(errMsg);
        }
      } catch (err: any) {
        setDispatchLogs((prev) => [
          {
            id: Math.random().toString(),
            recipientEmail: r.email,
            pageNumbers: r.assignedPages,
            timestamp: new Date().toLocaleTimeString(),
            status: 'failed',
            message: `❌ Failed to send to ${r.email}: ${toErrorString(err?.message || err) || 'Please check App Password'}`,
            subject: subj,
            bodyPreview: bodyText,
            attachments: [],
          },
          ...prev,
        ]);
      }
    }

    setIsSending(false);

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if confetti fails
    }
  };

  // Export .eml standard email file for Outlook/Foxmail/Apple Mail
  const handleExportEml = (recipient: Recipient) => {
    const subj = subjects[recipient.id] !== undefined ? subjects[recipient.id] : getDefaultSubject(recipient);
    const bodyText = bodies[recipient.id] !== undefined ? bodies[recipient.id] : getDefaultBody(recipient);
    const sender = currentUser?.email || 'snu_udem_song@snu.ac.kr';

    const emlLines = [
      `From: "${currentUser?.name || 'PDF Dispatcher'}" <${sender}>`,
      `To: <${recipient.email}>`,
      `Subject: ${subj}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      bodyText,
    ];

    const blob = new Blob([emlLines.join('\r\n')], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email_draft_${recipient.email.split('@')[0]}_${Date.now()}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Directly trigger Mailto Link
  const handleTriggerMailto = (recipient: Recipient) => {
    const subj = subjects[recipient.id] !== undefined ? subjects[recipient.id] : getDefaultSubject(recipient);
    const bodyText = bodies[recipient.id] !== undefined ? bodies[recipient.id] : getDefaultBody(recipient);
    const mailtoUrl = `mailto:${recipient.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Email Dispatch Hub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ready to send assigned PDF attachments to {validRecipients.length} recipient(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {validRecipients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No recipients with assigned PDF pages yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please drag & drop PDF pages into recipient cards on the main workspace first.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Workspace
            </button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            
            {/* Left Column: Recipient Selection List */}
            <div className="md:col-span-4 border-r border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-2 overflow-y-auto">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Recipients ({validRecipients.length})
              </div>

              {validRecipients.map((r) => {
                const assignedPagesObj = allPages.filter((p) => r.assignedPages.includes(p.pageNumber));
                const isSelected = r.id === selectedRecipientId;

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipientId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs truncate">{r.email}</div>
                      <div className={`text-[11px] opacity-80 flex items-center gap-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        <FileText className="w-3 h-3" />
                        <span>{assignedPagesObj.length} page(s) (P{r.assignedPages.join(', P')})</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>

            {/* Right Column: Email Compose & Direct Send */}
            <div className="md:col-span-8 p-6 flex flex-col justify-between overflow-y-auto space-y-4 bg-white dark:bg-slate-800">
              {selectedRecipient ? (
                <div className="space-y-4">
                  
                  {/* Sender Account Info Bar */}
                  <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 text-xs">
                        <div className="text-slate-400 text-[10px] flex items-center gap-1 font-medium">
                          <span>Sender Account:</span>
                          {currentUser && currentUser.appPassword ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> SMTP Ready
                            </span>
                          ) : (
                            <span className="text-amber-500 font-bold">App Password Not Set</span>
                          )}
                        </div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {currentUser?.name ? `${currentUser.name} <${currentUser.email}>` : currentUser?.email || 'dispatcher.song@gmail.com'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Key className="w-3 h-3" />
                      <span>{currentUser?.appPassword ? 'Edit Credentials' : 'Set App Password'}</span>
                    </button>
                  </div>

                  {/* Recipient info & AI trigger */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="text-xs text-slate-400">To:</span>
                      <span className="ml-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                        {selectedRecipient.email}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiCompose}
                      disabled={isAiGenerating}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isAiGenerating ? 'Generating Draft...' : 'AI Smart Compose'}
                    </button>
                  </div>

                  {/* Attached PDF Pages & Bundles pills */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Attached PDF Documents:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {/* Custom Generated Bundles */}
                      {selectedRecipient.assignedBundles?.map((bundle) => (
                        <div
                          key={bundle.id}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1 border border-blue-200 dark:border-blue-800 shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Bundle: {bundle.fileName} ({bundle.includedPageNumbers.length} pages)</span>
                        </div>
                      ))}

                      {/* Single Pages */}
                      {selectedRecipient.assignedPages.map((pageNum) => {
                        const pageObj = allPages.find((p) => p.pageNumber === pageNum);
                        return (
                          <div
                            key={pageNum}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>Single Page: Page {pageNum} ({pageObj?.fileName})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Subject:
                    </label>
                    <input
                      type="text"
                      value={currentSubject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Body Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Body:
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBodyChange('')}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 transition-colors"
                          title="Clear body text to type or paste custom text"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Body</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedRecipient) {
                              setBodies((prev) => {
                                const copy = { ...prev };
                                delete copy[selectedRecipient.id];
                                return copy;
                              });
                            }
                          }}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 transition-colors"
                          title="Restore default template body"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore Default Body</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      value={currentBody}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      placeholder="Type custom email body here..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-sans leading-relaxed"
                    />
                  </div>

                  {/* Delivery Logs Preview */}
                  {dispatchLogs.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Dispatch Logs ({dispatchLogs.length}):
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono bg-slate-900 text-emerald-400 p-2.5 rounded-xl">
                        {dispatchLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between">
                            <span>[{log.timestamp}] {log.message}</span>
                            <span className="text-slate-400">#{log.id.slice(-6)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Send Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleDispatch(false)}
                      disabled={isSending}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
                      <span>{isSending ? 'Sending...' : `Send Email to ${selectedRecipient.email}`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatch(true)}
                      disabled={isSending}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
                      <span>{isSending ? 'Sending to All...' : `Send to All (${validRecipients.length} recipients)`}</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Please select a recipient on the left
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
