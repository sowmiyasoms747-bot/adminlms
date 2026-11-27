// ADM-01 regression tests: Classes 1–12 catalog, audience validation, delivery rule, legacy migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Catalog = require('../../js/catalog.js');

const YEAR = { id: 'ay-2026-27', label: '2026 – 2027' };
const classRows = Catalog.migrateClassRows([
  { name: 'Class 3', section: 'A' }, { name: 'Class 3', section: 'B' },
  { name: 'Class 12', section: 'A' }, { name: 'Class 12', section: 'B' }, { name: 'Class 12', section: 'C' },
]);
const ctx = { subjects: Catalog.migrateSubjects(['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science', 'History', 'Geography', 'Tamil', 'Economics']),
  classRows, academicYears: [YEAR], currentYearId: YEAR.id };
const aud = (o) => ({ schoolId: Catalog.SCHOOL.id, academicYearId: YEAR.id, sectionIds: [], streamId: null, ...o });

test('catalog lists Classes 1–12 with stable IDs, in order', () => {
  assert.deepEqual(Catalog.CLASSES.map((c) => c.name), Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`));
  assert.equal(Catalog.classIdFromName('Class 12'), 'class-12');
  assert.equal(Catalog.classIdFromName('Class 3'), 'class-3');
  assert.equal(Catalog.classIdFromName('Class 13'), null);
  assert.equal(Catalog.classById('class-3').stageId, 'primary');
});

test('streams apply only to Classes 11 and 12', () => {
  for (let g = 1; g <= 10; g++) assert.deepEqual(Catalog.streamsFor(`class-${g}`), [], `Class ${g}`);
  assert.equal(Catalog.streamsFor('class-11').length, 3);
  assert.equal(Catalog.streamsFor('class-12').length, 3);
});

test('subjects and sections are filtered by the selected class/stream', () => {
  const c3 = Catalog.subjectsFor(ctx.subjects, 'class-3', null).map((s) => s.name);
  assert.ok(c3.includes('English') && c3.includes('Environmental Studies') && c3.includes('Mathematics'));
  assert.ok(!c3.includes('Physics'), 'Physics is not a Primary subject');
  const sci = Catalog.subjectsFor(ctx.subjects, 'class-12', 'stream-science').map((s) => s.name);
  assert.ok(sci.includes('Physics') && !sci.includes('History'));
  const com = Catalog.subjectsFor(ctx.subjects, 'class-12', 'stream-commerce').map((s) => s.name);
  assert.ok(!com.includes('Physics') && com.includes('Economics'));
  assert.deepEqual(Catalog.sectionsFor(classRows, 'class-3').map((r) => r.id), ['class-3-a', 'class-3-b']);
});

test('Class 3 material is valid without a stream', () => {
  const english = ctx.subjects.find((s) => s.name === 'English');
  assert.deepEqual(Catalog.validateAudience(ctx, aud({ classId: 'class-3', subjectId: english.id })), []);
  assert.deepEqual(Catalog.validateAudience(ctx, aud({ classId: 'class-3', sectionIds: ['class-3-a'], subjectId: english.id })), []);
});

test('a stream on a Primary class is rejected', () => {
  const english = ctx.subjects.find((s) => s.name === 'English');
  const errs = Catalog.validateAudience(ctx, aud({ classId: 'class-3', streamId: 'stream-science', subjectId: english.id }));
  assert.equal(errs[0].field, 'stream');
});

test('Class 12 targeting with section and stream still works', () => {
  const physics = ctx.subjects.find((s) => s.name === 'Physics');
  assert.deepEqual(Catalog.validateAudience(ctx, aud({ classId: 'class-12', sectionIds: ['class-12-a'], streamId: 'stream-science', subjectId: physics.id })), []);
  assert.deepEqual(Catalog.validateAudience(ctx, aud({ classId: 'class-12', subjectId: physics.id })), [], 'all streams');
  const bad = Catalog.validateAudience(ctx, aud({ classId: 'class-12', streamId: 'stream-commerce', subjectId: physics.id }));
  assert.equal(bad[0].field, 'subject');
});

test('invalid combinations are rejected field by field', () => {
  const physics = ctx.subjects.find((s) => s.name === 'Physics');
  const fields = (a) => Catalog.validateAudience(ctx, a).map((e) => e.field);
  assert.deepEqual(fields(aud({ classId: 'class-3', subjectId: physics.id })), ['subject']);
  assert.deepEqual(fields(aud({ classId: 'class-3', sectionIds: ['class-12-a'], subjectId: ctx.subjects[4].id })), ['sections']);
  assert.deepEqual(fields(aud({ classId: 'class-13', subjectId: physics.id })), ['class']);
  assert.ok(fields(aud({ classId: 'class-12', subjectId: physics.id, academicYearId: 'ay-1999-00' })).includes('academicYear'));
  assert.ok(fields(aud({ classId: 'class-12', subjectId: physics.id, schoolId: 'other' })).includes('school'));
});

test('delivery rule: published Class 3 material reaches only its audience', () => {
  const english = ctx.subjects.find((s) => s.name === 'English');
  const m = { status: 'Published', audience: aud({ classId: 'class-3', sectionIds: ['class-3-a'], subjectId: english.id }) };
  const student = (o) => ({ schoolId: Catalog.SCHOOL.id, academicYearId: YEAR.id, classId: 'class-3', sectionId: 'class-3-a', streamId: null, ...o });
  assert.equal(Catalog.isVisibleToStudent(m, student()), true, 'intended learner');
  assert.equal(Catalog.isVisibleToStudent(m, student({ classId: 'class-4', sectionId: 'class-4-a' })), false, 'different class');
  assert.equal(Catalog.isVisibleToStudent(m, student({ sectionId: 'class-3-b' })), false, 'excluded section');
  assert.equal(Catalog.isVisibleToStudent(m, student({ academicYearId: 'ay-2025-26' })), false, 'other year');
  assert.equal(Catalog.isVisibleToStudent({ ...m, status: 'Draft' }, student()), false, 'drafts are staff-only');
  const stream = { status: 'Published', audience: aud({ classId: 'class-12', streamId: 'stream-science', subjectId: english.id }) };
  assert.equal(Catalog.isVisibleToStudent(stream, student({ classId: 'class-12', sectionId: 'class-12-a', streamId: 'stream-science' })), true);
  assert.equal(Catalog.isVisibleToStudent(stream, student({ classId: 'class-12', sectionId: 'class-12-a', streamId: 'stream-commerce' })), false);
});

test('legacy migration preserves Classes 6–12 records and is safe to rerun', () => {
  const legacy = [
    { title: 'Electric Charges – SCORM', type: 'SCORM', cls: 'Class 12', subject: 'Physics', status: 'Published' },
    { title: 'Grammar Practice Set', type: 'Document', cls: 'Class 8', subject: 'English', status: 'Draft' },
  ];
  const once = legacy.map((m, i) => Catalog.migrateMaterial(m, ctx, i));
  const twice = once.map((m, i) => Catalog.migrateMaterial(m, ctx, i));
  assert.deepEqual(twice, once);
  assert.equal(once[0].audience.classId, 'class-12');
  assert.equal(once[0].audience.subjectId, 'subj-physics');
  assert.equal(once[0].status, 'Published');
  assert.deepEqual(once[0].legacy, { cls: 'Class 12', subject: 'Physics' });
  assert.equal(once[1].audience.classId, 'class-8');
  once.forEach((m) => assert.deepEqual(Catalog.validateAudience(ctx, m.audience), []));

  const rows = Catalog.migrateClassRows([{ name: 'Class 9', section: 'C', teacher: 'Ms. Janani', subjects: ['Physics'], students: 31 }]);
  assert.deepEqual(rows[0], { name: 'Class 9', section: 'C', teacher: 'Ms. Janani', subjects: ['Physics'], students: 31, classId: 'class-9', id: 'class-9-c' });
  assert.deepEqual(Catalog.migrateClassRows(rows), rows);

  const subj = Catalog.migrateSubjects(['Physics', 'My Custom']);
  assert.deepEqual(Catalog.migrateSubjects(subj), subj, 'subjects migration is idempotent');
  const pruned = subj.filter((s) => s.name !== 'Environmental Studies');
  assert.ok(!Catalog.migrateSubjects(pruned).some((s) => s.name === 'Environmental Studies'), 'admin deletions stick');
});
