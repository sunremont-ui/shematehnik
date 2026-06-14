# Slice 22 -- LVGL v9 Generator Mode

## Decision

Implement the `v9-mode-candidate.md` plan: a `mode: "v8" | "v9"` parameter on
`genLvgl`/`genLvglProject` (default `"v8"`), realized as a `LvDialect` lookup of the
verified renamable symbols (slice 19). v8 output stays byte-identical; v9 swaps only the
researched symbols.

## Dialect (v8 -> v9)

- Constructors: `lv_btn_create`->`lv_button_create`, `lv_img_create`->`lv_image_create`,
  `lv_meter_create` (Gauge)->`lv_scale_create` (we emit no meter-specific calls, so this
  is safe and compilable).
- Image: `lv_img_set_src`->`lv_image_set_src`, `LV_IMG_DECLARE`->`LV_IMAGE_DECLARE`,
  `lv_img_dsc_t`->`lv_image_dsc_t`, `LV_IMG_CF_TRUE_COLOR`->`LV_COLOR_FORMAT_RGB565`,
  `LV_IMG_CF_TRUE_COLOR_ALPHA`->`LV_COLOR_FORMAT_RGB565A8`.
- Screen: `lv_scr_load`->`lv_screen_load`.
- Flags/events: `lv_obj_clear_flag`->`lv_obj_remove_flag`,
  `lv_obj_add_event_cb`->`lv_obj_add_event`.
- Header comment: `(LVGL v8 ...)` -> `(LVGL v9 ...)`.
- Everything else (styles, flex, fonts, positions, colors, event constants, other widgets,
  pos/size, text setters) is emitted identically in both modes.

## Scope

- `codegen.ts`: `LvMode`/`LvDialect` + `makeDialect`; thread `mode` through
  `genLvgl`/`genLvglProject`/`emitWidget`/`emitEventHandlers`/`lvEventActionLines`/
  `emitImageAssetDecls`/`emitProjectImageAssets`/`genLvglImageAsset`.
- `codegen.test.ts`: a v9 project test (renamed constructors/screen/declare/dsc/cf);
  existing v8 golden tests stay byte-identical (default mode).
- `modules/codegen_exports.tsx`: a `Target: v8 / v9` toggle feeding `mode`, including the
  `.zip` bundle.

Out of scope: the Gauge->scale model setup (scale created but not configured), v9 display
init, `lv_api_map_v8.h` compatibility headers.

## Acceptance Criteria

- [x] v8 mode (default) output is byte-identical to current golden tests.
- [x] v9 mode emits `lv_button_create`, `lv_image_create`, `lv_scale_create`,
      `lv_image_set_src`, `LV_IMAGE_DECLARE`, `lv_image_dsc_t`, `LV_COLOR_FORMAT_RGB565(A8)`,
      `lv_screen_load`, `lv_obj_remove_flag`, `lv_obj_add_event`.
- [x] `genLvglImageAsset(asset, "v9")` emits the v9 descriptor names.
- [x] LVGL Export `Target` toggle switches the shown code and the `.zip`.

## Result

2026-06-14:

- `LvMode`/`LvDialect` + `makeDialect` thread through `genLvgl`/`genLvglProject`/`emitWidget`/
  `emitEventHandlers`/`lvEventActionLines`/`emitImageAssetDecls`/`emitProjectImageAssets`/
  `genLvglImageAsset`. v8 is the default and byte-identical; v9 swaps only the verified
  symbols. LVGL Export gained a `Target: v8 / v9` toggle (also used by the `.zip`).
- Checks: `npm.cmd test` -- 18 files / 169 tests passed; `npm.cmd run build` -- OK with the
  known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed.
- Medium-confidence renames (`clear_flag`->`remove_flag`, `add_event_cb`->`add_event`) are
  applied per slice-19 research; confirm against `lv_api_map_v8.h` if a real v9 build differs.
  Gauge maps to `lv_scale_create` (no meter-specific calls are emitted, so it compiles).
