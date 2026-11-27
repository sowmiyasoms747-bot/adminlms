/* Zero-dependency browser harness: static servers + Chrome DevTools Protocol client.
   Admin is served on http://localhost:<a>, the SCORM player on http://127.0.0.1:<b> (a different
   origin), so previews run cross-origin exactly as a separate player origin would in production. */
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.zip': 'application/zip' };

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });

function staticServer(host, port, overrides = {}) {
  const server = http.createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (overrides[path]) { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(overrides[path]); }
    const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((r) => server.listen(port, host, () => r(server)));
}

export async function startServers({ sameOrigin = false } = {}) {
  const [ap, pp] = [await freePort(), await freePort()];
  const playerOrigin = sameOrigin ? '' : `http://127.0.0.1:${pp}`;
  const admin = await staticServer('localhost', ap, { '/js/config.js': `window.LU_CONFIG = { scormPlayerOrigin: '${playerOrigin}' };` });
  const player = await staticServer('127.0.0.1', pp);
  return { adminUrl: `http://localhost:${ap}/`, playerOrigin, close: () => Promise.all([admin, player].map((s) => new Promise((r) => s.close(r)))) };
}

function findChrome() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  return c.find((p) => existsSync(p));
}

export async function launchBrowser() {
  const exe = findChrome();
  if (!exe) throw new Error('Chrome/Edge not found. Set CHROME_PATH to run the browser tests.');
  const port = await freePort(), profile = await mkdtemp(join(tmpdir(), 'lu-e2e-'));
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(), listeners = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(`${m.error.message} ${m.error.data || ''}`)) : res(m.result); }
    else listeners.forEach((l) => l(m));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (method, params) => send(method, params, sessionId);
  await S('Page.enable'); await S('Runtime.enable'); await S('DOM.enable'); await S('Accessibility.enable');
  const errors = [];
  listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });

  const page = {
    errors,
    async goto(url) { await S('Page.navigate', { url }); await page.waitFor('document.readyState === "complete" && !!document.querySelector("#view")'); },
    async eval(expr) {
      const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}\n${expr}`);
      return r.result.value;
    },
    async waitFor(expr, timeout = 10000) {
      const t0 = Date.now();
      for (;;) {
        let v; try { v = await page.eval(expr); } catch { v = false; }
        if (v) return v;
        if (Date.now() - t0 > timeout) throw new Error(`Timed out waiting for: ${expr}`);
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    async node(selector) {
      const { root } = await S('DOM.getDocument', { depth: 0 });
      const { nodeId } = await S('DOM.querySelector', { nodeId: root.nodeId, selector });
      if (!nodeId) throw new Error(`No node for ${selector}`);
      return nodeId;
    },
    async setFiles(selector, files) { await S('DOM.setFileInputFiles', { nodeId: await page.node(selector), files }); },
    /** Computed accessibility node (name/role/description) from Chrome's accessibility tree. */
    async ax(selector) {
      const { nodes } = await S('Accessibility.getPartialAXTree', { nodeId: await page.node(selector), fetchRelatives: false });
      const n = nodes[0] || {};
      const prop = (k) => (n.properties || []).find((p) => p.name === k)?.value?.value;
      return { role: n.role?.value, name: n.name?.value, description: n.description?.value || '', invalid: prop('invalid'), required: prop('required'), checked: prop('checked') };
    },
    async screenshot(path) {
      const { data } = await S('Page.captureScreenshot', { format: 'png' });
      await (await import('node:fs/promises')).writeFile(path, Buffer.from(data, 'base64'));
    },
    async key(key, opts = {}) {
      const codes = { Tab: 9, Enter: 13, ' ': 32, Space: 32 };
      const base = { key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: codes[key] || 0, modifiers: opts.shift ? 8 : 0 };
      await S('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(key === ' ' ? { text: ' ' } : {}) });
      await S('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
  };
  return { page, async close() { try { ws.close(); } catch {} proc.kill(); await new Promise((r) => setTimeout(r, 300)); await rm(profile, { recursive: true, force: true }).catch(() => {}); } };
}
