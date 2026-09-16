import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { asDataUrl, downloadInvoicePdf, prepareInvoicePdf } from './invoicePdf.js';
const InvoicePdfPreview = lazy(() => import('./InvoicePdfPreview.jsx'));

export function InvoicePdfSurface({ children, revision, filename, download, print, onDownloaded, onPrinted, onReady }) {
  const sourceRef = useRef(null);
  const frameRef = useRef(null);
  const callbacks = useRef({ onDownloaded, onPrinted, onReady });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const downloaded = useRef(false);
  const printed = useRef(false);
  const notified = useRef(null);

  useEffect(() => { callbacks.current = { onDownloaded, onPrinted, onReady }; });

  useEffect(() => {
    const controller = new AbortController();
    let url;
    setResult(null);
    setLoaded(false);
    setError('');
    const timer = setTimeout(() => {
      prepareInvoicePdf(sourceRef.current, controller.signal).then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setResult({ url, blob, revision });
      }).catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [revision, retry]);

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

  return (
    <div className="invoice-pdf-surface">
      <div ref={sourceRef} aria-hidden="true" style={{ position: 'fixed', left: '-12000px', top: 0, width: '210mm', pointerEvents: 'none' }}>{children}</div>
      {error && (download || onReady) ? createPortal(<div style={{ position: 'fixed', inset: '20px 20px auto', zIndex: 10000 }}>{errorPanel}</div>, document.body) : errorPanel}
      {!current && !error && <div role="status" className="bg-white p-8 text-center text-sm">Preparing invoice…</div>}
      {current && <>
        <Suspense fallback={<div role="status" className="bg-white p-8 text-center text-sm">Loading preview…</div>}>
          <InvoicePdfPreview url={current.url} filename={filename} printReady={loaded}
            onDownload={() => downloadInvoicePdf(current.url, filename)} onPrint={() => setPrintRequested(true)} />
        </Suspense>
        <iframe ref={frameRef} title="Invoice PDF print document" aria-hidden="true" tabIndex={-1} src={current.url} onLoad={() => setLoaded(true)} style={{ position: 'fixed', left: '-12000px', top: 0, width: 1, height: 1, border: 0, pointerEvents: 'none' }} />
      </>}
    </div>
  );
}
