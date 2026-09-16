// Local browser smoke test. Uses the installed Chrome/Edge executable; no Meta login,
// production API, real user session or database is contacted.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const browserPath = process.env.META_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const code = 'a'.repeat(64);
const callbackBodies = [];
const types = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.html': 'text/html' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/auth/meta/start') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ state: code, appId: '12345', configId: '67890', graphVersion: 'v25.0', callbackUrl: 'http://' + req.headers.host + '/auth/meta/callback' }));
      return;
    }
    if (url.pathname === '/auth/meta/callback' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      callbackBodies.push(Object.fromEntries(new URLSearchParams(body)));
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><h1>Callback received</h1>');
      return;
    }
    if (url.pathname.startsWith('/meta/deletion-status/')) {
      res.setHeader('Content-Type', 'application/json');
      const found = url.pathname.endsWith('/' + code);
      res.statusCode = found ? 200 : 404;
      res.end(JSON.stringify(found ? { confirmationCode: code, status: 'completed', completedAt: '2026-09-09T00:00:00Z' } : { message: 'Deletion reference not found or expired' }));
      return;
    }
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path.relative(root, file).startsWith('..')) { res.writeHead(403).end(); return; }
    if (!await stat(file).then((s) => s.isFile()).catch(() => false)) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(500).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const profile = await mkdtemp(path.join(tmpdir(), 'gobook-meta-browser-'));
const chrome = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
{ windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser startup timed out')), 20000);
    chrome.once('error', (error) => { clearTimeout(timer); reject(error); });
    chrome.stderr.on('data', (chunk) => { const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const result = JSON.parse(event.data);
    if (!result.id) return;
    const request = pending.get(result.id); if (!request) return;
    pending.delete(result.id);
    clearTimeout(request.timer);
    if (result.error) request.reject(new Error(result.error.message)); else request.resolve(result.result);
  });
  function send(method, params = {}, sessionId) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timed out: ' + method)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Network.enable', {}, sessionId);
  // These tests must not contact the production backend or third-party SDKs.
  await send('Network.setBlockedURLs', { urls: ['https://*', 'http://localhost:5000/*'] }, sessionId);
  for (const viewport of [{ width: 1440, height: 1000, mobile: false }, { width: 390, height: 844, mobile: true }]) {
    await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 }, sessionId);
    for (const [route, heading, expected] of [
      ['/privacy-policy', 'Privacy Policy', 'Meta Platform and WhatsApp Business Data'],
      ['/terms', 'Terms & Conditions', 'WhatsApp Business Integration and Messaging'],
      ['/data-deletion', 'Delete Meta and WhatsApp connection data', 'support.gobook@gmail.com'],
      ['/data-deletion-status/' + code, 'Data deletion status', 'Status: Completed'],
      ['/data-deletion-status/unknown', 'Data deletion status', 'Deletion reference not found or expired'],
    ]) {
      await send('Page.navigate', { url: origin + route }, sessionId);
      let result;
      for (let tries = 0; tries < 40; tries += 1) {
        const snapshot = await send('Runtime.evaluate', { expression: 'JSON.stringify({heading: document.querySelector("h1")?.textContent, text: document.body.innerText, overflow: document.documentElement.scrollWidth > innerWidth, route: location.pathname})', returnByValue: true }, sessionId);
        result = JSON.parse(snapshot.result.value);
        if (result.heading === heading && result.text.includes(expected)) break;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      assert.equal(result.heading, heading, route);
      assert.ok(result.text.includes(expected), 'Missing content: ' + route);
      assert.equal(result.route, route, 'Unexpected login redirect');
      assert.equal(result.overflow, false, 'Horizontal overflow at ' + viewport.width + ': ' + route);
      console.log('PASS ' + viewport.width + 'px ' + route);
    }
  }
  // Isolated owner session and SDK/API fixtures for the connection UI.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const fixtureOwner = { id: 'test-owner', name: 'Browser test', email: 'test@example.invalid',
      accountType: 'owner', role: 'Super Admin', businessId: 'test-business', category: 'retail',
      status: 'Active', onboardingCompleted: true, subscriptionStatus: 'active' };
    localStorage.setItem('gobook.token', 'isolated-browser-fixture');
    localStorage.setItem('gobook.user', JSON.stringify(fixtureOwner));
    const originalFetch = window.fetch;
    window.fetch = function(input, options) {
      const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
      if (url.pathname.startsWith('/api/')) {
        const data = url.pathname === '/api/auth/me' ? fixtureOwner :
          url.pathname === '/api/meta/connection' ? { configured: true, connection: null } :
          { profile: null, profiles: [], groups: [], messages: [], campaigns: [], templates: [], usage: [], totals: {}, notifications: [], data: [] };
        return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch(input, options);
    };
    window.FB = { init() {}, login(callback) { window.fixtureMetaCallback = callback; } };
  ` }, sessionId);
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error('Browser fixture script failed');
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Browser condition timed out: ' + expression);
  }
  for (const [width, height, codeFirst] of [[1440, 1000, true], [390, 844, false]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, mobile: width < 500, deviceScaleFactor: 1 }, sessionId);
    await send('Page.navigate', { url: origin + '/whatsapp/settings' }, sessionId);
    await waitFor('Array.from(document.querySelectorAll("button")).some(b => b.textContent === "Prepare secure connection")');
    await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Prepare secure connection").click()');
    await waitFor('Array.from(document.querySelectorAll("button")).some(b => b.textContent === "Connect WhatsApp Business")');
    await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Connect WhatsApp Business").click()');
    await waitFor('typeof window.fixtureMetaCallback === "function"');
    const before = callbackBodies.length;
    const finish = { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { waba_id: '111', phone_number_id: '222' } };
    await evaluate('window.dispatchEvent(new MessageEvent("message", {origin: "https://facebook.com.evil.example", data: ' + JSON.stringify(finish) + '}))');
    if (codeFirst) await evaluate('window.fixtureMetaCallback({authResponse: {code: "fixture-code"}})');
    assert.equal(callbackBodies.length, before, 'Untrusted message must not complete signup');
    await evaluate('window.dispatchEvent(new MessageEvent("message", {origin: "https://www.facebook.com", data: ' + JSON.stringify(finish) + '}))');
    if (!codeFirst) await evaluate('window.fixtureMetaCallback({authResponse: {code: "fixture-code"}})');
    await waitFor('document.querySelector("h1")?.textContent === "Callback received"');
    assert.deepEqual(callbackBodies.at(-1), { state: code, code: 'fixture-code', waba_id: '111', phone_number_id: '222' });
    assert.equal(await evaluate('location.search'), '', 'Code must not be submitted in the URL');
    console.log('PASS ' + width + 'px connection UI, trusted message origin, ' + (codeFirst ? 'code-first' : 'FINISH-first') + ' ordering and POST callback');
  }
  await send('Browser.close').catch(() => {});
} finally {
  ws?.close(); chrome.kill();
  await new Promise((resolve) => server.close(resolve));
}
