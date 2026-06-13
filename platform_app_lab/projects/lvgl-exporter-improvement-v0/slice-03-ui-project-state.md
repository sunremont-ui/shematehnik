# Slice 03 -- UI Project State And Persistence

## Decision

Wire the generator-only multi-screen model into the web UI state with a backward-compatible wrapper:

- keep `uiDesign` as the legacy flat widget-list store;
- add `uiProject` with `screens[]` and `initialScreenId`;
- serialize `uiProject` under `.ucp` v2 `design.uiProject`;
- migrate old `.ucp` v2 files that only contain `design.uiDesign` into a single `main` screen;
- expose project-level LVGL export while preserving current-screen single export.

## Why This Slice

The previous slice proved `genLvglProject()` as a pure generator. This slice makes the model useful in the app without breaking existing `.ucp` files or the legacy single-screen `genLvgl(widgets, screen)` contract.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: add `UiProjectDesign`, `uiProject`, sync wrapper and `snapshotDesign()` / `restoreDesign()` support.
- `platform_app/web/src/modules/UiDesignerView.tsx`: add screen selection, screen creation, initial-screen selection and per-screen widget editing.
- `platform_app/web/src/modules/codegen_exports.tsx`: add Project / Current screen LVGL export modes.
- `platform_app/web/src/App.tsx`: autosave listens to `uiProject`.
- `platform_app/web/src/project.test.ts`: add multi-screen persistence and legacy `uiDesign` migration tests.

Out of scope:

- style/theme tokens;
- event/action callbacks;
- asset/image source model;
- LVGL v9 output mode;
- SquareLine import/export.

## Acceptance Criteria

- [x] Existing `genLvgl(widgets, "main")` golden baseline remains unchanged.
- [x] `uiProject` round-trips through `.ucp` v2 with two screens.
- [x] Legacy `.ucp` v2 `design.uiDesign` migrates to `uiProject.screens[0]`.
- [x] UI Designer can edit widgets per selected screen.
- [x] LVGL Export can show project-level `ui_init()` output or current-screen legacy output.

## Result

2026-06-12:

- Implemented `uiProject` state and persistence wrapper.
- Added UI Designer screen controls and LVGL Export mode controls.
- Targeted checks passed: `npm.cmd test -- codegen.test.ts` and `npm.cmd test -- project.test.ts`.

## Next Candidate Slice

Button event callback stubs are now a good next small slice because screens and project export are persisted. Keep the first event model minimal:

- `event?: { code: "clicked" | "value_changed"; handler: string }` on widgets;
- generate callback declarations and `lv_obj_add_event_cb(...)`;
- add exact golden tests before exposing broad UI controls.

Follow-up:

- Implemented as `slice-04-events.md`.
