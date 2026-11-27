# Material targeting: data contract for the student / Primary portals

**Status: student delivery is unverified.** This repository is a static Admin front end with no backend and no shared content API. Admin data is stored in the browser:

- `localStorage` key `lu.admin.state.v2` holds the records.
- IndexedDB `lu-admin/packages` holds the SCORM package files.

No student or Primary portal reads this data, so the rule below is implemented and unit-tested (`Catalog.isVisibleToStudent`) but is **not enforced server-side yet**.

## Stable IDs

| Concept | ID format | Example |
|---|---|---|
| School | `school-<slug>` | `school-lu` |
| Academic year | `ay-<start>-<end yy>` | `ay-2026-27` |
| Class (grade) | `class-<1..12>` | `class-3`, `class-12` |
| Section | `<classId>-<letter>` | `class-3-a` |
| Stream (Classes 11–12 only) | `stream-<name>` | `stream-science` |
| Subject | `subj-<slug>` | `subj-environmental-studies` |

These are the only class, section and stream values. Primary is Classes 1–5. Streams never apply below Class 11.

## Material record

```json
{
  "id": "mat-…",
  "title": "Plants Around Us",
  "type": "PDF | Video | Document | SCORM",
  "status": "Published | Draft",
  "publishAt": "2026-11-28T10:00 (optional, scheduled)",
  "audience": {
    "schoolId": "school-lu",
    "academicYearId": "ay-2026-27",
    "classId": "class-3",
    "sectionIds": ["class-3-a"],
    "streamId": null,
    "subjectId": "subj-environmental-studies"
  },
  "tracking": { "trackCompletion": true, "syncScore": true },
  "package": { "id": "pkg-…", "status": "ready", "version": "1.2 | 2004", "launchPath": "index.html" }
}
```

How to read `audience`:

- `sectionIds: []` means every section of the class, including sections added later.
- `streamId: null` means every stream, or no stream for Classes 1–10.

`tracking` and `package` only appear on SCORM materials.

## Validation the API must repeat on write

`POST/PUT /materials` must reject a request unless all of these hold (mirrors `Catalog.validateAudience`):

1. `schoolId` and `academicYearId` exist.
2. `classId` is in Class 1–12.
3. Each section in `sectionIds` belongs to `classId`.
4. `streamId` is null unless the class is 11 or 12. If set, it must be a known stream.
5. The subject is offered for the class's grade range and, when a stream is set, for that stream.
6. `status: "Published"` is allowed only if the audience is valid. For SCORM, `package.status` must also be `ready` (`canPublish`).

## Delivery rule the student API must enforce

The student portal requests: `GET /students/me/materials`. The student context comes from the session, **never from query parameters**: `{ schoolId, academicYearId, classId, sectionId, streamId }`.

A material is returned only when all of the following hold:

- `status == "Published"`, and `publishAt` is null or in the past
- `audience.schoolId == student.schoolId`
- `audience.academicYearId == student.academicYearId`
- `audience.classId == student.classId`
- `audience.sectionIds` is empty or contains `student.sectionId`
- `audience.streamId` is null or equals `student.streamId`

Drafts are visible only to staff endpoints.

## Acceptance checks still to run against a real backend

- A published Class 3 / Section A material is returned for a Class 3-A student.
- It is **not** returned for a Class 4 student or a Class 3-B student.
- A Draft is never returned to any student.
- A Class 12 Science material is not returned to a Class 12 Commerce student.

These cases already pass as unit tests against `Catalog.isVisibleToStudent` (`tests/unit/catalog.test.mjs`). They have to be repeated as API tests once the shared content API exists.
