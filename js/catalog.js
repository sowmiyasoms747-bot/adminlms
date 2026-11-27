/* ==========================================================
   Academic catalog — the single source of truth for classes,
   sections, streams, subjects and material audience rules.
   Used by Academic Setup, Upload Material, Edit Material and every
   other class picker. Loaded in the browser (window.Catalog) and in
   Node for tests (module.exports).
   ========================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Catalog = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const SCHOOL = { id: 'school-lu', name: 'Learning Universe' };

  const STAGES = [
    { id: 'primary', name: 'Primary', from: 1, to: 5 },
    { id: 'middle', name: 'Middle School', from: 6, to: 8 },
    { id: 'secondary', name: 'Secondary', from: 9, to: 10 },
    { id: 'higher-secondary', name: 'Higher Secondary', from: 11, to: 12 },
  ];
  // Streams are a separate concept from sections and only apply to Classes 11–12.
  const STREAMS = [
    { id: 'stream-science', name: 'Science' },
    { id: 'stream-commerce', name: 'Commerce' },
    { id: 'stream-humanities', name: 'Humanities' },
  ];
  const STREAM_GRADES = [11, 12];

  // Class IDs are derived from the existing "Class N" names so current records map 1:1.
  const classIdFor = (grade) => `class-${grade}`;
  const stageOf = (grade) => STAGES.find((s) => grade >= s.from && grade <= s.to);
  const CLASSES = Array.from({ length: 12 }, (_, i) => {
    const grade = i + 1;
    return { id: classIdFor(grade), grade, name: `Class ${grade}`, stageId: stageOf(grade).id, hasStreams: STREAM_GRADES.includes(grade) };
  });
  const classById = (id) => CLASSES.find((c) => c.id === id) || null;
  const classIdFromName = (name) => {
    const m = /^\s*class\s+(\d{1,2})\s*$/i.exec(String(name || ''));
    return m && classById(classIdFor(+m[1])) ? classIdFor(+m[1]) : null;
  };
  const streamById = (id) => STREAMS.find((s) => s.id === id) || null;
  const streamsFor = (classId) => (classById(classId)?.hasStreams ? STREAMS.slice() : []);

  const yearIdFromLabel = (label) => {
    const m = /(\d{4})\D+(\d{4})/.exec(String(label || ''));
    return m ? `ay-${m[1]}-${m[2].slice(2)}` : null;
  };

  const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const subjectIdFor = (name) => `subj-${slug(name)}`;
  const SCI = ['stream-science'], ALL = null;
  // Grade range + streams (streams only matter for Classes 11–12; null = every stream).
  const DEFAULT_SUBJECT_RULES = [
    ['Physics', 6, 12, SCI], ['Chemistry', 6, 12, SCI], ['Mathematics', 1, 12, ['stream-science', 'stream-commerce']],
    ['Biology', 6, 12, SCI], ['English', 1, 12, ALL], ['Computer Science', 3, 12, ['stream-science', 'stream-commerce']],
    ['History', 6, 12, ['stream-humanities']], ['Geography', 6, 12, ['stream-humanities']], ['Tamil', 1, 12, ALL],
    ['Economics', 9, 12, ['stream-commerce', 'stream-humanities']], ['Environmental Studies', 1, 5, ALL],
  ];
  const makeSubject = (name, minGrade = 1, maxGrade = 12, streamIds = null) =>
    ({ id: subjectIdFor(name), name: String(name).trim(), minGrade, maxGrade, streamIds: streamIds ? streamIds.slice() : null });
  const defaultSubjects = () => DEFAULT_SUBJECT_RULES.map(([n, a, b, s]) => makeSubject(n, a, b, s));

  /** Accepts the legacy string list or subject objects; returns subject objects. Idempotent. */
  function migrateSubjects(list) {
    const defaults = defaultSubjects();
    const out = [];
    (list && list.length ? list : defaults).forEach((s) => {
      const obj = typeof s === 'string' ? (defaults.find((d) => d.name === s) || makeSubject(s)) : { ...s };
      if (!obj.id) obj.id = subjectIdFor(obj.name);
      if (!out.some((o) => o.id === obj.id)) out.push(obj);
    });
    // Upgrading from the legacy string list: add subjects introduced with Classes 1–12 support
    // (e.g. Environmental Studies). Already-migrated lists are left alone so admin deletions stick.
    const legacy = (list || []).every((s) => typeof s === 'string');
    if (legacy) defaults.forEach((d) => { if (!out.some((o) => o.id === d.id)) out.push(d); });
    return out;
  }

  /** Adds stable IDs to the existing class–section rows without touching their data. Idempotent. */
  function migrateClassRows(rows) {
    return (rows || []).map((r) => {
      const classId = r.classId || classIdFromName(r.name);
      return { ...r, classId, id: r.id || `${classId}-${slug(r.section)}` };
    });
  }

  const subjectOffered = (subject, classId, streamId) => {
    const c = classById(classId);
    if (!subject || !c) return false;
    if (c.grade < subject.minGrade || c.grade > subject.maxGrade) return false;
    if (c.hasStreams && streamId && subject.streamIds && !subject.streamIds.includes(streamId)) return false;
    return true;
  };
  const subjectsFor = (subjects, classId, streamId) => (subjects || []).filter((s) => subjectOffered(s, classId, streamId));
  const sectionsFor = (classRows, classId) => (classRows || []).filter((r) => r.classId === classId);

  /**
   * Validates a material audience. ctx = { subjects, classRows, academicYears: [{id,label}] }.
   * Returns [{ field, message }] — empty when the combination is valid.
   */
  function validateAudience(ctx, a) {
    const errors = [];
    const err = (field, message) => errors.push({ field, message });
    if (!a) return [{ field: 'class', message: 'Choose who this material is for.' }];
    if (a.schoolId !== SCHOOL.id) err('school', 'Select a valid school.');
    if (!(ctx.academicYears || []).some((y) => y.id === a.academicYearId)) err('academicYear', 'Select a valid academic year.');
    const cls = classById(a.classId);
    if (!cls) { err('class', 'Select a class from Class 1 to Class 12.'); return errors; }
    const sections = sectionsFor(ctx.classRows, cls.id);
    (a.sectionIds || []).forEach((id) => {
      if (!sections.some((s) => s.id === id)) err('sections', `Section "${id}" is not configured for ${cls.name}.`);
    });
    if (a.streamId) {
      if (!cls.hasStreams) err('stream', `Streams apply only to Classes 11 and 12. Remove the stream for ${cls.name}.`);
      else if (!streamById(a.streamId)) err('stream', 'Select a valid stream.');
    }
    const subj = (ctx.subjects || []).find((s) => s.id === a.subjectId);
    if (!subj) err('subject', 'Select a subject.');
    else if (!subjectOffered(subj, cls.id, null)) err('subject', `${subj.name} is not offered for ${cls.name}.`);
    else if (!subjectOffered(subj, cls.id, a.streamId)) err('subject', `${subj.name} is not offered in the ${streamById(a.streamId)?.name} stream.`);
    return errors;
  }

  function describeAudience(ctx, a) {
    if (!a) return { cls: '—', subject: '—', detail: '' };
    const cls = classById(a.classId);
    const secs = (a.sectionIds || []).map((id) => (ctx.classRows || []).find((r) => r.id === id)?.section || id);
    const stream = streamById(a.streamId);
    const subj = (ctx.subjects || []).find((s) => s.id === a.subjectId);
    const parts = [secs.length ? `Section ${secs.join(', ')}` : 'All sections'];
    if (cls?.hasStreams) parts.push(stream ? stream.name : 'All streams');
    return { cls: cls ? cls.name : '—', subject: subj ? subj.name : '—', detail: parts.join(' · ') };
  }

  /**
   * The delivery rule the student-facing API must enforce (see docs/primary-portal-integration.md).
   * student = { schoolId, academicYearId, classId, sectionId, streamId }
   */
  function isVisibleToStudent(material, student) {
    if (!material || material.status !== 'Published' || !material.audience || !student) return false;
    const a = material.audience;
    if (a.schoolId !== student.schoolId || a.academicYearId !== student.academicYearId) return false;
    if (a.classId !== student.classId) return false;
    if (a.sectionIds && a.sectionIds.length && !a.sectionIds.includes(student.sectionId)) return false;
    if (a.streamId && a.streamId !== student.streamId) return false;
    return true;
  }

  /**
   * Upgrades a legacy material ({ title, type, cls, subject, status }) to stable-ID targeting.
   * Existing fields are preserved; safe to run any number of times.
   */
  function migrateMaterial(m, ctx, index) {
    if (m.id && m.audience) return m;
    const out = { ...m };
    if (!out.id) out.id = `mat-${slug(m.title || 'material')}-${index != null ? index : Date.now().toString(36)}`;
    if (!out.audience) {
      const subj = (ctx.subjects || []).find((s) => s.name === m.subject);
      out.audience = {
        schoolId: SCHOOL.id,
        academicYearId: ctx.currentYearId,
        classId: classIdFromName(m.cls),
        sectionIds: [],
        streamId: null,
        subjectId: subj ? subj.id : subjectIdFor(m.subject || ''),
      };
      out.legacy = { cls: m.cls, subject: m.subject };
    }
    delete out.cls; delete out.subject;
    return out;
  }

  return {
    SCHOOL, STAGES, STREAMS, CLASSES, classById, classIdFor, classIdFromName, stageOf, streamById, streamsFor,
    yearIdFromLabel, subjectIdFor, makeSubject, defaultSubjects, migrateSubjects, migrateClassRows,
    subjectOffered, subjectsFor, sectionsFor, validateAudience, describeAudience, isVisibleToStudent, migrateMaterial,
  };
});
