# Slice 13 -- Per-Child Flex Grow

## Decision

Add a single per-widget flex grow factor for children of a flex `Panel`:

- optional `UiW.flexGrow` (positive integer);
- `genLvgl()`/`genLvglProject()` emit `lv_obj_set_flex_grow(child, n)` only when it is
  set to a positive value;
- a `Grow` number input in UI Designer, shown for non-Panel widgets that have a
  parent Panel.

## Why This Slice

Slices 07/11/12 gave a `Panel` a flex container with full main/cross/track alignment,
but children always keep their fixed size -- there is no way to make a child stretch to
fill the flex track. `lv_obj_set_flex_grow` is the single LVGL call that expresses this,
and it cleanly extends the existing flex slices without touching wrap/grid/responsive
behavior.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: `UiW.flexGrow`, normalized as a positive integer
  (dropped when absent / <= 0).
- `platform_app/web/src/codegen.ts`: emit `lv_obj_set_flex_grow(nm, n)` in `emitWidget`
  when `flexGrow` is set.
- `platform_app/web/src/modules/UiDesignerView.tsx`: `Grow` input gated on `parentId`.
- `platform_app/web/src/codegen.test.ts`: grow present -> call emitted; no grow ->
  no `lv_obj_set_flex_grow`.
- `platform_app/web/src/project.test.ts`: `flexGrow` round-trips through `.ucp` v2.
- `platform_app/web/e2e/smoke.spec.ts`: set a grow on the child Label and see the call.

Out of scope:

- flex wrap / multi-track behavior;
- grid layout;
- responsive/breakpoint profiles;
- per-child cross-axis self-alignment.

## Generator Contract

In `emitWidget`, after layout/style:

- if `w.flexGrow` is a finite number `>= 1`, emit
  `lv_obj_set_flex_grow(nm, <round(flexGrow)>);`;
- otherwise emit nothing (output unchanged).

The call is emitted regardless of the parent's layout (LVGL ignores it when the parent
is not a flex container); declaring it only requires the field to be set.

## Acceptance Criteria

- [x] Widget without `flexGrow` emits no `lv_obj_set_flex_grow` (existing output unchanged).
- [x] `flexGrow: 2` emits `lv_obj_set_flex_grow(ui_Label_2, 2);`.
- [x] `flexGrow: 0` / negative / non-numeric is dropped in normalization (`>= 1` only).
- [x] `flexGrow` round-trips through `.ucp` v2.

## Result

2026-06-13:

- Added `UiW.flexGrow` with `normalizeUiFlexGrow` (positive integer only), the
  `lv_obj_set_flex_grow(nm, n)` emit in `emitWidget`, and a `Grow` input shown for
  non-Panel widgets that have a parent Panel.
- Checks: `npm.cmd test` -- 16 files / 148 tests passed; `npm.cmd run build` -- OK with
  the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` --
  1 passed (run via `node node_modules/@playwright/test/cli.js`; see slice 10 shell note).

## Next Candidate Slice

- A binary/file asset pipeline on the slice-10 manifest `src` (image import + C array).
- Or nested/responsive layout work (breakpoints, percent sizes).
- Or a research-only LVGL v9 compatibility matrix before any v9 codegen.
