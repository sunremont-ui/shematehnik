# Slice 02 -- Multi-Screen Generator Model

## Decision

Implement the next LVGL lab slice as a pure multi-screen generator API:

- add `LvglScreenDesign` and `LvglProjectDesign`;
- add `genLvglProject(project)`;
- keep `genLvgl(widgets, screen)` byte-stable and backward-compatible.

## Why This Slice

Screens are the structural prerequisite for richer UI export. Styles, events, assets and layouts all need a parent screen or container model to attach to. A pure generator slice proves the shape without forcing an immediate `.ucp` migration or UI Designer redesign.

## Scope

Code/test:

- `platform_app/web/src/codegen.ts`: add multi-screen project generator.
- `platform_app/web/src/codegen.test.ts`: add exact golden-output assertions for a two-screen project.

No behavior change:

- UI Designer still edits the legacy flat `uiDesign` widget list.
- LVGL Export view still calls `genLvgl(widgets, "main")`.
- `.ucp` v2 design snapshot is unchanged.
- SquareLine bridge remains out of scope.

## Acceptance Criteria

- [x] `genLvgl(widgets, "main")` golden baseline remains unchanged.
- [x] `genLvglProject()` emits scoped widget names for repeated widget IDs across screens.
- [x] `genLvglProject()` emits per-screen init functions and project-level `ui_init()`.
- [x] `genLvglProject()` emits v8 initial screen load with `lv_scr_load()`.
- [x] `npm.cmd test -- codegen.test.ts` passes.

## Result

2026-06-12:

- Added `genLvglProject()` and project/screen interfaces in `platform_app/web/src/codegen.ts`.
- Added a two-screen exact golden-output test in `platform_app/web/src/codegen.test.ts`.
- Targeted check: `npm.cmd test -- codegen.test.ts` passed, 14 tests.
- Full check: `npm.cmd test` passed, 16 files / 127 tests.
- Build check: `npm.cmd run build` passed; existing Vite warning about lazy `ThreeDView` chunk >500 kB remains.

## Follow-up

Completed in `slice-03-ui-project-state.md`:

1. persisted `uiProject` wrapper around legacy `uiDesign`;
2. screen selection controls in UI Designer;
3. project export mode in LVGL Export while preserving current-screen single export.
