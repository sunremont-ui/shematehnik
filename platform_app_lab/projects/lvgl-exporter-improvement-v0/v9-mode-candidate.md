# Candidate Plan -- LVGL v9 Generator Mode

Status: candidate (not implemented). Derived from slice 19 research; see the verified
delta table in `compatibility-matrix.md`.

## Shape

Add a `mode: "v8" | "v9"` parameter to `genLvgl`/`genLvglProject` (default `"v8"` to keep
all current golden tests and `.ucp` files unchanged). v9 differs from v8 only by a small
symbol map + the image color-format swap + a Gauge decision, so the generator stays one
code path with mode-keyed lookups, not a fork.

## Symbol map (v8 -> v9)

- Constructors: `lv_btn_create`->`lv_button_create`, `lv_img_create`->`lv_image_create`.
- Image: `lv_img_set_src`->`lv_image_set_src`, `LV_IMG_DECLARE`->`LV_IMAGE_DECLARE`,
  `lv_img_dsc_t`->`lv_image_dsc_t`.
- Image color format: `LV_IMG_CF_TRUE_COLOR`->`LV_COLOR_FORMAT_RGB565`,
  `LV_IMG_CF_TRUE_COLOR_ALPHA`->`LV_COLOR_FORMAT_RGB565A8` (confirm exact RGB565A8 token).
- Screen: `lv_scr_load`->`lv_screen_load`.
- Flags/events (confirm vs `lv_api_map_v8.h` first): `lv_obj_clear_flag`->`lv_obj_remove_flag`,
  `lv_obj_add_event_cb`->`lv_obj_add_event`.
- Everything else (styles, flex, fonts, positions, colors, event constants, other widgets)
  is emitted identically in both modes.

## Open decision: Gauge / lv_meter

`lv_meter` is removed in v9 (replaced by `lv_scale`, different API). Options:
1. Map Gauge -> `lv_scale_create` with a minimal scale setup (needs a small scale model).
2. Emit a documented `/* TODO: Gauge has no direct v9 equivalent; use lv_scale */` in v9 mode.

Recommend option 2 for the first v9 slice (keep it narrow), option 1 as a follow-up.

## Implementation steps (future slice)

1. Introduce a `LvDialect` table keyed by mode for the renamable symbols above.
2. Thread `mode` through `emitWidget`/`emitProjectImageAssets`/`genLvglImageAsset`/screen load.
3. Add a v9 golden fixture in `codegen.test.ts` mirroring the v8 baseline.
4. Add a Mode (v8/v9) toggle in the LVGL Export view; default v8.
5. Keep all existing v8 golden tests byte-identical.

## Acceptance (for the future slice)

- v8 mode output byte-identical to current golden tests.
- v9 mode renames exactly the verified symbols and swaps the image color format.
- Gauge in v9 mode follows the chosen decision with a deterministic, documented output.
