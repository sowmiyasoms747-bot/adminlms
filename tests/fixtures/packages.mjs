/* QA SCORM packages for tests and manual checks.
   `node tests/fixtures/packages.mjs` writes them to qa/scorm/ so they can be uploaded in the Admin UI.
   The "good" packages are minimal, spec-shaped SCOs that report completion, success and score. */
import { deflateRawSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** files: { path: string|Buffer } → ZIP Buffer (Deflate). */
export function zip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const comp = deflateRawSync(data), nameB = Buffer.from(name, 'utf8'), crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameB.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameB.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, nameB, comp); centrals.push(ch, nameB);
    offset += 30 + nameB.length + comp.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const manifest12 = (href = 'index.html') => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="QA-SCORM12" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1"><title>QA SCORM 1.2 Module</title>
      <item identifier="ITEM-1" identifierref="RES-1"><title>Lesson 1</title><adlcp:masteryscore>70</adlcp:masteryscore></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="${href}"><file href="index.html"/><file href="js/sco.js"/></resource>
  </resources>
</manifest>`;

const manifest2004 = (sv = '2004 4th Edition', href = 'content/index.html') => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="QA-SCORM2004" version="1" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3" xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3">
  <metadata><schema>ADL SCORM</schema><schemaversion>${sv}</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1"><title>QA SCORM 2004 Module</title>
      <item identifier="ITEM-1" identifierref="RES-1"><title>Lesson 1</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormType="sco" xml:base="content/" href="${href.replace(/^content\//, '')}">
      <file href="index.html"/><file href="js/sco.js"/></resource>
  </resources>
</manifest>`;

const scoHtml = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:15px system-ui;margin:24px;color:#0f1b33}#out{white-space:pre-wrap;background:#f2f7ff;padding:12px;border-radius:8px}</style></head>
<body><h1>${title}</h1><p>This QA SCO reports completion, pass/fail and a score of 85 / 100 when it loads.</p>
<pre id="out">Starting…</pre><script src="js/sco.js"></script></body></html>`;

const scoJs12 = `(function () {
  function findAPI(w) { for (var i = 0; w && i < 10; i++) { if (w.API) return w.API; if (w.parent === w) break; w = w.parent; } return null; }
  var api = findAPI(window) || (window.opener && findAPI(window.opener)); var out = document.getElementById('out'); var log = [];
  function call(name) { var args = [].slice.call(arguments, 1); var r = api[name].apply(api, args); log.push(name + '(' + args.join(', ') + ') = ' + r); return r; }
  if (!api) { out.textContent = 'SCORM 1.2 API not found'; return; }
  call('LMSInitialize', ''); call('LMSGetValue', 'cmi.core.student_name');
  call('LMSSetValue', 'cmi.core.lesson_location', 'page-3');
  call('LMSSetValue', 'cmi.core.score.min', '0'); call('LMSSetValue', 'cmi.core.score.max', '100'); call('LMSSetValue', 'cmi.core.score.raw', '85');
  call('LMSSetValue', 'cmi.core.lesson_status', 'passed'); call('LMSSetValue', 'cmi.core.session_time', '00:02:30');
  call('LMSCommit', ''); call('LMSFinish', '');
  out.textContent = log.join('\\n'); document.title = 'QA-DONE';
})();`;

const scoJs2004 = `(function () {
  function findAPI(w) { for (var i = 0; w && i < 10; i++) { if (w.API_1484_11) return w.API_1484_11; if (w.parent === w) break; w = w.parent; } return null; }
  var api = findAPI(window) || (window.opener && findAPI(window.opener)); var out = document.getElementById('out'); var log = [];
  function call(name) { var args = [].slice.call(arguments, 1); var r = api[name].apply(api, args); log.push(name + '(' + args.join(', ') + ') = ' + r); return r; }
  if (!api) { out.textContent = 'SCORM 2004 API not found'; return; }
  call('Initialize', ''); call('GetValue', 'cmi.learner_name'); call('SetValue', 'cmi.location', 'page-3');
  call('SetValue', 'cmi.score.min', '0'); call('SetValue', 'cmi.score.max', '100'); call('SetValue', 'cmi.score.raw', '85'); call('SetValue', 'cmi.score.scaled', '0.85');
  call('SetValue', 'cmi.completion_status', 'completed'); call('SetValue', 'cmi.success_status', 'passed'); call('SetValue', 'cmi.session_time', 'PT2M30S');
  call('Commit', ''); call('Terminate', '');
  out.textContent = log.join('\\n'); document.title = 'QA-DONE';
})();`;

export const PACKAGES = {
  'qa-scorm12-valid.zip': () => zip({ 'imsmanifest.xml': manifest12(), 'index.html': scoHtml('QA SCORM 1.2 Module'), 'js/sco.js': scoJs12 }),
  'qa-scorm2004-valid.zip': () => zip({ 'imsmanifest.xml': manifest2004(), 'content/index.html': scoHtml('QA SCORM 2004 Module'), 'content/js/sco.js': scoJs2004 }),
  'qa-invalid-no-manifest.zip': () => zip({ 'index.html': scoHtml('No manifest') }),
  'qa-invalid-nested-manifest.zip': () => zip({ 'course/imsmanifest.xml': manifest12(), 'course/index.html': scoHtml('Nested') }),
  'qa-invalid-missing-launch.zip': () => zip({ 'imsmanifest.xml': manifest12('start.html'), 'index.html': scoHtml('Missing launch') }),
  'qa-invalid-unsupported-version.zip': () => zip({ 'imsmanifest.xml': manifest12().replace('<schemaversion>1.2</schemaversion>', '<schemaversion>1.1</schemaversion>'), 'index.html': scoHtml('Old') }),
  'qa-invalid-broken-xml.zip': () => zip({ 'imsmanifest.xml': manifest12().replace('</organizations>', ''), 'index.html': scoHtml('Broken') }),
  'qa-invalid-not-a-zip.zip': () => Buffer.from('This is a renamed text file, not a ZIP archive.'),
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'qa', 'scorm');
  mkdirSync(dir, { recursive: true });
  for (const [name, make] of Object.entries(PACKAGES)) writeFileSync(join(dir, name), make());
  console.log(`Wrote ${Object.keys(PACKAGES).length} packages to ${dir}`);
}
