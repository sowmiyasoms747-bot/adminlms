# SCORM tracking: settings, runtime mapping and normalisation

Implementation: `normalizeTracking()` and `gradebookUpdate()` in [js/scorm.js](../js/scorm.js); tests in [tests/unit/scorm.test.mjs](../tests/unit/scorm.test.mjs).

## Settings (version-neutral)

| Admin label | Where | Stored as | Meaning |
|---|---|---|---|
| Track completion | System Settings → SCORM Settings (default), Upload / Edit Material (per module) | `scormSettings.trackCompletion`, `material.tracking.trackCompletion` | Record completion **and** pass/fail reported by the module. |
| Sync score to gradebook (upload toggle: “Track score”) | same | `scormSettings.syncScore`, `material.tracking.syncScore` | Send the normalised score (0–100 %) when the module reports one. |
| Allow re-attempts | System Settings | `scormSettings.allowReattempts` | Unchanged behaviour. |
| Open in new window | System Settings | `scormSettings.openInNewWindow` | Unchanged behaviour. |

Existing values (completion on, score on, re-attempts on, new window off) were carried over as the defaults. Settings persist across reloads, and each SCORM material keeps its own copy, taken when it is uploaded.

## Runtime mapping

| Value | SCORM 1.2 | SCORM 2004 |
|---|---|---|
| Completion | `cmi.core.lesson_status`: `passed`, `completed`, `failed` → **completed**; `incomplete`, `browsed` → **incomplete**; `not attempted` → **not attempted** | `cmi.completion_status` (`completed`, `incomplete`, `not attempted`, `unknown`) |
| Pass / fail | `cmi.core.lesson_status`: `passed` → **passed**, `failed` → **failed**, otherwise **unknown** | `cmi.success_status` (`passed`, `failed`, `unknown`), independent of completion |
| Score | `cmi.core.score.raw` with `cmi.core.score.min` / `cmi.core.score.max` | `cmi.score.scaled` if present, otherwise `cmi.score.raw` with `cmi.score.min` / `cmi.score.max` |

Completion and pass/fail are kept as two separate fields. A SCORM 2004 module can be `incomplete` + `passed`, and that combination is preserved as-is.

## Score normalisation (to 0–100 %)

1. **SCORM 2004 `cmi.score.scaled`** (−1…1) → `scaled × 100`. Negative values are recorded as 0 %.
2. **Raw with min and max** (max > min) → `(raw − min) / (max − min) × 100`.
3. **Raw with max only** → `raw / max × 100`, assuming min = 0.
4. **Raw only, 0–100** → treated as a percentage.
5. **Anything else** (raw outside 0–100 with no range, or a non-numeric value) → **no score**, flagged “not normalised”.

Results are clamped to 0–100 and rounded to 2 decimals.

## Missing values

- No score reported → `scorePercent: null`. The gradebook gets **no entry**. It is never stored as 0.
- No status reported → completion is `unknown`, or `not attempted` (the LMS-initialised 1.2 value). Only `completed` counts as complete.
- No pass/fail → `unknown`.

## Preview attempts

Admin preview uses a separate staff attempt:

- learner `staff-preview`, `credit = no-credit`.
- The data lives only in the preview iframe's memory. It is shown in the “Preview tracking” panel, including “what a learner attempt would record”, and discarded when the preview ends.

Nothing is written to student grades, completion, attempt history or enrollment. The browser tests check this by comparing `DB.students` and all persisted Admin state before and after a preview.

## QA packages

`npm run qa:packages` writes these files to `qa/scorm/`:

- `qa-scorm12-valid.zip` and `qa-scorm2004-valid.zip`. Both report completed, passed and a score of 85/100.
- Six invalid packages: not a ZIP, no manifest, nested manifest, missing launch file, unsupported version, broken XML.

These are minimal packages built in-house to the spec. Vendor-authored packages (Articulate, iSpring, Captivate, ADL samples) have **not** been run yet. That is a recommended next QA step.
