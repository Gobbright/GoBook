// Run with the frontend dev server on 127.0.0.1:5199.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { generateInvoicePdf, closeInvoicePdfBrowser } from '../src/services/invoicePdf.js';
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--disable-features=LocalNetworkAccessChecks'] });
const artifacts = new URL('../.playwright-output/invoices/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()); });
let requests = 0;
let lastPdf;
let lastDocument;
await page.route('**/documents/pdf', async (route) => {
  requests += 1;
  lastDocument = route.request().postDataJSON();
  try {
    lastPdf = await generateInvoicePdf(lastDocument);
    await route.fulfill({ contentType: 'application/pdf', body: lastPdf, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: error.message }), headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});
await page.route('**/__invoice_test', (route) => route.fulfill({ contentType: 'text/html', body: `
  <html><body><div id="root"></div><script type="module">
  import RefreshRuntime from '/@react-refresh';
  RefreshRuntime.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;
  window.__vite_plugin_react_preamble_installed__ = true;
  const React = (await import('/node_modules/.vite/deps/react.js')).default;
  const {createRoot} = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const {DocumentPreviewModal} = await import('/src/features/categories/retail/modules/sales/shared/DocumentPreviewModal.jsx');
  const root = createRoot(document.getElementById('root'));
  window.renderInvoice = (props) => root.render(React.createElement(DocumentPreviewModal, props));
  </script></body></html>` }));
await page.route('**/__pdfjs/*', async (route) => {
  const name = new URL(route.request().url()).pathname.split('/').pop();
  assert.ok(['pdf.mjs', 'pdf.worker.mjs'].includes(name));
  await route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL(`../node_modules/pdfjs-dist/build/${name}`, import.meta.url)) });
});
await page.route('**/test-invoice-logo.svg', (route) => route.fulfill({
  contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' },
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#ef151e"/><text x="20" y="82" fill="white" font-family="Arial" font-size="85" font-weight="bold">G</text></svg>',
}));

const base = {
  embedded: true, invoiceNumber: 'INV-0024', config: { documentType: 'invoice' },
  docMeta: { number: 'INV-0024', date: '2026-09-08T00:00:00Z' },
  customer: { name: 'Jayaraj Karz', address: '152/2 Madurai main Road, Panjapur', city: 'Trichy', state: 'Tamil Nadu', gstin: '33AAFFJ5244G1L2' },
  bizSettings: { businessName: 'GOBRIGHT', address: 'Paradise Towers Complex, No. 52/B, First Floor, Tennur', city: 'Trichy', state: 'Tamil Nadu', pincode: '620017', phone: '89255 50774', gstin: '33OVRPS4200L1ZX', invoiceShowPaymentQr: false, invoiceShowSignature: false, invoiceShowBankDetails: false, invoiceShowAmountWords: false },
  items: [{ id: '1', description: 'A5 Flayer', qty: 2000, rate: 3.5, gstRate: 18 }],
  totals: { taxable: 7000, finalTotal: 8260 },
  notes: 'Thank you for your business! Payment should be made within the due date.',
};

try {
  await page.goto('http://127.0.0.1:5199/__invoice_test');
  await page.waitForFunction(() => !!window.renderInvoice);
  for (const scenario of ['thermal80', 'a4', 'zero-a4', 'interstate-a4', 'full-a4', 'long-a4']) {
    const props = structuredClone(base);
    props.bizSettings.invoicePrintFormat = scenario === 'thermal80' ? 'thermal80' : 'a4';
    props.bizSettings.logoUrl = '/test-invoice-logo.svg';
    if (scenario === 'zero-a4') { props.items = [{ description: 'Zero tax item', qty: 1, rate: 1050, gstRate: 0 }]; props.totals = { taxable: 1050, finalTotal: 1050 }; }
    if (scenario === 'interstate-a4') props.supplyType = 'interstate';
    if (scenario === 'full-a4') {
      Object.assign(props.bizSettings, { invoiceShowPaymentQr: true, invoiceShowBankDetails: true, invoiceShowAmountWords: true, bankName: 'HDFC', accountHolderName: 'Gobright', accountNumber: '1234567890', ifscCode: 'HDFC0000001' });
      props.terms = 'Payment due within 30 days.\nGoods once sold cannot be returned.';
    }
    if (scenario === 'long-a4') {
      props.items = Array.from({ length: 90 }, (_, i) => ({ ...base.items[0], id: String(i), description: `Product ${i + 1} with a long description that wraps across lines`, qty: 1, rate: 100 }));
      props.totals = { taxable: 9000, finalTotal: 10620 };
      props.notes = 'Final invoice note: END-OF-INVOICE';
    }
    await page.evaluate((props) => window.renderInvoice(props), props);
    await page.waitForFunction(() => !!document.querySelector('iframe[title="Invoice PDF print document"]'), null, { timeout: 60_000 });
    await page.waitForFunction(() => document.querySelector('.invoice-preview-viewport')?.getAttribute('aria-busy') === 'false');
    await page.locator('.invoice-preview').screenshot({ path: fileURLToPath(new URL(`${scenario}-preview.png`, artifacts)) });
    const initialWidth = await page.locator('.invoice-preview-paper canvas').evaluate((canvas) => canvas.getBoundingClientRect().width);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.waitForFunction((initialWidth) => document.querySelector('.invoice-preview-paper canvas')?.getBoundingClientRect().width > initialWidth, initialWidth);
    await page.getByRole('button', { name: 'Fit invoice', exact: true }).click();
    if (scenario === 'long-a4') {
      await page.getByRole('button', { name: 'Next page', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.invoice-preview-pagination').textContent.includes('Page 2'));
      await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    }
    assert.ok(lastPdf.subarray(0, 5).toString() === '%PDF-');
    await writeFile(new URL(`${scenario}.pdf`, artifacts), lastPdf);
    const inspection = await page.evaluate(async (bytes) => {
      const { getDocument, GlobalWorkerOptions } = await import('/__pdfjs/pdf.mjs');
      GlobalWorkerOptions.workerSrc = '/__pdfjs/pdf.worker.mjs';
      const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const text = await p.getTextContent();
        pages.push({ width: p.view[2], height: p.view[3], text: text.items.map((x) => x.str).join(' ') });
      }
      const first = await pdf.getPage(1);
      const viewport = first.getViewport({ scale: 1.5 });
      document.querySelector('#pdf-test-canvas')?.remove();
      const canvas = document.createElement('canvas');
      canvas.id = 'pdf-test-canvas'; canvas.width = viewport.width; canvas.height = viewport.height;
      document.body.append(canvas);
      await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return pages;
    }, [...lastPdf]);
    assert.ok(inspection[0].text.includes('GOBRIGHT'));
    if (scenario !== 'thermal80') {
      const summary = await page.locator('.erp-tax-summary tbody tr').allTextContents();
      assert.ok(inspection.some((p) => p.text.includes('TAX SUMMARY')));
      if (scenario === 'zero-a4') assert.deepEqual(summary, ['0%1,050.000.000.000.00']);
      if (scenario === 'interstate-a4') assert.deepEqual(summary, ['18%7,000.000.000.001,260.00']);
      if (scenario === 'a4') assert.deepEqual(summary, ['18%7,000.00630.00630.001,260.00']);
    }
    assert.ok(!inspection.some((p) => p.text.includes('Settings') || p.text.includes('Home')));
    assert.ok(Math.abs(inspection[0].width - (scenario === 'thermal80' ? 80 : 210) * 72 / 25.4) < 1);
    if (scenario === 'long-a4') {
      assert.ok(inspection.length > 1);
      assert.ok(inspection.at(-1).text.includes('END-OF-INVOICE'));
      assert.ok(inspection.flatMap((p) => p.text).join(' ').includes('Product 90'.toUpperCase()));
      assert.ok(inspection[1].text.includes('Description Of Goods'));
    } else assert.equal(inspection.length, 1, `${scenario} should fit one page`);
    await page.locator('#pdf-test-canvas').screenshot({ path: fileURLToPath(new URL(`${scenario}.png`, artifacts)) });
    // Download must reuse exactly the bytes displayed by the preview, including repeat clicks.
    const before = requests;
    const expected = Buffer.from(lastPdf);
    for (let i = 0; i < 2; i++) {
      const downloading = page.waitForEvent('download');
      await page.evaluate((props) => window.renderInvoice({ ...props, downloadAsPdf: true }), props);
      const download = await downloading;
      assert.deepEqual(await readFile(await download.path()), expected);
      await page.evaluate((props) => window.renderInvoice({ ...props, downloadAsPdf: false }), props);
      await page.waitForTimeout(100);
    }
    assert.equal(requests, before, 'Download must not generate another PDF');
    // Print is directed at the PDF iframe; it must never print the application document.
    // Stub the native dialog: Chromium's headless PDF print dialog can crash its renderer.
    // Verify the real component invokes the PDF frame, not window.print on the app.
    await page.evaluate(() => {
      window.__pdfPrints = 0;
      window.print = () => { throw new Error('Application page must not be printed'); };
      document.querySelector('iframe').contentWindow.print = () => { window.__pdfPrints += 1; };
    });
    await page.evaluate((props) => window.renderInvoice({ ...props, printInvoice: true }), props);
    await page.waitForTimeout(600);
    assert.equal(await page.locator('[role="alert"]').count(), 0, 'PDF print should not throw');
    assert.equal(await page.evaluate(() => window.__pdfPrints), 1);
    assert.equal(requests, before, 'Print must reuse the preview PDF');
    await page.evaluate((props) => window.renderInvoice({ ...props, printInvoice: false }), props);
    await page.getByRole('button', { name: 'Print', exact: true }).click();
    await page.waitForFunction(() => window.__pdfPrints === 2);
    const toolbarDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    assert.deepEqual(await readFile(await (await toolbarDownload).path()), expected);
    assert.equal(requests, before, 'Toolbar actions must reuse the preview PDF');
    console.log(`${scenario}: ${inspection.length} page(s); correct dimensions; selectable text; two identical downloads; isolated print`);
    // Save HTML for inspecting geometry without the application's styles.
    await writeFile(new URL(`${scenario}.html`, artifacts), `<style>${lastDocument.css}</style>${lastDocument.html}`);
  }
  assert.deepEqual(errors, []);
  await assert.rejects(generateInvoicePdf({ html: '', css: '', format: 'invalid' }), /Invalid invoice/);
  await assert.rejects(generateInvoicePdf({ html: '<section class="erp-receipt-page"><img src="http://127.0.0.1:5199/private-image"></section>', css: '', format: 'thermal80' }));
} catch (error) {
  console.error(await page.locator('body').innerText().catch(() => 'Page unavailable'));
  throw error;
} finally {
  await browser.close();
  await closeInvoicePdfBrowser();
}

