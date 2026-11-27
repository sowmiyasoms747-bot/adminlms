// Browser regression tests for ADM-01, ADM-02 and ADM-03 (real Chrome, real SCORM packages).
// Run: npm run test:e2e   (needs Chrome or Edge; set CHROME_PATH if it is not in a standard location)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startServers, launchBrowser } from './harness.mjs';
import { PACKAGES } from '../fixtures/packages.mjs';

let servers, browser, page, dir;
const file = (n) => join(dir, n);
// Always leave the route first so every test starts from a freshly rendered page.
const go = async (route, ready) => {
  await page.eval(`location.hash = '#/dashboard'`); await page.waitFor(`location.hash === '#/dashboard' && !document.querySelector('#uploadForm')`);
  await page.eval(`location.hash = '#/${route}'`); await page.waitFor(ready);
};
const pick = (sel, value) => page.eval(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`);
const stored = () => page.eval(`JSON.parse(localStorage.getItem('lu.admin.state.v2'))`);
const materialByTitle = async (t) => (await stored()).materials.find((m) => m.title === t);
const optionTexts = (sel) => page.eval(`[...document.querySelectorAll(${JSON.stringify(sel + ' option')})].map((o) => o.textContent)`);

async function upload({ title, classId, streamId, sections = [], subject, type, path, vis = 'Published' }) {
  await go('content/upload', `!!document.querySelector('#uploadForm')`);
  await page.eval(`document.querySelector('#up-title').value = ${JSON.stringify(title)}`);
  await pick('#up-class', classId);
  if (streamId !== undefined) await pick('#up-stream', streamId);
  for (const s of sections) await page.eval(`(() => { const i = document.querySelector('#up-sections-list input[value="${s}"]'); i.click(); })()`);
  if (subject) await pick('#up-subject', subject);
  await pick('#up-type', type);
  if (path) await page.setFiles('#up-file', [path]);
  if (type === 'SCORM' && path) await page.waitFor(`!!document.querySelector('#pkgReport .pkg-report')`);
  await page.eval(`document.querySelector('#vis input[value="${vis}"]').click()`);
  await page.eval(`document.querySelector('#uploadBtn').click()`);
}

test.before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lu-fixtures-'));
  for (const [n, make] of Object.entries(PACKAGES)) await writeFile(file(n), make());
  await writeFile(file('notes.pdf'), '%PDF-1.4\n% QA fixture\n');
  await writeFile(file('lecture.mp4'), Buffer.alloc(2048));
  await writeFile(file('worksheet.docx'), Buffer.from('PK QA fixture'));
  servers = await startServers();
  browser = await launchBrowser();
  page = browser.page;
  await page.goto(servers.adminUrl);
  await page.eval(`localStorage.clear(); new Promise((r) => { const q = indexedDB.deleteDatabase('lu-admin'); q.onsuccess = q.onerror = q.onblocked = r; })`);
  await page.goto(servers.adminUrl + '#/dashboard');
});
test.after(async () => { await browser?.close(); await servers?.close(); if (dir) await rm(dir, { recursive: true, force: true }); });

/* ---------------- ADM-01 ---------------- */
test('ADM-01: Academic Setup, Classes, Create Class and Upload share the Classes 1–12 catalog', async () => {
  const expected = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
  await go('academic', `!!document.querySelector('[data-ac="classes"]')`);
  assert.equal(await page.eval(`document.querySelector('[data-ac="classes"] p').textContent`), '(Class 1 – 12)');
  await go('academic/classes', `!!document.querySelector('.tbl')`);
  const shown = await page.eval(`[...new Set([...document.querySelectorAll('.tbl tbody td.name')].map((t) => t.textContent))]`);
  assert.deepEqual(shown, expected);
  await go('academic/create-class', `!!document.querySelector('#cc-class')`);
  assert.deepEqual(await optionTexts('#cc-class'), expected);
  await go('content/upload', `!!document.querySelector('#up-class')`);
  assert.deepEqual(await optionTexts('#up-class'), expected);
  await go('reports', `!!document.querySelector('#rCls')`);
  assert.deepEqual(await optionTexts('#rCls'), expected);
});

test('ADM-01: existing Classes 6–12 records and materials are preserved by the migration', async () => {
  const s = await stored();
  assert.equal(s.classes.length, 18, 'original 18 class–section rows');
  assert.ok(s.classes.every((c) => c.classId && c.id && c.teacher && c.subjects.length));
  assert.equal(s.materials.length, 12, 'original 12 materials');
  const ec = s.materials.find((m) => m.title === 'Electric Charges – SCORM');
  assert.equal(ec.status, 'Published');
  assert.deepEqual([ec.audience.classId, ec.audience.subjectId, ec.audience.streamId], ['class-12', 'subj-physics', null]);
  // Migration reruns on every load and must not change anything.
  await page.goto(servers.adminUrl + '#/content');
  assert.deepEqual(await stored(), s);
});

test('ADM-01: Class 3 hides stream, filters subjects/sections, and publishes without a stream', async () => {
  // Add Class 3 sections A and B through the normal Create Class workflow.
  for (const sec of ['A', 'B']) {
    await go('academic/create-class?cls=3', `!!document.querySelector('#cc-class')`);
    assert.equal(await page.eval(`document.querySelector('#cc-class').value`), 'Class 3');
    await pick('#cc-section', sec);
    await page.eval(`document.querySelector('#classForm button[type=submit]').click()`);
    await page.waitFor(`location.hash === '#/academic/classes'`);
  }
  await go('content/upload', `!!document.querySelector('#up-class')`);
  await pick('#up-class', 'class-3');
  assert.equal(await page.eval(`document.querySelector('#up-stream-wrap').hidden`), true, 'stream hidden for Primary');
  const subjects = await optionTexts('#up-subject');
  assert.ok(subjects.includes('English') && subjects.includes('Environmental Studies'));
  assert.ok(!subjects.includes('Physics'), 'Physics not offered in Class 3');
  assert.deepEqual(await page.eval(`[...document.querySelectorAll('#up-sections-list input')].map((i) => i.value)`), ['class-3-a', 'class-3-b']);

  await upload({ title: 'Plants Around Us', classId: 'class-3', sections: ['class-3-a'], subject: 'subj-environmental-studies', type: 'PDF', path: file('notes.pdf') });
  await page.waitFor(`location.hash === '#/content'`);
  const m = await materialByTitle('Plants Around Us');
  assert.equal(m.status, 'Published');
  assert.deepEqual(m.audience, { schoolId: 'school-lu', academicYearId: 'ay-2026-27', classId: 'class-3', sectionIds: ['class-3-a'], streamId: null, subjectId: 'subj-environmental-studies' });
  assert.match(await page.eval(`document.querySelector('#contentRows tr').textContent`), /Class 3.*Section A/);
});

test('ADM-01: Class 12 targeting with section and stream still works; invalid combos are blocked', async () => {
  await go('content/upload', `!!document.querySelector('#up-class')`);
  await pick('#up-class', 'class-12');
  assert.equal(await page.eval(`document.querySelector('#up-stream-wrap').hidden`), false);
  await pick('#up-stream', 'stream-commerce');
  assert.ok(!(await optionTexts('#up-subject')).includes('Physics'), 'subjects filtered by stream');
  await upload({ title: 'Wave Optics Notes', classId: 'class-12', streamId: 'stream-science', sections: ['class-12-a'], subject: 'subj-physics', type: 'PDF', path: file('notes.pdf'), vis: 'Draft' });
  await page.waitFor(`location.hash === '#/content'`);
  const m = await materialByTitle('Wave Optics Notes');
  assert.deepEqual([m.status, m.audience.classId, m.audience.streamId, m.audience.sectionIds[0]], ['Draft', 'class-12', 'stream-science', 'class-12-a']);

  // Missing subject is reported on the field and nothing is saved.
  const before = (await stored()).materials.length;
  await upload({ title: 'No subject', classId: 'class-3', subject: '', type: 'PDF', path: file('notes.pdf') });
  await page.waitFor(`document.querySelector('#up-subject').getAttribute('aria-invalid') === 'true'`);
  const ax = await page.ax('#up-subject');
  assert.equal(ax.invalid, 'true');
  assert.match(ax.description, /Select a subject/);
  assert.equal((await stored()).materials.length, before);
});

/* ---------------- ADM-03 ---------------- */
test('ADM-03: upload controls and tracking toggles expose meaningful accessible names', async () => {
  await go('content/upload', `!!document.querySelector('#up-class')`);
  await pick('#up-class', 'class-12');
  await page.eval(`document.querySelector('#vis input[value="Scheduled"]').click()`);   // reveals the Publish on field
  const expectations = {
    '#up-title': ['textbox', 'Title'], '#up-year': ['combobox', 'Academic year'], '#up-class': ['combobox', 'Class'],
    '#up-stream': ['combobox', 'Stream'], '#up-subject': ['combobox', 'Subject'], '#up-type': ['combobox', 'Material type'],
    '#up-file': [null, 'File'], '#up-track-completion': ['switch', 'Track completion'], '#up-track-score': ['switch', 'Track score'],
    '#up-sections': ['group', 'Sections'], '#vis-set': ['group', 'Visibility'], '#trackingSet': ['group', 'Tracking'],
    '#up-when': ['textbox', 'Publish on'],
  };
  for (const [sel, [role, name]] of Object.entries(expectations)) {
    const ax = await page.ax(sel);
    assert.equal(ax.name, name, `${sel} name`);
    if (role) assert.ok(ax.role === role || (role === 'textbox' && /text|date/i.test(ax.role)), `${sel} role ${ax.role}`);
  }
  assert.match((await page.ax('#up-track-completion')).description, /completion and pass\/fail/);
  assert.match((await page.ax('#up-track-score')).description, /gradebook/);
  assert.match((await page.ax('#up-subject')).description, /offered for the selected class/);
  assert.match((await page.ax('#up-file')).description, /SCORM 1\.2 or SCORM 2004/);
  assert.equal((await page.ax('#up-track-completion')).checked, 'true');
});

test('ADM-03: keyboard reaches every upload control in order with a visible focus indicator', async () => {
  await go('content/upload', `!!document.querySelector('#up-class')`);
  await pick('#up-class', 'class-12');
  await page.eval(`document.querySelector('#up-title').focus()`);
  const seen = [];
  for (let i = 0; i < 40; i++) {
    await page.key('Tab');
    const info = await page.eval(`(() => { const a = document.activeElement; if (!a || a === document.body) return null;
      const target = a.closest('.switch') ? a.nextElementSibling : a.closest('.dropzone') || a;
      const cs = getComputedStyle(target); return { id: a.id || a.value || a.textContent.trim().slice(0, 20), vis: a.matches(':focus-visible'),
      ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none' }; })()`);
    if (!info) continue;
    seen.push(info);
    if (info.id === 'uploadBtn') break;
  }
  const ids = seen.map((s) => s.id);
  const order = ['up-year', 'up-class', 'up-stream', 'up-subject', 'class-12-a', 'up-type', 'up-file', 'up-desc', 'up-track-completion', 'up-track-score', 'uploadBtn'];
  let last = -1;
  for (const id of order) { const at = ids.indexOf(id); assert.ok(at > last, `${id} reachable after previous control (sequence: ${ids.join(' → ')})`); last = at; }
  for (const s of seen.filter((x) => order.includes(x.id))) assert.ok(s.vis && s.ring, `visible focus on ${s.id}`);
  // Space toggles a tracking switch from the keyboard.
  await page.eval(`document.querySelector('#up-track-score').focus()`);
  await page.key(' ');
  assert.equal(await page.eval(`document.querySelector('#up-track-score').checked`), false);
});

test('ADM-03: SCORM settings use version-neutral labels and persist', async () => {
  await go('settings', `!!document.querySelector('[data-set="scorm"]')`);
  await page.eval(`document.querySelector('[data-set="scorm"]').click()`);
  await page.waitFor(`!!document.querySelector('#scorm-sync-score')`);
  assert.equal((await page.ax('#scorm-track-completion')).name, 'Track completion');
  assert.equal((await page.ax('#scorm-sync-score')).name, 'Sync score to gradebook');
  assert.ok(!(await page.eval(`document.querySelector('.modal .toggle-row').textContent`)).includes('cmi.core'), 'no 1.2-only label');
  assert.match(await page.eval(`document.querySelector('.mapping').textContent`), /cmi\.core\.lesson_status[\s\S]*cmi\.completion_status[\s\S]*cmi\.success_status[\s\S]*cmi\.score\.scaled/);
  await page.eval(`document.querySelector('#scorm-new-window').click(); document.querySelector('#saveT').click()`);
  assert.equal((await stored()).scormSettings.openInNewWindow, true);
  await page.goto(servers.adminUrl + '#/settings');
  assert.deepEqual((await stored()).scormSettings, { trackCompletion: true, syncScore: true, allowReattempts: true, openInNewWindow: true });
});

/* ---------------- ADM-02 ---------------- */
for (const [name, code] of [['qa-invalid-not-a-zip.zip', /not a readable ZIP/], ['qa-invalid-no-manifest.zip', /imsmanifest\.xml was not found/],
  ['qa-invalid-nested-manifest.zip', /inside the folder/], ['qa-invalid-missing-launch.zip', /launch file "start\.html"/],
  ['qa-invalid-unsupported-version.zip', /"1\.1" is not supported/], ['qa-invalid-broken-xml.zip', /could not be read/]]) {
  test(`ADM-02: invalid package is reported and cannot be uploaded — ${name}`, async () => {
    const before = (await stored()).materials.length;
    await upload({ title: `Bad ${name}`, classId: 'class-12', subject: 'subj-physics', type: 'SCORM', path: file(name) });
    await page.waitFor(`document.querySelector('#up-file').getAttribute('aria-invalid') === 'true'`);
    assert.match(await page.eval(`document.querySelector('#pkgReport').textContent`), code);
    assert.match((await page.ax('#up-file')).description, /failed validation/);
    assert.equal(await page.eval(`location.hash`), '#/content/upload');
    assert.equal((await stored()).materials.length, before);
  });
}

test('ADM-02: legacy SCORM row without a file shows "Package file unavailable" and cannot launch', async () => {
  await go('content', `!!document.querySelector('#contentRows')`);
  const i = await page.eval(`(() => { const rows = [...document.querySelectorAll('#contentRows tr')]; const r = rows.find((tr) => tr.textContent.includes('Electric Charges – SCORM')); r.querySelector('[data-mview]').click(); return true; })()`);
  assert.ok(i);
  await page.waitFor(`!!document.querySelector('.pkg-section')`);
  assert.match(await page.eval(`document.querySelector('.pkg-section h4').textContent`), /Package file unavailable/);
  assert.match(await page.eval(`document.querySelector('.pkg-reason').textContent`), /Attach package/);
  assert.equal(await page.eval(`document.querySelector('#launchBtn').disabled`), true);
  assert.match((await page.ax('#launchBtn')).description, /no package file attached/);
  await page.eval(`document.querySelector('[data-close]').click()`);
});

for (const [name, label, version] of [['qa-scorm12-valid.zip', 'SCORM 1.2', '1.2'], ['qa-scorm2004-valid.zip', 'SCORM 2004 4th Edition', '2004']]) {
  test(`ADM-02: ${label} package validates, launches in an isolated player and does not touch student data`, async () => {
    const title = `QA ${label}`;
    await upload({ title, classId: 'class-12', streamId: 'stream-science', subject: 'subj-physics', type: 'SCORM', path: file(name), vis: 'Draft' });
    await page.waitFor(`location.hash === '#/content'`);
    const m = await materialByTitle(title);
    assert.deepEqual([m.package.status, m.package.version, m.tracking.trackCompletion], ['ready', version, true]);

    await page.eval(`[...document.querySelectorAll('#contentRows tr')].find((tr) => tr.textContent.includes(${JSON.stringify(title)})).querySelector('[data-mview]').click()`);
    await page.waitFor(`!!document.querySelector('.pkg-section')`);
    assert.match(await page.eval(`document.querySelector('.pkg-section').textContent`), new RegExp(`Ready[\\s\\S]*${label}`));
    assert.equal(await page.eval(`document.querySelector('#launchBtn').disabled`), false);

    const studentsBefore = await page.eval(`JSON.stringify(DB.students)`);
    const storageBefore = await page.eval(`JSON.stringify(Object.entries(localStorage))`);
    await page.eval(`document.querySelector('#launchBtn').click()`);
    await page.waitFor(`/Finished/.test(document.querySelector('#trkState')?.textContent || '')`, 20000);
    assert.equal(await page.eval(`document.querySelector('#trkCompletion').textContent`), 'completed');
    assert.equal(await page.eval(`document.querySelector('#trkSuccess').textContent`), 'passed');
    assert.match(await page.eval(`document.querySelector('#trkScore').textContent`), /^85%/);
    assert.match(await page.eval(`document.querySelector('#trkWould').textContent`), /Not recorded — staff preview/);
    // The package ran on the player origin: the Admin cannot reach into it, and it could not reach the Admin.
    assert.equal(await page.eval(`(() => { try { return !!document.querySelector('#playerFrame').contentWindow.document; } catch { return 'blocked'; } })()`), 'blocked');
    assert.equal(await page.eval(`new URL(document.querySelector('#playerFrame').src).origin`), servers.playerOrigin);
    // Preview attempt wrote nothing to student data or persisted Admin state.
    assert.equal(await page.eval(`JSON.stringify(DB.students)`), studentsBefore);
    assert.equal(await page.eval(`JSON.stringify(Object.entries(localStorage))`), storageBefore);
    await page.eval(`document.querySelector('.modal-foot [data-close]').click()`);
  });
}

test('ADM-02: a SCORM row cannot be published until a valid package is attached; Attach package fixes it', async () => {
  await go('content', `!!document.querySelector('#contentRows')`);
  const rowBtn = (t, sel) => `[...document.querySelectorAll('#contentRows tr')].find((tr) => tr.textContent.includes(${JSON.stringify(t)})).querySelector('${sel}')`;
  await page.eval(`${rowBtn('Periodic Table Explorer', '[data-mmore]')}.click()`);
  await page.waitFor(`!!document.querySelector('.pop-menu')`);
  await page.eval(`document.querySelector('.pop-menu [data-i="0"]').click()`);
  assert.equal((await materialByTitle('Periodic Table Explorer')).status, 'Draft');
  assert.match(await page.eval(`document.querySelector('#toastRoot').textContent`), /Attach a valid SCORM package/);

  await page.eval(`${rowBtn('Periodic Table Explorer', '[data-mview]')}.click()`);
  await page.waitFor(`!!document.querySelector('#attachPkg')`);
  await page.eval(`document.querySelector('#attachPkg').click()`);
  await page.waitFor(`!!document.querySelector('#ed-pkg')`);
  await page.setFiles('#ed-pkg', [file('qa-scorm2004-valid.zip')]);
  await page.waitFor(`/Valid SCORM 2004/.test(document.querySelector('#ed-pkg-report').textContent)`);
  await pick('#ed-status', 'Published');
  await page.eval(`document.querySelector('.modal-foot button[type=submit]').click()`);
  await page.waitFor(`!document.querySelector('#matForm')`);
  const m = await materialByTitle('Periodic Table Explorer');
  assert.deepEqual([m.status, m.package.status, m.audience.classId], ['Published', 'ready', 'class-10'], 'record preserved and now playable');
});

test('ADM-01/02: existing PDF, Video and Document upload flows still work', async () => {
  for (const [type, path, cls, subj] of [['PDF', 'notes.pdf', 'class-9', 'subj-biology'], ['Video', 'lecture.mp4', 'class-6', 'subj-mathematics'], ['Document', 'worksheet.docx', 'class-1', 'subj-english']]) {
    const title = `QA ${type} upload`;
    await upload({ title, classId: cls, subject: subj, type, path: file(path) });
    await page.waitFor(`location.hash === '#/content'`);
    const m = await materialByTitle(title);
    assert.deepEqual([m.type, m.status, m.audience.classId, m.audience.subjectId, m.package], [type, 'Published', cls, subj, undefined]);
  }
  assert.deepEqual(page.errors, [], 'no uncaught page errors');
});
