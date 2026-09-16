import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const localBrowsers = fileURLToPath(new URL('../../.playwright', import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}
let browserPromise;
let active = 0;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import('playwright').then(({ chromium }) => chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
    })).then((browser) => {
      browser.on('disconnected', () => { browserPromise = null; });
      return browser;
    }).catch((error) => { browserPromise = null; throw error; });
  }
  return browserPromise;
}

export async function closeInvoicePdfBrowser() {
  if (browserPromise) await (await browserPromise).close();
}

export async function generateInvoicePdf({ html, css, format }) {
  if (typeof html !== 'string' || typeof css !== 'string' || !['a4', 'thermal80'].includes(format)
      || html.length > 6_000_000 || css.length > 1_000_000) {
    throw Object.assign(new Error('Invalid invoice document.'), { status: 400 });
  }
  if (active >= 4) throw Object.assign(new Error('Invoice renderer is busy. Please retry shortly.'), { status: 503 });
  active += 1;
  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    // Submitted documents cannot execute scripts or access files, internal services, or the internet.
    await context.route('**/*', (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    await page.emulateMedia({ media: 'screen' });
    // Inline styles during parsing: addStyleTag waits for events that are disabled in a script-free context.
    await page.setContent(`<html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body>${html}</body></html>`, { timeout: 20_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (img) => img.decode()));
    });
    const thermal = format === 'thermal80';
    if (!thermal) {
      await page.evaluate(() => {
        const invoice = document.querySelector('.erp-invoice-page');
        const footer = invoice?.querySelector('.erp-footer-bar');
        const filler = invoice?.querySelector('.erp-filler-row td');
        if (!invoice || !footer || !filler) return;
        // For a single A4 page, put remaining space inside the product table.
        // Measure after fonts and images load so optional sections are accounted for.
        const pageBottom = invoice.getBoundingClientRect().top + 297 * 96 / 25.4;
        const bottomPadding = parseFloat(getComputedStyle(invoice).paddingBottom) || 0;
        const remaining = pageBottom - bottomPadding - footer.getBoundingClientRect().bottom - 1;
        if (remaining > 0) {
          filler.style.height = `${filler.getBoundingClientRect().height + remaining}px`;
        }
      });
    }
    const height = thermal ? await page.locator('.erp-receipt-page').evaluate((el) => Math.ceil(el.getBoundingClientRect().height * 25.4 / 96 * 100) / 100) : 297;
    if (height > 5000) throw Object.assign(new Error('Receipt is too long. Use A4 for this invoice.'), { status: 400 });
    return await page.pdf({
      width: thermal ? '80mm' : '210mm', height: `${Math.max(1, height)}mm`,
      printBackground: true, displayHeaderFooter: false, preferCSSPageSize: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }, timeout: 20_000,
    });
  } finally {
    try { if (context) await context.close(); } finally { active -= 1; }
  }
}

export async function invoicePdfHandler(req, res) {
  try {
    const pdf = await generateInvoicePdf(req.body || {});
    res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="Invoice.pdf"' }).send(pdf);
  } catch (error) {
    if (!error.status) console.error('Invoice PDF generation failed:', error.message);
    res.status(error.status || 503).json({ message: error.status ? error.message : 'Unable to prepare invoice PDF. Check that the server has Playwright Chromium installed, then retry.' });
  }
}
