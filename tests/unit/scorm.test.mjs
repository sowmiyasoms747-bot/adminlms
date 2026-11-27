// ADM-02 / ADM-03 regression tests: package validation, runtime APIs, tracking normalisation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PACKAGES } from '../fixtures/packages.mjs';
const require = createRequire(import.meta.url);
const Scorm = require('../../js/scorm.js');

const inspect = (name) => Scorm.inspectPackage(PACKAGES[name]());

test('valid SCORM 1.2 package is identified and launchable', async () => {
  const r = await inspect('qa-scorm12-valid.zip');
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.version, '1.2');
  assert.equal(r.versionLabel, 'SCORM 1.2');
  assert.equal(r.launchPath, 'index.html');
  assert.equal(r.scoCount, 1);
  assert.equal(r.masteryScore, '70');
  assert.equal(r.title, 'QA SCORM 1.2 Module');
});

test('valid SCORM 2004 package is identified (xml:base resolved)', async () => {
  const r = await inspect('qa-scorm2004-valid.zip');
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.version, '2004');
  assert.equal(r.versionLabel, 'SCORM 2004 4th Edition');
  assert.equal(r.launchPath, 'content/index.html');
});

for (const [name, code, hint] of [
  ['qa-invalid-not-a-zip.zip', 'invalid_archive', /not a readable ZIP/],
  ['qa-invalid-no-manifest.zip', 'missing_manifest', /not found at the root/],
  ['qa-invalid-nested-manifest.zip', 'missing_manifest', /inside the folder "course"/],
  ['qa-invalid-missing-launch.zip', 'missing_launch_file', /"start\.html".*not in the ZIP/],
  ['qa-invalid-unsupported-version.zip', 'unsupported_version', /"1\.1" is not supported/],
  ['qa-invalid-broken-xml.zip', 'manifest_unreadable', /could not be read/],
]) {
  test(`invalid package is rejected with an actionable error: ${name}`, async () => {
    const r = await inspect(name);
    assert.equal(r.ok, false);
    assert.equal(r.status, 'invalid');
    assert.equal(r.errors[0].code, code);
    assert.match(r.errors[0].message, hint);
  });
}

test('truncated archive is rejected', async () => {
  const buf = PACKAGES['qa-scorm12-valid.zip']();
  const r = await Scorm.inspectPackage(buf.subarray(0, buf.length - 30));
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].code, 'invalid_archive');
});

test('readEntry inflates package files', async () => {
  const z = Scorm.readZipDirectory(PACKAGES['qa-scorm2004-valid.zip']());
  const js = new TextDecoder().decode(await Scorm.readEntry(z, 'content/js/sco.js'));
  assert.match(js, /API_1484_11/);
});

test('SCORM 1.2 runtime: lifecycle, data model and errors', () => {
  const events = [];
  const rt = Scorm.createRuntime('1.2', { onEvent: (e) => events.push(e) });
  const A = rt.api;
  assert.equal(A.LMSGetValue('cmi.core.lesson_status'), '');
  assert.equal(A.LMSGetLastError(), '301', 'not initialized');
  assert.equal(A.LMSInitialize(''), 'true');
  assert.equal(A.LMSGetValue('cmi.core.student_id'), 'staff-preview');
  assert.equal(A.LMSGetValue('cmi.core.credit'), 'no-credit');
  assert.equal(A.LMSSetValue('cmi.core.student_id', 'x'), 'false');
  assert.equal(A.LMSGetLastError(), '403');
  assert.equal(A.LMSSetValue('cmi.core.lesson_status', 'done'), 'false');
  assert.equal(A.LMSGetLastError(), '405');
  assert.equal(A.LMSGetValue('cmi.core.session_time'), '');
  assert.equal(A.LMSGetLastError(), '404', 'write only');
  assert.equal(A.LMSSetValue('cmi.interactions.0.id', 'q1'), 'true');
  assert.equal(A.LMSGetValue('cmi.interactions._count'), '1');
  assert.equal(A.LMSSetValue('cmi.core.score.raw', '42'), 'true');
  assert.equal(A.LMSSetValue('cmi.core.lesson_status', 'failed'), 'true');
  assert.equal(A.LMSFinish(''), 'true');
  assert.equal(A.LMSSetValue('cmi.core.lesson_status', 'passed'), 'false');
  const t = rt.tracking();
  assert.equal(t.completion, 'completed');
  assert.equal(t.success, 'failed');
  assert.equal(t.score.percent, 42);
  assert.ok(events.some((e) => e.call === 'Terminate'));
});

test('SCORM 2004 runtime: lifecycle, data model and errors', () => {
  const rt = Scorm.createRuntime('2004');
  const A = rt.api;
  assert.equal(A.SetValue('cmi.location', 'x'), 'false');
  assert.equal(A.GetLastError(), '132');
  assert.equal(A.Initialize(''), 'true');
  assert.equal(A.Initialize(''), 'false');
  assert.equal(A.GetLastError(), '103');
  assert.equal(A.GetValue('cmi.mode'), 'normal');
  assert.equal(A.GetValue('cmi.credit'), 'no-credit');
  assert.equal(A.GetValue('cmi.score.raw'), '');
  assert.equal(A.GetLastError(), '403', 'not initialised');
  assert.equal(A.SetValue('cmi.score.scaled', '1.5'), 'false');
  assert.equal(A.GetLastError(), '407');
  assert.equal(A.SetValue('cmi.completion_status', 'passed'), 'false');
  assert.equal(A.GetLastError(), '406');
  assert.equal(A.GetValue('cmi.nonexistent'), '');
  assert.equal(A.GetLastError(), '401');
  assert.equal(A.SetValue('cmi.completion_status', 'completed'), 'true');
  assert.equal(A.SetValue('cmi.score.scaled', '0.9'), 'true');
  assert.equal(A.Terminate(''), 'true');
  assert.equal(A.GetValue('cmi.location'), '');
  assert.equal(A.GetLastError(), '123');
  const t = rt.tracking();
  assert.deepEqual([t.completion, t.success, t.score.percent], ['completed', 'unknown', 90]);
});

test('tracking normalisation keeps completion and success distinct and never invents a score', () => {
  const N = Scorm.normalizeTracking;
  // 1.2: lesson_status mapping
  assert.deepEqual([N('1.2', { 'cmi.core.lesson_status': 'passed' }).completion, N('1.2', { 'cmi.core.lesson_status': 'passed' }).success], ['completed', 'passed']);
  assert.deepEqual([N('1.2', { 'cmi.core.lesson_status': 'completed' }).completion, N('1.2', { 'cmi.core.lesson_status': 'completed' }).success], ['completed', 'unknown']);
  assert.equal(N('1.2', { 'cmi.core.lesson_status': 'browsed' }).completion, 'incomplete');
  assert.equal(N('1.2', {}).completion, 'unknown', 'missing status is not complete');
  // score scales
  assert.equal(N('1.2', { 'cmi.core.score.raw': '15', 'cmi.core.score.min': '0', 'cmi.core.score.max': '20' }).score.percent, 75);
  assert.equal(N('1.2', { 'cmi.core.score.raw': '80' }).score.percent, 80);
  assert.equal(N('1.2', { 'cmi.core.score.raw': '' }).score.percent, null, 'no score → null, not 0');
  assert.equal(N('1.2', { 'cmi.core.score.raw': '250' }).score.percent, null, 'unscalable raw → null');
  // 2004: scaled preferred over raw; success independent of completion
  const t = N('2004', { 'cmi.completion_status': 'incomplete', 'cmi.success_status': 'passed', 'cmi.score.scaled': '0.5', 'cmi.score.raw': '9', 'cmi.score.max': '10' });
  assert.deepEqual([t.completion, t.success, t.score.percent, t.score.source], ['incomplete', 'passed', 50, 'scaled']);
  assert.equal(N('2004', { 'cmi.score.raw': '9', 'cmi.score.min': '0', 'cmi.score.max': '10' }).score.percent, 90);
  assert.equal(N('2004', { 'cmi.completion_status': 'unknown' }).completion, 'unknown');
  assert.equal(N('2004', {}).score.percent, null);
  // gradebook respects preferences and missing scores
  const gb = Scorm.gradebookUpdate(N('2004', { 'cmi.completion_status': 'completed' }), { trackCompletion: true, syncScore: true });
  assert.deepEqual(gb, { completion: 'completed', success: 'unknown', scorePercent: null });
  assert.deepEqual(Scorm.gradebookUpdate(t, { trackCompletion: false, syncScore: false }), { completion: null, success: null, scorePercent: null });
});

test('QA packages report completion and score through the runtime', async () => {
  // Execute each QA SCO script against a runtime, as the browser player does.
  for (const [name, version, file] of [['qa-scorm12-valid.zip', '1.2', 'js/sco.js'], ['qa-scorm2004-valid.zip', '2004', 'content/js/sco.js']]) {
    const z = Scorm.readZipDirectory(PACKAGES[name]());
    const src = new TextDecoder().decode(await Scorm.readEntry(z, file));
    const rt = Scorm.createRuntime(version);
    const win = { [version === '1.2' ? 'API' : 'API_1484_11']: rt.api };
    win.parent = win;
    const doc = { getElementById: () => ({}), title: '' };
    new Function('window', 'document', src)(win, doc);
    const t = rt.tracking();
    assert.deepEqual([t.completion, t.success, t.score.percent], ['completed', 'passed', 85], name);
    assert.equal(rt.phase(), 'done');
  }
});
