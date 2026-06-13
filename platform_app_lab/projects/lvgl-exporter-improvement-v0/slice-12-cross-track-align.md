# Slice 12 -- Panel Flex Cross-Axis and Track Alignment

## Decision

Extend the slice-11 main-axis align with the remaining two LVGL flex placement
arguments, reusing the existing `UiFlexAlign` enum:

- optional `UiLayout.crossAlign` (cross-axis item placement);
- optional `UiLayout.trackAlign` (wrapped-track placement);
- `lv_obj_set_flex_align(obj, <main>, <cross>, <track>)` fills the 2nd/3rd args from
  these fields, each defaulting to `LV_FLEX_ALIGN_START`;
- the call is emitted when any of `align`/`crossAlign`/`trackAlign` is set;
- UI Designer `Cross`/`Track` selects for `Panel` widgets.

## Why This Slice

Slice 11 hard-coded the cross and track arguments of `lv_obj_set_flex_align` to
`START`. Cross-axis alignment (centering items across the flex axis) and track
alignment (multi-line distribution) are the natural completion of that single call,
and they cost no new generator structure -- only two more enum-typed fields.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: `UiLayout.crossAlign`, `UiLayout.trackAlign`,
  normalized like `align`.
- `platform_app/web/src/codegen.ts`: `emitLayout` fills args 2/3 and emits the call
  when any align field is set.
- `platform_app/web/src/modules/UiDesignerView.tsx`: object-merge `updateLayout`
  helper plus `Cross`/`Track` selects.
- `platform_app/web/src/codegen.test.ts`: cross/track present -> filled args;
  main-only output still `(<main>, START, START)`; no align fields -> no call.
- `platform_app/web/src/project.test.ts`: `crossAlign`/`trackAlign` round-trip.
- `platform_app/web/e2e/smoke.spec.ts`: pick a cross align and see the filled call.

Out of scope:

- per-child grow/shrink and auto-reflow;
- responsive/breakpoint display profiles;
- grid layout.

## Generator Contract

In `emitLayout`, with a valid flow:

- compute `main`/`cross`/`track` from `align`/`crossAlign`/`trackAlign` (or null);
- if any is set, emit
  `lv_obj_set_flex_align(nm, <main|START>, <cross|START>, <track|START>);`;
- otherwise emit no align call (slice-07 output preserved).

Main-only input keeps the exact slice-11 string `(<main>, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START)`.

## Acceptance Criteria

- [x] Flow with no align fields emits no `lv_obj_set_flex_align` (slice-07 unchanged).
- [x] `align` only still emits `(<main>, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START)` (slice-11 unchanged).
- [x] `crossAlign: "center"` only emits `(LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_START)`.
- [x] `align`+`crossAlign`+`trackAlign` fill all three args.
- [x] `crossAlign`/`trackAlign` round-trip through `.ucp` v2.

## Result

2026-06-13:

- Added `UiLayout.crossAlign`/`trackAlign`, normalized like `align`; `emitLayout` fills
  args 2/3 of `lv_obj_set_flex_align` and emits the call when any align field is set.
- Refactored UI Designer layout controls to an object-merge `updateLayout` helper with
  `Align`/`Cross`/`Track` selects for `Panel`.
- Checks: `npm.cmd test` -- 16 files / 147 tests passed; `npm.cmd run build` -- OK with
  the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` --
  1 passed (run via `node node_modules/@playwright/test/cli.js`; see slice 10 shell note).

## Next Candidate Slice

- A binary/file asset pipeline on the slice-10 manifest `src` (image import + C array).
- Or nested/responsive layout work (child grow/shrink, breakpoints).
- Or a research-only LVGL v9 compatibility matrix before any v9 codegen.
