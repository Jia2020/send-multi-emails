import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { SplitPdfPage, PdfDocumentMeta, GeneratedPdfBundle } from '../types';

/**
 * Converts a Uint8Array byte array into a clean Base64 string safely without memory overflow
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 16384;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return window.btoa(binary);
}

/**
 * Merges selected split pages into a new standalone PDF document bundle
 */
export async function mergePagesToBundle(
  selectedPages: SplitPdfPage[],
  originalFileName: string,
  customTitle?: string,
  providedArrayBuffer?: ArrayBuffer
): Promise<GeneratedPdfBundle> {
  const sortedPages = [...selectedPages].sort((a, b) => a.pageNumber - b.pageNumber);
  const pageNumbers = sortedPages.map((p) => p.pageNumber);

  const sourceBuffer = providedArrayBuffer || sortedPages.find((p) => p.originalArrayBuffer)?.originalArrayBuffer;

  let pdfBytes: Uint8Array;

  if (sortedPages.length === 1 && !sourceBuffer) {
    // Single page optimization: use page pdfBytes directly
    pdfBytes = sortedPages[0].pdfBytes;
  } else if (sourceBuffer) {
    // Primary path: load original source PDF and copy exact pages with all fonts and resources
    const originalDoc = await PDFDocument.load(sourceBuffer.slice(0), { ignoreEncryption: true });
    const mergedPdfDoc = await PDFDocument.create();

    const pageIndices = sortedPages.map((p) => p.originalIndex);
    const copiedPages = await mergedPdfDoc.copyPages(originalDoc, pageIndices);
    for (const page of copiedPages) {
      mergedPdfDoc.addPage(page);
    }
    pdfBytes = await mergedPdfDoc.save();
  } else {
    // Fallback path: copy from individual page pdfBytes
    const mergedPdfDoc = await PDFDocument.create();
    for (const pageObj of sortedPages) {
      const cleanBytes = pageObj.pdfBytes.slice(0);
      const srcDoc = await PDFDocument.load(cleanBytes, { ignoreEncryption: true });
      const [copiedPage] = await mergedPdfDoc.copyPages(srcDoc, [0]);
      mergedPdfDoc.addPage(copiedPage);
    }
    pdfBytes = await mergedPdfDoc.save();
  }

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfBlobUrl = URL.createObjectURL(blob);

  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const bundleTitle = customTitle || `${baseName}_P${pageNumbers.join('_')}`;
  const fileName = `${bundleTitle}.pdf`;

  return {
    id: 'bundle_' + Math.random().toString(36).substring(2, 9),
    title: bundleTitle,
    fileName,
    includedPageNumbers: pageNumbers,
    pdfBytes,
    pdfBlobUrl,
    fileSizeBytes: pdfBytes.byteLength,
    fileSizeFormatted: formatBytes(pdfBytes.byteLength),
    thumbnailUrl: sortedPages[0]?.thumbnailUrl || '',
    createdAt: new Date(),
  };
}

// Set up pdf.js worker for rendering canvas thumbnails
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Failed to set pdfjs workerSrc:', e);
  }
}

/**
 * Formats byte count to human-readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Splits a multi-page PDF into an array of single-page SplitPdfPage objects
 */
export async function splitPdfFile(
  fileOrBuffer: File | ArrayBuffer,
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ meta: PdfDocumentMeta; pages: SplitPdfPage[] }> {
  const arrayBuffer = fileOrBuffer instanceof File 
    ? await fileOrBuffer.arrayBuffer() 
    : fileOrBuffer;

  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  const fileSizeBytes = arrayBuffer.byteLength;

  const meta: PdfDocumentMeta = {
    fileName,
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    totalPages,
    uploadedAt: new Date(),
  };

  // Prepare pdf.js document for canvas thumbnail generation
  let pdfjsDoc: pdfjsLib.PDFDocumentProxy | null = null;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    pdfjsDoc = await loadingTask.promise;
  } catch (err) {
    console.warn('pdfjs-dist canvas preview setup failed, falling back to SVG icon placeholder', err);
  }

  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const pages: SplitPdfPage[] = [];

  for (let i = 0; i < totalPages; i++) {
    if (onProgress) {
      onProgress(i + 1, totalPages);
    }

    const pageNumber = i + 1;
    const pageFileName = `${baseName}_Page_${pageNumber}.pdf`;

    // Get page dimensions
    const originalPage = pdfDoc.getPage(i);
    const { width, height } = originalPage.getSize();

    // 1. Create a new single-page PDF document using pdf-lib
    const singlePdfDoc = await PDFDocument.create();
    const [copiedPage] = await singlePdfDoc.copyPages(pdfDoc, [i]);
    singlePdfDoc.addPage(copiedPage);
    const pdfBytes = await singlePdfDoc.save();

    const pageBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfBlobUrl = URL.createObjectURL(pageBlob);

    // 2. Render thumbnail canvas
    let thumbnailUrl = '';
    let textSnippet = '';

    if (pdfjsDoc) {
      try {
        const pageProxy = await pdfjsDoc.getPage(pageNumber);
        
        // Extract page text snippet for preview/AI context
        try {
          const textContent = await pageProxy.getTextContent();
          textSnippet = textContent.items
            .map((item: any) => item.str || '')
            .join(' ')
            .trim()
            .slice(0, 300);
        } catch {
          // Ignore text extraction failure
        }

        // Render to offscreen canvas
        const viewport = pageProxy.getViewport({ scale: 1.2 }); // Higher scale for crisp card thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          await pageProxy.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          }).promise;
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.92);
        }
      } catch (renderError) {
        console.warn(`Failed to render canvas thumbnail for page ${pageNumber}`, renderError);
      }
    }

    // Fallback thumbnail if rendering failed
    if (!thumbnailUrl) {
      thumbnailUrl = createFallbackThumbnail(pageNumber, baseName);
    }

    pages.push({
      pageNumber,
      originalIndex: i,
      thumbnailUrl,
      pdfBytes,
      pdfBlobUrl,
      fileName: pageFileName,
      fileSizeBytes: pdfBytes.byteLength,
      fileSizeFormatted: formatBytes(pdfBytes.byteLength),
      width: Math.round(width),
      height: Math.round(height),
      textSnippet,
      originalArrayBuffer: arrayBuffer,
    });
  }

  return { meta, pages };
}

/**
 * Renders a PDF page to a high-definition Data URL image for crisp full-screen previewing
 */
export async function renderHighResPageDataUrl(
  pdfBytes: Uint8Array,
  targetScale = 2.5
): Promise<string> {
  try {
    const cleanBytes = pdfBytes.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: cleanBytes });
    const pdf = await loadingTask.promise;
    const pageProxy = await pdf.getPage(1);
    
    // Scale 2.5 provides crisp, ultra-high-definition image suitable for zooming up to 400%
    const viewport = pageProxy.getViewport({ scale: targetScale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    if (context) {
      await pageProxy.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      return canvas.toDataURL('image/png'); // PNG for lossless crisp text and vectors
    }
  } catch (err) {
    console.warn('Failed to render high-definition PDF page image:', err);
  }
  return '';
}

/**
 * Creates an SVG Data URL fallback thumbnail when PDF canvas rendering is unavailable
 */
function createFallbackThumbnail(pageNumber: number, title: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="none">
    <rect width="300" height="400" rx="12" fill="#F8FAFC"/>
    <rect x="20" y="20" width="260" height="360" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <rect x="40" y="50" width="120" height="12" rx="3" fill="#3B82F6"/>
    <rect x="40" y="80" width="220" height="8" rx="2" fill="#CBD5E1"/>
    <rect x="40" y="96" width="200" height="8" rx="2" fill="#E2E8F0"/>
    <rect x="40" y="112" width="180" height="8" rx="2" fill="#E2E8F0"/>
    <rect x="40" y="140" width="220" height="120" rx="6" fill="#F1F5F9" stroke="#E2E8F0"/>
    <circle cx="150" cy="200" r="30" fill="#2563EB" opacity="0.1"/>
    <text x="150" y="206" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2563EB" text-anchor="middle">P${pageNumber}</text>
    <rect x="40" y="280" width="220" height="8" rx="2" fill="#CBD5E1"/>
    <rect x="40" y="296" width="160" height="8" rx="2" fill="#E2E8F0"/>
    <text x="150" y="350" font-family="sans-serif" font-size="12" fill="#64748B" text-anchor="middle">Page ${pageNumber} of ${title}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a multi-page Sample PDF dynamically with rich visual content
 */
export async function createSamplePdf(): Promise<{ file: File; buffer: ArrayBuffer }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Financial & Sales Summary
  const page1 = pdfDoc.addPage([600, 800]);
  page1.drawRectangle({ x: 0, y: 720, width: 600, height: 80, color: rgb(0.12, 0.23, 0.53) });
  page1.drawText('Q3 FINANCIAL REPORT - PAGE 1', { x: 40, y: 750, size: 20, font, color: rgb(1, 1, 1) });
  page1.drawText('Confidential • Internal Distribution Only', { x: 40, y: 732, size: 10, font: regularFont, color: rgb(0.8, 0.9, 1) });
  
  page1.drawText('1. Executive Sales Overview', { x: 40, y: 660, size: 16, font, color: rgb(0.1, 0.1, 0.2) });
  page1.drawText('Total Revenue: $1,245,000 (+18.4% YoY)', { x: 40, y: 630, size: 12, font: regularFont });
  page1.drawText('Gross Profit Margin: 64.2%', { x: 40, y: 610, size: 12, font: regularFont });
  page1.drawText('Assigned Recipient Target: Finance & Accounting Dept (finance@company.com)', { x: 40, y: 580, size: 11, font, color: rgb(0.15, 0.45, 0.85) });

  page1.drawRectangle({ x: 40, y: 380, width: 520, height: 170, color: rgb(0.96, 0.97, 0.99), borderColor: rgb(0.85, 0.88, 0.95), borderWidth: 1 });
  page1.drawText('Key Performance Indicators (KPIs)', { x: 60, y: 520, size: 14, font, color: rgb(0.2, 0.3, 0.6) });
  page1.drawText('• Enterprise Clients Acquired: 28 accounts', { x: 60, y: 490, size: 11, font: regularFont });
  page1.drawText('• Average Contract Value (ACV): $44,500', { x: 60, y: 468, size: 11, font: regularFont });
  page1.drawText('• Customer Acquisition Cost (CAC): $6,200', { x: 60, y: 446, size: 11, font: regularFont });
  page1.drawText('• Net Revenue Retention (NRR): 122%', { x: 60, y: 424, size: 11, font: regularFont });

  page1.drawText('Page 1 of 3 - Document ID: DOC-2026-9812', { x: 40, y: 30, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5) });

  // Page 2: Human Resources & Team Onboarding
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawRectangle({ x: 0, y: 720, width: 600, height: 80, color: rgb(0.08, 0.42, 0.32) });
  page2.drawText('HR & TALENT ACQUISITION - PAGE 2', { x: 40, y: 750, size: 20, font, color: rgb(1, 1, 1) });
  page2.drawText('Q3 Hiring Roadmap & Compensation Benchmarks', { x: 40, y: 732, size: 10, font: regularFont, color: rgb(0.8, 1, 0.9) });

  page2.drawText('2. Headcount Expansion Plan', { x: 40, y: 660, size: 16, font, color: rgb(0.1, 0.2, 0.1) });
  page2.drawText('Engineering Team: +12 Full-stack & AI Engineers', { x: 40, y: 630, size: 12, font: regularFont });
  page2.drawText('Design & Product: +4 UX/UI Specialists', { x: 40, y: 610, size: 12, font: regularFont });
  page2.drawText('Assigned Recipient Target: HR & Talent Dept (hr@company.com)', { x: 40, y: 580, size: 11, font, color: rgb(0.08, 0.5, 0.35) });

  page2.drawRectangle({ x: 40, y: 380, width: 520, height: 170, color: rgb(0.95, 0.99, 0.96), borderColor: rgb(0.8, 0.92, 0.85), borderWidth: 1 });
  page2.drawText('Hiring Milestones & Target Dates', { x: 60, y: 520, size: 14, font, color: rgb(0.1, 0.45, 0.3) });
  page2.drawText('• Senior Frontend Lead: Offer Accepted (Starts Aug 15)', { x: 60, y: 490, size: 11, font: regularFont });
  page2.drawText('• DevOps Architect: Final Technical Interview Phase', { x: 60, y: 468, size: 11, font: regularFont });
  page2.drawText('• AI Research Scientist: Open Requisition', { x: 60, y: 446, size: 11, font: regularFont });

  page2.drawText('Page 2 of 3 - Document ID: DOC-2026-9812', { x: 40, y: 30, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5) });

  // Page 3: Legal Contracts & Compliance Notice
  const page3 = pdfDoc.addPage([600, 800]);
  page3.drawRectangle({ x: 0, y: 720, width: 600, height: 80, color: rgb(0.48, 0.15, 0.22) });
  page3.drawText('LEGAL & COMPLIANCE - PAGE 3', { x: 40, y: 750, size: 20, font, color: rgb(1, 1, 1) });
  page3.drawText('Regulatory Audit & Intellectual Property Rights', { x: 40, y: 732, size: 10, font: regularFont, color: rgb(1, 0.85, 0.88) });

  page3.drawText('3. Compliance Certification & Audit', { x: 40, y: 660, size: 16, font, color: rgb(0.3, 0.1, 0.1) });
  page3.drawText('SOC 2 Type II Certification Status: Approved', { x: 40, y: 630, size: 12, font: regularFont });
  page3.drawText('GDPR & Data Privacy Audit: Compliant', { x: 40, y: 610, size: 12, font: regularFont });
  page3.drawText('Assigned Recipient Target: Legal Counsel (legal@company.com)', { x: 40, y: 580, size: 11, font, color: rgb(0.7, 0.2, 0.3) });

  page3.drawRectangle({ x: 40, y: 380, width: 520, height: 170, color: rgb(0.99, 0.95, 0.96), borderColor: rgb(0.95, 0.82, 0.85), borderWidth: 1 });
  page3.drawText('Required Signatures & Authorization', { x: 60, y: 520, size: 14, font, color: rgb(0.5, 0.15, 0.2) });
  page3.drawText('• General Counsel Signature: [ PENDING DISPATCH ]', { x: 60, y: 490, size: 11, font: regularFont });
  page3.drawText('• Chief Compliance Officer: Approved via Digital Signature', { x: 60, y: 468, size: 11, font: regularFont });
  page3.drawText('• IP Patent Application #89127: Filed in USPTO', { x: 60, y: 446, size: 11, font: regularFont });

  page3.drawText('Page 3 of 3 - Document ID: DOC-2026-9812', { x: 40, y: 30, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  const buffer = pdfBytes.buffer as ArrayBuffer;
  const file = new File([pdfBytes], 'MultiPage_Quarterly_Report_2026.pdf', { type: 'application/pdf' });

  return { file, buffer };
}
