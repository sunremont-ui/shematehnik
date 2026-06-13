# Slice 11 -- Minimal Panel Flex Main-Axis Alignment

## Decision

Add a single main-axis alignment field to the existing `Panel.layout` flex slice:

- `UiFlexAlign` enum (`start | center | end | space_between | space_around | space_evenly`);
- optional `UiLayout.align`;
- `genLvgl()`/`genLvglProject()` emit `lv_obj_set_flex_align(obj, <main>, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START)` only when a flow and an align are both set;
- an `Align` select in UI Designer for `Panel` widgets, next to Layout/Gap.

## Why This Slice

Slice 07 gave `Panel` a flex flow + gap, but no control over how children
distribute along the main axis. Main-axis alignment is the single most useful flex
knob (centering, space-between toolbars). Keeping it to the main axis -- with cross
and track placement fixed to `START` -- proves the data/generator path without a full
responsive layout system.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: `UiFlexAlign`, `UI_FLEX_ALIGNS`, `UiLayout.align`,
  normalization of `align` (only when `layout.kind` is valid).
- `platform_app/web/src/codegen.ts`: `LV_FLEX_ALIGN` map; emit the align call in
  `emitLayout` after `lv_obj_set_flex_flow`.
- `platform_app/web/src/modules/UiDesignerView.tsx`: `Align` select; `setLayout`
  preserves/sets `align`.
- `platform_app/web/src/codegen.test.ts`: align present -> call emitted; flow without
  align -> no `lv_obj_set_flex_align`.
- `platform_app/web/src/project.test.ts`: `align` survives `.ucp` v2 round-trip.
- `platform_app/web/e2e/smoke.spec.ts`: pick an alignment and see the call.

Out of scope:

- cross-axis and track (wrap) alignment;
- child auto-reflow / responsive profiles / grid;
- per-child flex grow/shrink.

## Generator Contract

In `emitLayout`, when `w.layout.kind` maps to a flow:

- always emit `lv_obj_set_layout` + `lv_obj_set_flex_flow` (unchanged);
- if `w.layout.align` is set, additionally emit
  `lv_obj_set_flex_align(nm, <LV_FLEX_ALIGN_*>, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);`;
- gap pad setters unchanged.

No `align` -> output byte-identical to slice 07.

## Acceptance Criteria

- [x] Panel flow without `align` keeps slice-07 output (no `lv_obj_set_flex_align`).
- [x] `align: "space_between"` emits
      `lv_obj_set_flex_align(ui_Panel_1, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);`.
- [x] `align` is ignored when there is no valid `layout.kind` (normalization drops it with the layout).
- [x] `align` round-trips through `.ucp` v2.

## Result

2026-06-13:

- Added `UiFlexAlign`/`UI_FLEX_ALIGNS`, `UiLayout.align`, the `LV_FLEX_ALIGN` map and
  the `lv_obj_set_flex_align(...)` emit in `emitLayout`, plus an `Align` select in the
  UI Designer Panel controls.
- Checks: `npm.cmd test` -- 16 files / 145 tests passed; `npm.cmd run build` -- OK with
  the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` --
  1 passed (run via `node node_modules/@playwright/test/cli.js`; see slice 10 shell note).

## Next Candidate Slice

- Cross-axis / track (wrap) alignment, building on this main-axis field.
- Or a binary/file asset pipeline on the slice-10 manifest `src`.
- Or a research-only LVGL v9 compatibility matrix before any v9 codegen.
