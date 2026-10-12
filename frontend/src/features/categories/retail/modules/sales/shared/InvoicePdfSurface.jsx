import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { pdf } from '@react-pdf/renderer';
import { asDataUrl, downloadInvoicePdf } from './invoicePdf.js';
import { InvoiceReactPdfDocument } from './InvoiceReactPdfDocument.jsx';
import './invoicePdfPreview.css';

function NativePdfPreview({ url, filename, printReady, onDownload, onPrint }) {
  return (
    <section className="invoice-preview" aria-label="Invoice preview">
      <div className="invoice-preview-toolbar">
        <div className="invoice-preview-heading"><strong>Invoice preview</strong><span>{filename}</span></div>
        <div className="invoice-preview-controls">
          <button type="button" onClick={onDownload}>Download PDF</button>
          <button type="button" className="invoice-preview-print" disabled={!printReady} onClick={onPrint}>Print</button>
        </div>
      </div>
      <div className="invoice-preview-viewport">
        <iframe
          title="Invoice PDF preview"
          src={url}
          className="h-[78vh] min-h-[620px] w-full border-0 bg-white"
        />
      </div>
    </section>
  );
}

export function InvoicePdfSurface({ children, revision, filename, download, print, onDownloaded, onPrinted, onReady, pdfData }) {
  const sourceRef = useRef(null);
  const frameRef = useRef(null);
  const callbacks = useRef({ onDownloaded, onPrinted, onReady });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const downloaded = useRef(false);
  const printed = useRef(false);
  const notified = useRef(null);
  const useMobileHtmlPreview = mobilePreview && !download && !onReady;
  const needsPdf = Boolean(download || onReady || (!useMobileHtmlPreview && (print || printRequested)));

  useEffect(() => { callbacks.current = { onDownloaded, onPrinted, onReady }; });

  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 767px)');
    if (!query) return undefined;
    const sync = () => setMobilePreview(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    let url;
    setResult(null);
    setLoaded(false);
    setError('');
    if (useMobileHtmlPreview) return undefined;
    const timer = setTimeout(() => {
      pdf(<InvoiceReactPdfDocument data={{ ...pdfData, filename }} />).toBlob().then(async (blob) => {
        url = URL.createObjectURL(blob);
        const data = new Uint8Array(await blob.arrayBuffer());
        setResult({ url, blob, data, revision });
      }).catch((err) => {
        setError(err.message || 'Unable to prepare invoice PDF. Please retry.');
      });
    }, 150);
    return () => {
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [revision, retry, pdfData, filename, useMobileHtmlPreview]);

  const current = result?.revision === revision ? result : null;
  const errorPanel = error && <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>{(download || onReady) && <button type="button" onClick={() => { callbacks.current.onReady?.(null); callbacks.current.onDownloaded?.(); setError(''); }}>Close</button>}</div>;

  useEffect(() => {
    if (!download) { downloaded.current = false; return; }
    if (!current || downloaded.current) return;
    downloaded.current = true;
    downloadInvoicePdf(current.url, filename);
    callbacks.current.onDownloaded?.();
  }, [download, current, filename]);

  useEffect(() => {
    if (!current || !onReady || notified.current === current.url) return;
    notified.current = current.url;
    asDataUrl(current.blob).then((data) => callbacks.current.onReady?.(data));
  }, [current, onReady]);

  useEffect(() => {
    if (!print && !printRequested) { printed.current = false; return; }
    if (!current || !loaded || printed.current) return;
    printed.current = true;
    try {
      frameRef.current.contentWindow.focus();
      frameRef.current.contentWindow.print();
      callbacks.current.onPrinted?.();
    } catch {
      setError('Unable to open printing. Download the invoice and print it from your PDF viewer.');
      callbacks.current.onPrinted?.();
    }
    setPrintRequested(false);
  }, [print, printRequested, current, loaded]);

  useEffect(() => {
    if (!useMobileHtmlPreview || !print || printed.current) return;
    printed.current = true;
  }, [useMobileHtmlPreview, print]);

  function printHtmlPreview() {
    try {
      document.body.classList.add('mobile-html-printing');
      window.print();
    } finally {
      window.setTimeout(() => {
        document.body.classList.remove('mobile-html-printing');
        callbacks.current.onPrinted?.();
      }, 500);
    }
  }

  const htmlPreview = (
    <div className="invoice-html-preview" aria-label="Invoice preview">
      <div className="invoice-html-preview-toolbar">
        <div>
          <strong>Invoice preview</strong>
          <span>{filename}</span>
        </div>
        <div className="invoice-html-preview-actions">
          <button type="button" className="invoice-html-preview-print" onClick={printHtmlPreview}>Print</button>
          {current && <button type="button" onClick={() => downloadInvoicePdf(current.url, filename)}>Download PDF</button>}
        </div>
      </div>
      <div className="invoice-html-preview-viewport">
        {children}
      </div>
    </div>
  );

  if (useMobileHtmlPreview) {
    return <div className="invoice-pdf-surface">{htmlPreview}</div>;
  }

  return (
    <div className="invoice-pdf-surface">
      <div ref={sourceRef} aria-hidden="true" style={{ position: 'fixed', left: '-12000px', top: 0, width: '210mm', pointerEvents: 'none' }}>{children}</div>
      {error && (download || onReady) ? createPortal(<div style={{ position: 'fixed', inset: '20px 20px auto', zIndex: 10000 }}>{errorPanel}</div>, document.body) : errorPanel}
      {error && !download && !onReady && htmlPreview}
      {!current && !error && <div role="status" className="bg-white p-8 text-center text-sm">Preparing invoice…</div>}
      {current && <>
        <NativePdfPreview
          url={current.url}
          filename={filename}
          printReady={loaded}
          onDownload={() => downloadInvoicePdf(current.url, filename)}
          onPrint={() => setPrintRequested(true)}
        />
        <iframe ref={frameRef} title="Invoice PDF print document" aria-hidden="true" tabIndex={-1} src={current.url} onLoad={() => setLoaded(true)} style={{ position: 'fixed', left: '-12000px', top: 0, width: 1, height: 1, border: 0, pointerEvents: 'none' }} />
      </>}
    </div>
  );
}
