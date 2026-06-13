# Slice Proposal -- First LVGL Exporter Improvement

## Decision

Start with golden-output tests for current `genLvgl()` before changing the exporter model.

## Why This Slice

The current exporter is useful but small. It generates a single LVGL v8-style screen from a flat `uiDesign` widget list. Before adding multi-screen, styles or events, the lab needs a stable snapshot of current behavior.

## Scope

Code/test:

- Add exact generated `ui.c` and `ui.h` golden-output assertions to `platform_app/web/src/codegen.test.ts`.

No behavior change:

- no `.ucp` format migration;
- no UI Designer data-model change;
- no v9 output mode yet;
- no SquareLine bridge claims.

## Acceptance Criteria

- [x] `npm.cmd test -- codegen.test.ts` passes.
- [x] Existing `genLvgl(widgets, "main")` output remains byte-stable for the baseline widget fixture.
- [x] Lab docs record why v8 output is the first preserved target.

## Result

2026-06-12:

- Added exact `ui.c` and `ui.h` assertions to `platform_app/web/src/codegen.test.ts`.
- Targeted check: `npm.cmd test -- codegen.test.ts` passed, 13 tests.
- Full check: `npm.cmd test` passed, 16 files / 126 tests.

## Next Candidate Slice

After the golden baseline:

1. Multi-screen project model proposal; or
2. Button event callback stub generation.

Preference: multi-screen model first, because screens are a structural prerequisite for realistic UI export and can be introduced with backward-compatible wrappers around the existing flat widget list.

Follow-up:

- Implemented as `slice-02-multiscreen.md` with `genLvglProject(project)`.
