# Slice 19 -- LVGL v9 Research (no code)

## Decision

Research-only slice: verify the v8->v9 API differences for every symbol our generator
emits, against official LVGL v9 sources, and record them in `compatibility-matrix.md`
plus a candidate implementation plan (`v9-mode-candidate.md`). No code changes.

## Why This Slice

The v8 surface is now broad (slices 1-18). Before adding more v8 output or attempting a
v9 mode, the v8/v9 boundary had to be pinned to real sources -- per the lab rule, no
compatibility may be claimed without verification.

## Sources

- LVGL v9.0 CHANGELOG (raw `release/v9.0/docs/CHANGELOG.rst`).
- LVGL v8->v9 migration notes (docs.lvgl.io 9.x, migration discussion).

## Findings (summary; full table in `compatibility-matrix.md`)

- Most of our output is unchanged in v9: styles, flex, fonts, event constants, positions,
  colors, and all widgets except button/image/meter.
- Verified renames: `lv_btn_create`->`lv_button_create`, `lv_img_*`->`lv_image_*`
  (`lv_img_create`, `lv_img_set_src`, `LV_IMG_DECLARE`->`LV_IMAGE_DECLARE`,
  `lv_img_dsc_t`->`lv_image_dsc_t`), `lv_scr_load`->`lv_screen_load`.
- Image color format: `LV_IMG_CF_*` -> `LV_COLOR_FORMAT_*` (TRUE_COLOR -> RGB565,
  TRUE_COLOR_ALPHA -> RGB565A8); `lv_color_t` is now always RGB888.
- `lv_meter` removed -> `lv_scale` (different API) -- our Gauge widget needs a decision.
- Medium-confidence (confirm vs `lv_api_map_v8.h`): `lv_obj_clear_flag`->`lv_obj_remove_flag`,
  `lv_obj_add_event_cb`->`lv_obj_add_event`.

## Outcome

- `compatibility-matrix.md`: added a verified "v8 -> v9 Deltas" table.
- `v9-mode-candidate.md`: a concrete plan for a future `mode: "v8" | "v9"` generator flag
  built as a symbol-rename map + image color-format swap + a Gauge/meter decision, with a
  golden v9 fixture. Not implemented in this slice.

## Acceptance Criteria

- [x] Every symbol the generator emits has a verified v9 status in the matrix.
- [x] Renames vs unchanged vs removed are separated, with confidence + source.
- [x] A candidate v9-mode implementation shape is written down before any v9 code.

## Result

2026-06-14: research complete; matrix + candidate plan written. Documentation-only slice
(no Vitest/build changes). Recommended next code slice when v9 is wanted: implement the
`v9-mode-candidate.md` plan behind a generator `mode` flag with a new golden fixture.
