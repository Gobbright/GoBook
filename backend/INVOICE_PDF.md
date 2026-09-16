# Invoice PDF rendering

Retail documents using `DocumentPreviewModal` generate a PDF through the authenticated
`POST /api/documents/pdf` endpoint. The light PDF.js preview, Download button, and Print
button reuse that PDF. Other hotel/finance PDF exporters are separate integrations.

## Deployment

After installing backend dependencies, run:

```sh
npm run install:invoice-browser
```

On Linux, install Chromium system dependencies as part of the server/container build:

```sh
npm run install:invoice-browser -- --with-deps
```

The installer defaults to `backend/.playwright`. Deploy that directory or run the
installer on the host, then restart the backend. The server needs permission to
launch Chromium and write temporary files. A persistent Node server/container is
recommended. Install fonts covering any languages used in your invoices on the host.

Optional environment variables:

- `PLAYWRIGHT_BROWSERS_PATH`: shared browser installation directory, used by both installer and service.
- `PLAYWRIGHT_EXECUTABLE_PATH`: explicit compatible Chromium executable.

The browser is reused between requests, with a fresh isolated context for each
document, at most four concurrent renders, and no PDF storage on the server. The
client embeds invoice images; scripts and outgoing renderer requests are blocked.
Failures are shown with Retry instead of silently downloading an image fallback.

## Layout ownership

`frontend/src/features/categories/retail/modules/sales/shared/invoiceDocument.css`
contains the invoice template styles. `invoicePdf.js` adds document-only pagination
rules. Make future PDF layout changes there, rather than in application print CSS.
React still constructs invoice content, but PDF.js displays the generated PDF on a light canvas with zoom and page navigation. A separate offscreen PDF iframe is used only for printing.

A4 uses 210 × 297 mm pages, repeated item headers, and flowing content. Thermal
receipts use 80 mm width and measured content height. No pages are deleted or cropped
to force a one-page result. The PDF viewer reports the actual page count.

For physical output, configure the printer driver for the matching paper width and
100%/actual-size printing. Browser zoom changes preview display size, not PDF fonts.
The browser still controls the print dialog; silent printing requires separate
printer/kiosk configuration.

## Verification

Start the frontend on port 5199, then run:

```sh
cd frontend
npm run dev -- --host 127.0.0.1 --port 5199
# In another terminal:
cd backend
node scripts/verifyInvoicePdf.mjs
```

The check mounts the real React template with synthetic data, routes PDF requests
through the real renderer, parses output with PDF.js, checks A4/thermal dimensions,
multi-page content and repeated headers, and compares repeated downloads to the
preview bytes. The native print dialog is stubbed to verify that the PDF frame,
rather than the app window, receives the print call (headless Chromium's native
PDF dialog is not a physical-printer test). Artifacts are saved under
`backend/.playwright-output/invoices`.
No production records or credentials are used. Physical printer output still needs
checking on the intended printer.

