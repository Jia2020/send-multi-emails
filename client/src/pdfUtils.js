import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function openPdfFromBytes(bytes, name) {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const pdfjsDoc = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    pages.push({ index: i - 1, width: vp.width, height: vp.height });
  }
  return { name, bytes, pdfjsDoc, pages };
}

export async function openPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  return openPdfFromBytes(new Uint8Array(arrayBuffer), file.name);
}

export async function mergePdfFiles(files) {
  const dst = await PDFDocument.create();
  const labels = [];
  for (const f of files) {
    const buf = await f.arrayBuffer();
    const src = await PDFDocument.load(buf);
    const pages = await dst.copyPages(src, src.getPageIndices());
    pages.forEach((p) => dst.addPage(p));
    const base = f.name.replace(/\.pdf$/i, '').trim() || f.name;
    for (let i = 0; i < pages.length; i++) labels.push(base);
  }
  return { bytes: await dst.save(), labels };
}

export async function renderPageToCanvas(pdfjsDoc, pageNumber, canvas, maxWidth) {
  const page = await pdfjsDoc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / base.width, 2);
  const vp = page.getViewport({ scale });
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
}

export async function mergePages(bytes, pageIndexes) {
  const src = await PDFDocument.load(bytes);
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(src, pageIndexes);
  pages.forEach((p) => dst.addPage(p));
  return await dst.save();
}

export async function splitPage(bytes, index) {
  const src = await PDFDocument.load(bytes);
  const dst = await PDFDocument.create();
  const [p] = await dst.copyPages(src, [index]);
  dst.addPage(p);
  return await dst.save();
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
