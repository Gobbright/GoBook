import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Minus, Plus, Printer, Scan } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './invoicePdfPreview.css';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function InvoicePdfPreview({ url, data, filename, onDownload, onPrint, printReady }) {
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(800);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(true);
  const [pageText, setPageText] = useState('');
  const viewportRef = useRef(null);
  const paperRef = useRef(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setPageNumber(1);
    setError('');
    const source = data ? { data: data.slice(0), disableWorker: true } : { url, disableWorker: true };
    const task = getDocument(source);
    task.promise.then((document) => { if (!cancelled) setPdf(document); })
      .catch((error) => { if (!cancelled) { console.error('PDF preview loading failed:', error.message); setError('Unable to display this invoice. You can still download the PDF.'); setRendering(false); } });
    return () => { cancelled = true; void task.destroy(); };
  }, [url, data]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let task;
    setRendering(true);
    setError('');
    async function render() {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const natural = page.getViewport({ scale: 96 / 72 });
      const fit = Math.min(1, Math.max(160, width - 48) / natural.width);
      const viewport = page.getViewport({ scale: (96 / 72) * fit * zoom });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.setAttribute('aria-hidden', 'true');
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      const text = await page.getTextContent();
      if (cancelled) return;
      paperRef.current.replaceChildren(canvas);
      setPageText(text.items.map((item) => item.str).join(' '));
      setRendering(false);
    }
    render().catch((err) => {
      if (!cancelled && err.name !== 'RenderingCancelledException') {
        setError('Unable to display this page. Please download the invoice.');
        setRendering(false);
      }
    });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, pageNumber, width, zoom]);

  return (
    <section className="invoice-preview" aria-label="Invoice preview">
      <div className="invoice-preview-toolbar">
        <div className="invoice-preview-heading"><strong>Invoice preview</strong><span>{filename}</span></div>
        <div className="invoice-preview-controls">
          <div className="invoice-preview-control-group">
            <button type="button" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><Minus size={16} /></button>
            <span className="invoice-preview-zoom">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))}><Plus size={16} /></button>
            <button type="button" aria-label="Fit invoice" title="Fit invoice" onClick={() => setZoom(1)}><Scan size={16} /></button>
          </div>
          <button type="button" onClick={onDownload}><Download size={16} /><span>Download</span></button>
          <button type="button" className="invoice-preview-print" disabled={!printReady} onClick={onPrint}><Printer size={16} /><span>Print</span></button>
        </div>
      </div>
      <div className="invoice-preview-viewport" ref={viewportRef} aria-busy={rendering}>
        {error && <p role="alert" className="invoice-preview-status">{error}</p>}
        {!pdf && !error && <p role="status" className="invoice-preview-status">Loading preview…</p>}
        <div className="invoice-preview-paper" ref={paperRef} />
        <div className="invoice-preview-accessible-text">Page {pageNumber}: {pageText}</div>
      </div>
      <div className="invoice-preview-pagination">
        <button type="button" aria-label="Previous page" disabled={!pdf || pageNumber === 1} onClick={() => setPageNumber((value) => value - 1)}><ChevronLeft size={16} /></button>
        <span aria-live="polite">Page {pageNumber} of {pdf?.numPages || 1}</span>
        <button type="button" aria-label="Next page" disabled={!pdf || pageNumber >= pdf.numPages} onClick={() => setPageNumber((value) => value + 1)}><ChevronRight size={16} /></button>
      </div>
    </section>
  );
}

