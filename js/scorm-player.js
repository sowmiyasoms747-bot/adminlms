/* ==========================================================
   SCORM preview player (runs inside scorm-player.html).
   - Receives the package bytes from the Admin page by postMessage only.
   - Re-validates the package, extracts it into Cache Storage and serves it
     through scorm-sw.js under ./scorm-content/<attemptId>/.
   - Exposes window.API (SCORM 1.2) or window.API_1484_11 (SCORM 2004) for
     a staff preview attempt and reports runtime calls back to the Admin.
   It never reads or writes student data.
   ========================================================== */
(function () {
  const CACHE = 'lu-scorm-preview';
  const status = document.getElementById('status');
  const adminOrigin = new URLSearchParams(location.search).get('admin');
  let current = null;

  const show = (msg, err) => { status.textContent = msg; status.className = err ? 'err' : ''; status.hidden = false; };
  if (window.parent === window || !adminOrigin) { show('This player only runs inside the Admin content preview.', true); return; }
  const post = (msg) => window.parent.postMessage(msg, adminOrigin);

  const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');
  const base = (attemptId) => new URL(`scorm-content/${attemptId}/`, location.href);

  async function clearCache() {
    const cache = await caches.open(CACHE);
    await Promise.all((await cache.keys()).map((k) => cache.delete(k)));
  }

  async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) throw new Error('This browser does not allow service workers here, so the package cannot be served for preview.');
    const reg = await navigator.serviceWorker.register('scorm-sw.js', { scope: './scorm-content/' });
    if (reg.active) return;
    const sw = reg.installing || reg.waiting;
    await new Promise((resolve, reject) => {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve();
        if (sw.state === 'redundant') reject(new Error('The preview service worker failed to install.'));
      });
    });
  }

  async function load({ attemptId, zip }) {
    if (!/^[\w-]{1,80}$/.test(attemptId || '')) throw new Error('Invalid attempt id.');
    show('Validating package…');
    const report = await Scorm.inspectPackage(zip);
    if (!report.ok) throw new Error(report.errors.map((e) => e.message).join(' '));
    show('Preparing package files…');
    await clearCache();
    const dir = Scorm.readZipDirectory(zip), root = base(attemptId), cache = await caches.open(CACHE);
    for (const path of dir.entries.keys()) {
      const bytes = await Scorm.readEntry(dir, path);
      await cache.put(new URL(encodePath(path), root).href, new Response(new Blob([bytes]), {
        headers: { 'Content-Type': Scorm.mimeType(path), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
      }));
    }
    await ensureServiceWorker();

    // Fresh runtime per staff attempt; events go to the Admin preview panel only.
    const runtime = Scorm.createRuntime(report.version, {
      learnerId: 'staff-preview', learnerName: 'Preview, Staff', masteryScore: report.masteryScore,
      onEvent: (ev) => post({ type: 'lu-runtime', attemptId, call: ev.call, element: ev.element, value: ev.value, tracking: ev.tracking }),
    });
    delete window.API; delete window.API_1484_11;
    if (report.version === '1.2') window.API = runtime.api; else window.API_1484_11 = runtime.api;

    const frame = document.createElement('iframe');
    frame.title = report.title || 'SCORM module';
    frame.src = new URL(encodePath(report.launchPath), root).href + report.launchQuery;
    document.querySelectorAll('iframe').forEach((f) => f.remove());
    status.hidden = true;
    document.body.appendChild(frame);
    current = { attemptId, runtime };
    post({ type: 'lu-preview-started', attemptId, version: report.version, launch: report.launchPath });
  }

  async function end() {
    document.querySelectorAll('iframe').forEach((f) => f.remove());
    delete window.API; delete window.API_1484_11;
    current = null;
    await clearCache();
    show('Preview ended.');
  }

  window.addEventListener('message', async (e) => {
    if (e.source !== window.parent || e.origin !== adminOrigin) return;
    const d = e.data || {};
    try {
      if (d.type === 'lu-preview-load') await load(d);
      else if (d.type === 'lu-preview-end') await end();
    } catch (err) {
      show(err.message, true);
      post({ type: 'lu-preview-error', attemptId: d.attemptId, message: err.message });
    }
  });
  window.addEventListener('pagehide', () => { if (current) clearCache(); });
  post({ type: 'lu-player-ready' });
})();
