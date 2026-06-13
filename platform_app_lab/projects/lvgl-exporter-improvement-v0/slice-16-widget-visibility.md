# Slice 16 -- Widget Hidden Flag and Opacity

## Decision

Add two common per-widget runtime-presentation properties:

- `UiW.hidden?: boolean` -> `lv_obj_add_flag(obj, LV_OBJ_FLAG_HIDDEN)`;
- `UiW.opa?: number` (0-254, since 255 is the default opaque value) ->
  `lv_obj_set_style_opa(obj, n, LV_PART_MAIN | LV_STATE_DEFAULT)`;
- UI Designer `Hidden` checkbox and `Opacity` slider for every widget.

## Why This Slice

The exporter models geometry, style, layout and events, but not whether a widget is
visible or translucent -- both are standard LVGL object properties used constantly in
real UIs (e.g. hiding a panel until a state is reached, dimming a disabled control).
They are pure additive widget metadata with single-call generation.

## Scope

- `design.ts`: `UiW.hidden`/`UiW.opa`, normalized (`hidden` only when `true`, `opa`
  kept only when `0 <= n < 255`).
- `codegen.ts`: emit the flag/opacity calls in `emitWidget` when set.
- `UiDesignerView.tsx`: `Hidden` checkbox + `Opacity` slider.
- `codegen.test.ts`: hidden/opacity emitted when set, absent otherwise.
- `project.test.ts`: `hidden`/`opa` round-trip through `.ucp` v2.

Out of scope: per-state opacity, transitions/animations, other object flags.

## Acceptance Criteria

- [x] `hidden: true` emits `lv_obj_add_flag(<nm>, LV_OBJ_FLAG_HIDDEN);`.
- [x] `opa: 128` emits `lv_obj_set_style_opa(<nm>, 128, LV_PART_MAIN | LV_STATE_DEFAULT);`.
- [x] No `hidden`/`opa` -> no such calls (existing output unchanged).
- [x] `hidden`/`opa` round-trip through `.ucp` v2.

## Result

2026-06-14:

- `UiW.hidden`/`UiW.opa` with normalization (`opa` kept only for `0 <= n < 255`), the
  flag/opacity emits in `emitWidget`, and a `Hidden` checkbox + `Opacity` slider for every
  widget. Verified in the slice-15/16 batch: `npm.cmd test` -- 17 files / 157 tests;
  `npm.cmd run build` -- OK; targeted Playwright `CodeGen LVGL` -- 1 passed.
