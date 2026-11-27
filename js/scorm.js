/* ==========================================================
   SCORM core: ZIP reading, imsmanifest.xml validation, SCORM 1.2 /
   2004 runtime APIs and tracking normalisation.
   No dependencies. Runs in browsers, service workers and Node ≥ 18
   (needs DecompressionStream, Blob, Response, TextDecoder).
   ========================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Scorm = api;
})(typeof self !== 'undefined' ? self : this, function () {
  class ScormError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }

  /* ---------------- ZIP ---------------- */
  const utf8 = new TextDecoder('utf-8');
  const latin1 = (u8) => Array.from(u8, (b) => String.fromCharCode(b)).join('');
  const BAD_ZIP = 'The file is not a readable ZIP archive. Re-export the module from your authoring tool as a SCORM .zip package and upload it again.';

  async function inflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /** Reads the central directory. Returns { bytes, dv, entries: Map<path, entry> }. */
  function readZipDirectory(input) {
    const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (u8.length < 22) throw new ScormError('invalid_archive', BAD_ZIP);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new ScormError('invalid_archive', BAD_ZIP);
    const count = dv.getUint16(eocd + 10, true), cdSize = dv.getUint32(eocd + 12, true), cdOff = dv.getUint32(eocd + 16, true);
    if (count === 0xffff || cdOff === 0xffffffff) {
      throw new ScormError('invalid_archive', 'This ZIP uses the ZIP64 format, which is not supported. Re-export the package as a standard ZIP (under 4 GB).');
    }
    if (cdOff + cdSize > eocd) throw new ScormError('invalid_archive', BAD_ZIP);
    const entries = new Map();
    let p = cdOff;
    for (let i = 0; i < count; i++) {
      if (p + 46 > u8.length || dv.getUint32(p, true) !== 0x02014b50) throw new ScormError('invalid_archive', BAD_ZIP);
      const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const raw = u8.subarray(p + 46, p + 46 + nlen);
      p += 46 + nlen + elen + clen;
      const path = ((flags & 0x800) ? utf8.decode(raw) : latin1(raw)).replace(/\\/g, '/').replace(/^\.\//, '');
      if (!path || path.endsWith('/')) continue;
      if (path.startsWith('/') || path.split('/').includes('..')) {
        throw new ScormError('invalid_archive', `The ZIP contains an unsafe path ("${path}"). Re-export the package from your authoring tool.`);
      }
      entries.set(path, { path, method, flags, csize, usize, lho, encrypted: !!(flags & 1) });
    }
    return { bytes: u8, dv, entries };
  }

  async function readEntry(zip, path) {
    const e = zip.entries.get(path);
    if (!e) return null;
    if (e.encrypted) throw new ScormError('invalid_archive', `"${path}" is password-protected. Upload an unencrypted package.`);
    const { dv, bytes } = zip, o = e.lho;
    if (o + 30 > bytes.length || dv.getUint32(o, true) !== 0x04034b50) throw new ScormError('invalid_archive', BAD_ZIP);
    const start = o + 30 + dv.getUint16(o + 26, true) + dv.getUint16(o + 28, true);
    const data = bytes.subarray(start, start + e.csize);
    if (data.length !== e.csize) throw new ScormError('invalid_archive', `The ZIP is truncated ("${path}" is incomplete). Upload the full file again.`);
    if (e.method === 0) return data.slice();
    if (e.method === 8) {
      try { return await inflateRaw(data); } catch { throw new ScormError('invalid_archive', `"${path}" is corrupted inside the ZIP. Re-export the package and upload it again.`); }
    }
    throw new ScormError('invalid_archive', `"${path}" uses an unsupported compression method (${e.method}). Re-zip the package with standard Deflate compression.`);
  }

  /* ---------------- Minimal XML parser (sufficient for imsmanifest.xml) ---------------- */
  const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
  const decodeEnt = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (_, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()]);
  const TAG = /<([A-Za-z_][\w.:-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  const ATTR = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  function parseXml(src) {
    const doc = { name: '#document', attrs: {}, children: [], text: '' };
    const stack = [doc];
    let i = src.charCodeAt(0) === 0xfeff ? 1 : 0;
    const fail = (msg) => { throw new Error(`${msg} (character ${i})`); };
    while (i < src.length) {
      const top = stack[stack.length - 1];
      if (src[i] !== '<') {
        const j = src.indexOf('<', i);
        const t = src.slice(i, j < 0 ? src.length : j);
        if (t.trim()) { if (top === doc) fail('Text outside the root element'); top.text += decodeEnt(t); }
        i = j < 0 ? src.length : j;
        continue;
      }
      if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i); if (e < 0) fail('Unclosed comment'); i = e + 3; continue; }
      if (src.startsWith('<![CDATA[', i)) { const e = src.indexOf(']]>', i); if (e < 0) fail('Unclosed CDATA'); top.text += src.slice(i + 9, e); i = e + 3; continue; }
      if (src.startsWith('<?', i)) { const e = src.indexOf('?>', i); if (e < 0) fail('Unclosed processing instruction'); i = e + 2; continue; }
      if (src.startsWith('<!', i)) {
        let d = 0, j = i + 2;
        for (; j < src.length; j++) { const c = src[j]; if (c === '[') d++; else if (c === ']') d--; else if (c === '>' && d === 0) break; }
        i = j + 1; continue;
      }
      if (src[i + 1] === '/') {
        const e = src.indexOf('>', i); if (e < 0) fail('Unclosed end tag');
        const name = src.slice(i + 2, e).trim();
        if (stack.length < 2 || top.name !== name) fail(`Unexpected </${name}>${stack.length > 1 ? `, expected </${top.name}>` : ''}`);
        stack.pop(); i = e + 1; continue;
      }
      TAG.lastIndex = i;
      const m = TAG.exec(src);
      if (!m) fail('Malformed tag');
      const node = { name: m[1], attrs: {}, children: [], text: '' };
      let a; ATTR.lastIndex = 0;
      while ((a = ATTR.exec(m[2]))) node.attrs[a[1]] = decodeEnt(a[2] !== undefined ? a[2] : a[3]);
      if (top === doc && doc.children.length) fail('More than one root element');
      top.children.push(node);
      if (!m[3]) stack.push(node);
      i = TAG.lastIndex;
    }
    if (stack.length > 1) throw new Error(`Unclosed element <${stack[stack.length - 1].name}>`);
    if (!doc.children.length) throw new Error('No root element');
    return doc.children[0];
  }
  const local = (n) => n.split(':').pop().toLowerCase();
  const kids = (node, name) => (node ? node.children.filter((c) => local(c.name) === name) : []);
  const kid = (node, name) => kids(node, name)[0] || null;
  const attr = (node, name) => {
    if (!node) return undefined;
    const k = Object.keys(node.attrs).find((key) => local(key) === name.toLowerCase());
    return k === undefined ? undefined : node.attrs[k];
  };
  const descendant = (node, name) => {
    for (const c of node.children) { if (local(c.name) === name) return c; const d = descendant(c, name); if (d) return d; }
    return null;
  };

  /* ---------------- Paths ---------------- */
  function resolvePath(...parts) {
    const out = [];
    parts.filter(Boolean).join('/').split('/').forEach((seg) => {
      if (!seg || seg === '.') return;
      if (seg === '..') { if (!out.length) throw new ScormError('missing_launch_file', 'The launch path points outside the package.'); out.pop(); } else out.push(seg);
    });
    return out.join('/');
  }
  const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

  const MIME = {
    html: 'text/html', htm: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json',
    xml: 'application/xml', xsd: 'application/xml', txt: 'text/plain', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
    jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
    otf: 'font/otf', pdf: 'application/pdf', swf: 'application/x-shockwave-flash', vtt: 'text/vtt', wasm: 'application/wasm',
  };
  const mimeType = (path) => MIME[(path.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

  /* ---------------- Package inspection ---------------- */
  /**
   * Validates a SCORM package. Never throws; returns a report:
   * { ok, status: 'ready'|'invalid', version: '1.2'|'2004'|null, versionLabel, title, launchPath, launchQuery,
   *   resourceId, scoCount, fileCount, masteryScore, errors: [{code, message}], warnings: [string] }
   */
  async function inspectPackage(input) {
    const report = { ok: false, status: 'invalid', version: null, versionLabel: null, title: null, launchPath: null, launchQuery: '',
      resourceId: null, scoCount: 0, fileCount: 0, masteryScore: null, errors: [], warnings: [] };
    const fail = (code, message) => { report.errors.push({ code, message }); return report; };
    let zip;
    try { zip = readZipDirectory(input); } catch (e) { return fail(e.code || 'invalid_archive', e.message); }
    report.fileCount = zip.entries.size;
    if (!zip.entries.size) return fail('invalid_archive', 'The ZIP archive is empty.');

    if (!zip.entries.has('imsmanifest.xml')) {
      const paths = [...zip.entries.keys()];
      const caseVariant = paths.find((p) => p.toLowerCase() === 'imsmanifest.xml');
      const nested = paths.find((p) => p.toLowerCase().endsWith('/imsmanifest.xml'));
      if (caseVariant) return fail('missing_manifest', `Found "${caseVariant}", but the manifest must be named exactly "imsmanifest.xml" (lower case). Rename it and re-zip the package.`);
      if (nested) return fail('missing_manifest', `imsmanifest.xml is inside the folder "${nested.slice(0, -16)}". Zip the contents of that folder (not the folder itself) so imsmanifest.xml is at the root of the ZIP.`);
      return fail('missing_manifest', 'imsmanifest.xml was not found at the root of the ZIP. This does not look like a SCORM package — re-export the module from your authoring tool as SCORM 1.2 or SCORM 2004.');
    }
    let manifest;
    try {
      const bytes = await readEntry(zip, 'imsmanifest.xml');
      manifest = parseXml(utf8.decode(bytes));
    } catch (e) {
      if (e instanceof ScormError) return fail(e.code, e.message);
      return fail('manifest_unreadable', `imsmanifest.xml could not be read: ${e.message}. Fix the XML or re-export the package.`);
    }
    if (local(manifest.name) !== 'manifest') return fail('manifest_unreadable', `imsmanifest.xml must have a <manifest> root element (found <${manifest.name}>).`);

    // ---- Version ----
    const sv = (descendant(kid(manifest, 'metadata') || { children: [] }, 'schemaversion')?.text || '').trim();
    const ns = Object.values(manifest.attrs).join(' ').toLowerCase();
    if (sv === '1.2') { report.version = '1.2'; report.versionLabel = 'SCORM 1.2'; }
    else if (/^cam 1\.3$/i.test(sv)) { report.version = '2004'; report.versionLabel = 'SCORM 2004 2nd Edition'; }
    else if (/^2004 (2nd|3rd|4th) edition$/i.test(sv)) { report.version = '2004'; report.versionLabel = `SCORM ${sv.replace(/edition/i, 'Edition')}`; }
    else if (sv) return fail('unsupported_version', `Schema version "${sv}" is not supported. Admin preview supports SCORM 1.2 and SCORM 2004 (2nd, 3rd or 4th Edition). Re-publish the module from your authoring tool as one of those versions.`);
    else if (ns.includes('adlcp_rootv1p2')) { report.version = '1.2'; report.versionLabel = 'SCORM 1.2'; report.warnings.push('The manifest has no <schemaversion>; the version was detected from the SCORM 1.2 namespace.'); }
    else if (ns.includes('adlcp_v1p3')) { report.version = '2004'; report.versionLabel = 'SCORM 2004'; report.warnings.push('The manifest has no <schemaversion>; the version was detected from the SCORM 2004 namespace.'); }
    else return fail('unsupported_version', 'The manifest does not declare a SCORM version (no <schemaversion> and no SCORM namespaces). It may be an IMS content package, AICC, xAPI or cmi5 course — re-export it as SCORM 1.2 or SCORM 2004.');

    // ---- Organization and launch resource ----
    const orgsNode = kid(manifest, 'organizations');
    const orgs = kids(orgsNode, 'organization');
    const org = orgs.find((o) => o.attrs.identifier === attr(orgsNode, 'default')) || orgs[0];
    if (!org) return fail('no_launch_resource', 'The manifest has no <organization>, so there is nothing to launch. Re-export the package with at least one launchable SCO.');
    report.title = (kid(org, 'title')?.text || '').trim() || null;
    const resNode = kid(manifest, 'resources');
    const resources = new Map(kids(resNode, 'resource').map((r) => [r.attrs.identifier, r]));
    const items = [];
    (function walk(n) { kids(n, 'item').forEach((it) => { items.push(it); walk(it); }); })(org);
    const launchables = items.filter((it) => attr(it, 'identifierref'));
    const missingRef = launchables.find((it) => !resources.has(attr(it, 'identifierref')));
    if (missingRef) return fail('no_launch_resource', `Item "${missingRef.attrs.identifier}" points to resource "${attr(missingRef, 'identifierref')}", which is not defined in <resources>. Fix imsmanifest.xml and re-upload.`);
    const isSco = (r) => (attr(r, 'scormtype') || '').toLowerCase() === 'sco';
    report.scoCount = launchables.filter((it) => isSco(resources.get(attr(it, 'identifierref')))).length;
    const first = launchables.find((it) => attr(resources.get(attr(it, 'identifierref')), 'href'));
    if (!first) return fail('no_launch_resource', 'No launchable item: the default organization has no <item identifierref> pointing to a <resource> with an href. Re-export the package with a launchable SCO.');
    const res = resources.get(attr(first, 'identifierref'));
    report.resourceId = res.attrs.identifier;
    if (report.version === '1.2') {
      const ms = (kid(first, 'masteryscore')?.text || '').trim();
      if (ms) report.masteryScore = ms;
    }
    if (!isSco(res)) report.warnings.push(`The launch resource "${res.attrs.identifier}" is an asset, not a SCO, so it will not report tracking data.`);
    const href = attr(res, 'href');
    const [hrefPath, ...q] = href.split(/(?=[?#])/);
    const params = (attr(first, 'parameters') || '').trim();
    report.launchQuery = q.join('') + (params ? (params.startsWith('?') || params.startsWith('#') ? params : (q.join('').includes('?') ? '&' : '?') + params) : '');
    let path;
    try { path = resolvePath(attr(manifest, 'base'), attr(resNode, 'base'), attr(res, 'base'), safeDecode(hrefPath)); }
    catch (e) { return fail(e.code, e.message); }
    report.launchPath = path;
    if (!zip.entries.has(path)) {
      const ci = [...zip.entries.keys()].find((p) => p.toLowerCase() === path.toLowerCase());
      return fail('missing_launch_file', `The launch file "${path}" (resource "${res.attrs.identifier}") is not in the ZIP.${ci ? ` A file named "${ci}" exists — the letter case must match exactly.` : ''} Add the file at that path or correct the href in imsmanifest.xml, then re-upload.`);
    }
    // Other SCOs that would fail to launch are reported as warnings.
    launchables.slice(1).forEach((it) => {
      const r = resources.get(attr(it, 'identifierref'));
      const h = attr(r, 'href');
      if (!h) return;
      try {
        const p = resolvePath(attr(manifest, 'base'), attr(resNode, 'base'), attr(r, 'base'), safeDecode(h.split(/[?#]/)[0]));
        if (!zip.entries.has(p)) report.warnings.push(`Item "${it.attrs.identifier}" launches "${p}", which is not in the ZIP.`);
      } catch { report.warnings.push(`Item "${it.attrs.identifier}" has a launch path outside the package.`); }
    });
    report.ok = true;
    report.status = 'ready';
    return report;
  }

  /* ---------------- Runtime ---------------- */
  const ERR12 = { 0: 'No error', 101: 'General exception', 201: 'Invalid argument error', 202: 'Element cannot have children', 203: 'Element not an array - cannot have count',
    301: 'Not initialized', 401: 'Not implemented error', 402: 'Invalid set value, element is a keyword', 403: 'Element is read only', 404: 'Element is write only', 405: 'Incorrect data type' };
  const ERR2004 = { 0: 'No error', 101: 'General exception', 102: 'General initialization failure', 103: 'Already initialized', 104: 'Content instance terminated',
    111: 'General termination failure', 112: 'Termination before initialization', 113: 'Termination after termination', 122: 'Retrieve data before initialization',
    123: 'Retrieve data after termination', 132: 'Store data before initialization', 133: 'Store data after termination', 142: 'Commit before initialization',
    143: 'Commit after termination', 201: 'General argument error', 301: 'General get failure', 351: 'General set failure', 391: 'General commit failure',
    401: 'Undefined data model element', 402: 'Unimplemented data model element', 403: 'Data model element value not initialized', 404: 'Data model element is read only',
    405: 'Data model element is write only', 406: 'Data model element type mismatch', 407: 'Data model element value out of range', 408: 'Data model dependency not established' };

  const isNum = (v) => v !== '' && v != null && Number.isFinite(Number(v));
  const enumOf = (...vals) => (v) => vals.includes(v);
  const real = (lo, hi) => (v) => isNum(v) && (lo == null || +v >= lo) && (hi == null || +v <= hi);
  const any = () => true;
  const str = (max) => (v) => v.length <= max;
  const TIMESPAN12 = /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/;
  const DURATION = /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

  function model12(o) {
    return {
      'cmi.core._children': ['r', 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time'],
      'cmi.core.student_id': ['r', o.learnerId], 'cmi.core.student_name': ['r', o.learnerName],
      'cmi.core.lesson_location': ['rw', '', str(255)], 'cmi.core.credit': ['r', 'no-credit'],
      'cmi.core.lesson_status': ['rw', 'not attempted', enumOf('passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted')],
      'cmi.core.entry': ['r', 'ab-initio'], 'cmi.core.score._children': ['r', 'raw,min,max'],
      'cmi.core.score.raw': ['rw', '', (v) => v === '' || isNum(v)], 'cmi.core.score.min': ['rw', '', (v) => v === '' || isNum(v)],
      'cmi.core.score.max': ['rw', '', (v) => v === '' || isNum(v)], 'cmi.core.total_time': ['r', '0000:00:00'],
      'cmi.core.lesson_mode': ['r', 'normal'], 'cmi.core.exit': ['w', '', enumOf('time-out', 'suspend', 'logout', '')],
      'cmi.core.session_time': ['w', '', (v) => TIMESPAN12.test(v)], 'cmi.suspend_data': ['rw', '', str(4096)],
      'cmi.launch_data': ['r', ''], 'cmi.comments': ['rw', '', str(4096)], 'cmi.comments_from_lms': ['r', ''],
      'cmi.student_data._children': ['r', 'mastery_score,max_time_allowed,time_limit_action'],
      'cmi.student_data.mastery_score': ['r', o.masteryScore || ''], 'cmi.student_data.max_time_allowed': ['r', ''],
      'cmi.student_data.time_limit_action': ['r', 'continue,no message'],
      'cmi.student_preference._children': ['r', 'audio,language,speed,text'],
      'cmi.student_preference.audio': ['rw', '0', real(-1, 100)], 'cmi.student_preference.language': ['rw', '', str(255)],
      'cmi.student_preference.speed': ['rw', '0', real(-100, 100)], 'cmi.student_preference.text': ['rw', '0', real(-1, 1)],
      'cmi.objectives._children': ['r', 'id,score,status'], 'cmi.interactions._children': ['r', 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency'],
    };
  }
  function model2004(o) {
    return {
      'cmi._version': ['r', '1.0'], 'cmi.learner_id': ['r', o.learnerId], 'cmi.learner_name': ['r', o.learnerName],
      'cmi.completion_status': ['rw', 'unknown', enumOf('completed', 'incomplete', 'not attempted', 'unknown')],
      'cmi.success_status': ['rw', 'unknown', enumOf('passed', 'failed', 'unknown')],
      'cmi.score._children': ['r', 'scaled,raw,min,max'], 'cmi.score.scaled': ['rw', undefined, real(-1, 1)],
      'cmi.score.raw': ['rw', undefined, real()], 'cmi.score.min': ['rw', undefined, real()], 'cmi.score.max': ['rw', undefined, real()],
      'cmi.progress_measure': ['rw', undefined, real(0, 1)], 'cmi.completion_threshold': ['r', undefined], 'cmi.scaled_passing_score': ['r', undefined],
      'cmi.location': ['rw', '', str(1000)], 'cmi.suspend_data': ['rw', '', str(64000)], 'cmi.launch_data': ['r', ''],
      'cmi.entry': ['r', 'ab-initio'], 'cmi.exit': ['w', '', enumOf('time-out', 'suspend', 'logout', 'normal', '')],
      'cmi.session_time': ['w', '', (v) => DURATION.test(v)], 'cmi.total_time': ['r', 'PT0H0M0S'], 'cmi.mode': ['r', 'normal'],
      'cmi.credit': ['r', 'no-credit'], 'cmi.max_time_allowed': ['r', undefined], 'cmi.time_limit_action': ['r', 'continue,no message'],
      'cmi.learner_preference._children': ['r', 'audio_level,language,delivery_speed,audio_captioning'],
      'cmi.learner_preference.audio_level': ['rw', '1', real(0)], 'cmi.learner_preference.language': ['rw', '', str(250)],
      'cmi.learner_preference.delivery_speed': ['rw', '1', real(0)], 'cmi.learner_preference.audio_captioning': ['rw', '0', enumOf('-1', '0', '1')],
      'cmi.objectives._children': ['r', 'id,score,success_status,completion_status,progress_measure,description'],
      'cmi.interactions._children': ['r', 'id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description'],
      'cmi.comments_from_learner._children': ['r', 'comment,location,timestamp'], 'cmi.comments_from_lms._children': ['r', 'comment,location,timestamp'],
      'adl.nav.request': ['rw', '_none_', any],
    };
  }
  // Collections: <prefix>.n.<field>. mode for fields; 1.2 interactions are write-only.
  const COLLECTIONS = {
    '1.2': [['cmi.objectives', 'rw'], ['cmi.interactions', 'w']],
    '2004': [['cmi.objectives', 'rw'], ['cmi.interactions', 'rw'], ['cmi.comments_from_learner', 'rw'], ['cmi.comments_from_lms', 'r']],
  };

  /**
   * Creates an isolated runtime for one preview attempt. Nothing here talks to student records:
   * the only output is opts.onEvent(event) for the staff preview panel.
   */
  function createRuntime(version, opts = {}) {
    const v = version === '1.2' ? '1.2' : '2004';
    const o = { learnerId: 'staff-preview', learnerName: 'Preview, Staff', ...opts };
    const defs = v === '1.2' ? model12(o) : model2004(o);
    const data = {};
    Object.entries(defs).forEach(([k, [, init]]) => { if (init !== undefined) data[k] = String(init); });
    const counts = {};
    let phase = 'new', lastError = 0;
    const emit = (ev) => { try { o.onEvent && o.onEvent({ ...ev, version: v, snapshot: { ...data }, tracking: normalizeTracking(v, data) }); } catch (_) { /* never break the SCO */ } };
    const E = v === '1.2' ? ERR12 : ERR2004;

    function collection(el) {
      for (const [prefix, mode] of COLLECTIONS[v]) {
        if (el === `${prefix}._count`) return { kind: 'count', prefix };
        const m = new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.(\\d+)\\.(.+)$`).exec(el);
        if (m) return { kind: 'item', prefix, n: +m[1], field: m[2], mode: /\._count$/.test(m[2]) ? 'r' : mode };
      }
      return null;
    }

    function get(el) {
      el = String(el);
      if (v === '1.2') {
        if (phase !== 'running') { lastError = 301; return ''; }
      } else if (phase === 'new') { lastError = 122; return ''; } else if (phase === 'done') { lastError = 123; return ''; }
      if (!el) { lastError = v === '1.2' ? 201 : 301; return ''; }
      const c = collection(el);
      if (c?.kind === 'count') { lastError = 0; return String(counts[c.prefix] || 0); }
      if (c?.kind === 'item') {
        if (c.mode === 'w') { lastError = 404 + (v === '2004' ? 1 : 0); return ''; }
        if (!(el in data)) { lastError = v === '1.2' ? 0 : 403; return ''; }
        lastError = 0; return data[el];
      }
      const def = defs[el];
      if (!def) {
        if (/\._children$/.test(el)) { lastError = v === '1.2' ? 202 : 301; return ''; }
        if (/\._count$/.test(el)) { lastError = v === '1.2' ? 203 : 301; return ''; }
        lastError = 401; return '';
      }
      if (def[0] === 'w') { lastError = v === '1.2' ? 404 : 405; return ''; }
      if (!(el in data)) { lastError = 403; return ''; }
      lastError = 0;
      return data[el];
    }

    function set(el, val) {
      el = String(el); val = val == null ? '' : String(val);
      if (v === '1.2') {
        if (phase !== 'running') { lastError = 301; return false; }
      } else if (phase === 'new') { lastError = 132; return false; } else if (phase === 'done') { lastError = 133; return false; }
      const c = collection(el);
      if (c?.kind === 'count') { lastError = v === '1.2' ? 402 : 404; return false; }
      if (c?.kind === 'item') {
        if (c.mode === 'r') { lastError = v === '1.2' ? 403 : 404; return false; }
        const cnt = counts[c.prefix] || 0;
        if (c.n > cnt) { lastError = v === '1.2' ? 201 : 351; return false; }
        if (c.n === cnt) counts[c.prefix] = cnt + 1;
        data[el] = val; lastError = 0; emit({ call: 'SetValue', element: el, value: val }); return true;
      }
      const def = defs[el];
      if (!def) { lastError = v === '1.2' ? (/\._(children|count)$/.test(el) ? 402 : 401) : 401; return false; }
      if (def[0] === 'r') { lastError = v === '1.2' ? 403 : 404; return false; }
      if (def[2] && !def[2](val)) { lastError = v === '1.2' ? 405 : (/score|progress|preference/.test(el) && isNum(val) ? 407 : 406); return false; }
      data[el] = val; lastError = 0;
      emit({ call: 'SetValue', element: el, value: val });
      return true;
    }

    const T = (b) => (b ? 'true' : 'false');
    function init(p) {
      if (p !== '' && p != null) { lastError = 201; return false; }
      if (phase === 'running') { lastError = v === '1.2' ? 101 : 103; return false; }
      if (phase === 'done') { lastError = v === '1.2' ? 101 : 104; return false; }
      phase = 'running'; lastError = 0; emit({ call: 'Initialize' }); return true;
    }
    function commit(p) {
      if (p !== '' && p != null) { lastError = 201; return false; }
      if (phase !== 'running') { lastError = v === '1.2' ? 301 : (phase === 'new' ? 142 : 143); return false; }
      lastError = 0; emit({ call: 'Commit' }); return true;
    }
    function finish(p) {
      if (p !== '' && p != null) { lastError = 201; return false; }
      if (phase !== 'running') { lastError = v === '1.2' ? 301 : (phase === 'new' ? 112 : 113); return false; }
      phase = 'done'; lastError = 0; emit({ call: 'Terminate' }); return true;
    }
    const errStr = (c) => E[+c] || '';
    const api = v === '1.2' ? {
      LMSInitialize: (p) => T(init(p)), LMSFinish: (p) => T(finish(p)), LMSGetValue: get, LMSSetValue: (e, x) => T(set(e, x)),
      LMSCommit: (p) => T(commit(p)), LMSGetLastError: () => String(lastError), LMSGetErrorString: errStr, LMSGetDiagnostic: (c) => errStr(c === '' || c == null ? lastError : c),
    } : {
      Initialize: (p) => T(init(p)), Terminate: (p) => T(finish(p)), GetValue: get, SetValue: (e, x) => T(set(e, x)),
      Commit: (p) => T(commit(p)), GetLastError: () => String(lastError), GetErrorString: errStr, GetDiagnostic: (c) => errStr(c === '' || c == null ? lastError : c),
    };
    return { version: v, api, data: () => ({ ...data }), phase: () => phase, tracking: () => normalizeTracking(v, data) };
  }

  /* ---------------- Tracking normalisation (see docs/scorm-tracking.md) ---------------- */
  const n = (x) => (isNum(x) ? Number(x) : null);
  const clamp = (x) => Math.max(0, Math.min(100, Math.round(x * 100) / 100));
  function scoreFromRaw(raw, min, max) {
    const r = n(raw), lo = n(min), hi = n(max);
    if (r === null) return { percent: null, source: null, note: 'No score reported' };
    if (lo !== null && hi !== null && hi > lo) return { percent: clamp(((r - lo) / (hi - lo)) * 100), source: 'raw', note: `raw ${r} on a ${lo}–${hi} scale` };
    if (lo === null && hi !== null && hi > 0) return { percent: clamp((r / hi) * 100), source: 'raw', note: `raw ${r} out of ${hi} (min assumed 0)` };
    if (lo === null && hi === null && r >= 0 && r <= 100) return { percent: clamp(r), source: 'raw', note: 'raw treated as a percentage (no min/max reported)' };
    return { percent: null, source: null, note: 'Raw score reported without a usable min/max range — not normalised' };
  }
  /**
   * Maps runtime data to version-neutral tracking values.
   * completion: completed | incomplete | not attempted | unknown
   * success:    passed | failed | unknown
   * score.percent: 0–100 or null (null = no gradebook entry; never treated as 0)
   */
  function normalizeTracking(version, d) {
    const g = (k) => (d[k] === undefined ? '' : String(d[k]));
    if (version === '1.2') {
      const s = g('cmi.core.lesson_status');
      const completion = { passed: 'completed', completed: 'completed', failed: 'completed', incomplete: 'incomplete', browsed: 'incomplete', 'not attempted': 'not attempted' }[s] || 'unknown';
      const success = s === 'passed' ? 'passed' : s === 'failed' ? 'failed' : 'unknown';
      return { completion, success, score: scoreFromRaw(g('cmi.core.score.raw'), g('cmi.core.score.min'), g('cmi.core.score.max')), source: { status: s || null } };
    }
    const completion = ['completed', 'incomplete', 'not attempted'].includes(g('cmi.completion_status')) ? g('cmi.completion_status') : 'unknown';
    const success = ['passed', 'failed'].includes(g('cmi.success_status')) ? g('cmi.success_status') : 'unknown';
    const scaled = n(g('cmi.score.scaled'));
    const score = scaled !== null
      ? { percent: clamp(scaled * 100), source: 'scaled', note: `scaled ${scaled}${scaled < 0 ? ' (negative scores are recorded as 0%)' : ''}` }
      : scoreFromRaw(g('cmi.score.raw'), g('cmi.score.min'), g('cmi.score.max'));
    return { completion, success, score, source: { completion: g('cmi.completion_status') || null, success: g('cmi.success_status') || null } };
  }

  /** What a real learner attempt would write, given the material's tracking preferences. */
  function gradebookUpdate(tracking, prefs) {
    return {
      completion: prefs && prefs.trackCompletion ? tracking.completion : null,
      success: prefs && prefs.trackCompletion ? tracking.success : null,
      scorePercent: prefs && prefs.syncScore && tracking.score.percent !== null ? tracking.score.percent : null,
    };
  }

  return { ScormError, readZipDirectory, readEntry, parseXml, inspectPackage, resolvePath, mimeType, createRuntime, normalizeTracking, gradebookUpdate };
});
