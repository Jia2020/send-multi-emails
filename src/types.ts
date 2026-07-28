export interface SplitPdfPage {
  pageNumber: number; // 1-indexed for display
  originalIndex: number; // 0-indexed for pdf-lib extraction
  thumbnailUrl: string; // Data URL of rendered page canvas
  pdfBytes: Uint8Array; // Standalone single-page PDF bytes
  pdfBlobUrl: string; // Blob URL for downloading or viewing
  fileName: string; // e.g. "Invoice_Page_1.pdf"
  fileSizeBytes: number;
  fileSizeFormatted: string;
  width: number;
  height: number;
  textSnippet?: string; // Optional extracted text for quick preview
  originalArrayBuffer?: ArrayBuffer; // Reference to original PDF source buffer for perfect multi-page merges
}

export interface GeneratedPdfBundle {
  id: string;
  title: string;
  fileName: string;
  includedPageNumbers: number[];
  pdfBytes: Uint8Array;
  pdfBlobUrl: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  thumbnailUrl: string; // Preview image of first page or merged cover
  createdAt: Date;
}

export interface Recipient {
  id: string;
  email: string;
  name?: string;
  colorTag: string; // Tailwind color class or hex for visual differentiation
  assignedPages: number[]; // Array of 1-indexed pageNumbers
  assignedBundles: GeneratedPdfBundle[]; // Custom generated PDF packages assigned to this recipient
  notes?: string;
  customSubject?: string;
  customBody?: string;
}

export interface PdfDocumentMeta {
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  totalPages: number;
  uploadedAt: Date;
}

export type DispatchMode = 'simulated' | 'mailto' | 'smtp' | 'download_zip';

export interface DispatchLogItem {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  pageNumbers: number[];
  timestamp: string;
  status: 'pending' | 'sending' | 'success' | 'failed';
  message: string;
  subject: string;
  bodyPreview: string;
  attachments: string[]; // filenames
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface UserAccount {
  email: string;
  name: string;
  provider: string; // 'Gmail' | 'Outlook' | 'QQ Mail' | '163 Mail' | 'Enterprise' | 'Custom'
  isLoggedIn: boolean;
  loginTime: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
}

