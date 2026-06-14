# Compatibility Matrix -- LVGL Exporter V0

## Status

Seed matrix, 2026-06-12. v8->v9 deltas verified 2026-06-14 (slice 19). This is a lab
artifact, not a final compatibility promise.

## Verified v8 -> v9 Deltas (2026-06-14, slice 19)

Sources: LVGL v9.0 CHANGELOG (raw `release/v9.0/docs/CHANGELOG.rst`) and the v8->v9
migration notes. Strategic finding: **our generator's output is mostly v9-compatible
as-is**; a v9 mode is a small set of targeted renames + the image color-format change,
not a rewrite. Styles, flex, fonts, event constants, positions and colors are unchanged.

| Symbol our generator emits | v9 equivalent | Status | Confidence |
|---|---|---|---|
| `lv_btn_create` | `lv_button_create` | rename (`btn_`->`button_`) | verified (changelog) |
| `lv_img_create` | `lv_image_create` | rename (`img_`->`image_`) | verified |
| `lv_img_set_src` | `lv_image_set_src` | rename | verified |
| `LV_IMG_DECLARE` | `LV_IMAGE_DECLARE` | rename | verified |
| `lv_img_dsc_t` | `lv_image_dsc_t` | rename | verified |
| `.header.cf = LV_IMG_CF_TRUE_COLOR` | `.header.cf = LV_COLOR_FORMAT_RGB565` | format enum change | verified (LV_IMG_CF_*->LV_COLOR_FORMAT_*) |
| `LV_IMG_CF_TRUE_COLOR_ALPHA` (rgb565a8) | `LV_COLOR_FORMAT_RGB565A8` | format enum change | verified pattern; confirm exact RGB565A8 token |
| `lv_meter_create` (Gauge) | `lv_scale_create` (different API) | **removed/replaced** | verified (meter removed -> scale) |
| `lv_scr_load(ui_x)` | `lv_screen_load(ui_x)` | rename (`scr`->`screen`) | verified |
| `lv_obj_clear_flag(..., LV_OBJ_FLAG_SCROLLABLE)` | `lv_obj_remove_flag(...)` | rename (`clear`->`remove`) | medium; confirm vs `lv_api_map_v8.h` |
| `lv_obj_add_event_cb(...)` | `lv_obj_add_event(...)` | rename | medium; compat alias may remain |
| `lv_label_create`/`set_text` | same | unchanged | verified |
| `lv_slider/switch/arc/bar/dropdown/roller/checkbox/textarea/list_create` | same | unchanged | verified (only btn/img/meter renamed) |
| `lv_obj_create` (screen `NULL`, Panel) | same | unchanged | verified |
| `lv_obj_set_pos/size`, `lv_obj_center` | same | unchanged | verified |
| `lv_obj_add_flag(..., LV_OBJ_FLAG_HIDDEN)` | same | unchanged | verified |
| `lv_obj_set_style_opa` | same | unchanged | verified |
| Styles: `lv_style_init`, `lv_style_set_{bg_color,bg_opa,radius,text_color,text_align,text_font,border_width,border_color,pad_all}`, `lv_obj_add_style` | same | unchanged | verified (style API stable in v9) |
| `lv_color_hex`, `LV_OPA_COVER`, `LV_PART_MAIN`, `LV_STATE_DEFAULT`, `LV_TEXT_ALIGN_*` | same | unchanged | verified |
| `lv_font_montserrat_<n>` | same | unchanged | verified |
| Flex: `lv_obj_set_layout`/`set_flex_flow`/`set_flex_align`/`set_flex_grow`, `LV_LAYOUT_FLEX`, `LV_FLEX_FLOW_*`, `LV_FLEX_ALIGN_*`, `lv_obj_set_style_pad_row/column` | same | unchanged | verified (flex unchanged in v9) |
| Events: `LV_EVENT_CLICKED`, `LV_EVENT_VALUE_CHANGED` | same | unchanged | verified |

Net v9-mode work (candidate `v9-mode-candidate.md`): a small rename map
(`btn->button`, `img->image`, `scr->screen`, `LV_IMG_DECLARE->LV_IMAGE_DECLARE`,
`lv_img_dsc_t->lv_image_dsc_t`, `clear_flag->remove_flag`, `add_event_cb->add_event`),
the image color-format swap (`LV_IMG_CF_*` -> `LV_COLOR_FORMAT_*`), and a decision on the
Gauge widget (`lv_meter` -> `lv_scale`, which needs a new scale model or a documented gap).
Everything else passes through unchanged, so a `genLvgl`/`genLvglProject` `mode: "v8" | "v9"`
flag with a symbol map + a golden v9 fixture is the recommended implementation shape.

## Current UCP Generator Baseline

Current files:

- `platform_app/web/src/design.ts`
- `platform_app/web/src/codegen.ts`
- `platform_app/web/src/modules/UiDesignerView.tsx`
- `platform_app/web/src/modules/codegen_exports.tsx`

Current output:

- `ui.c`
- `ui.h`
- one generated screen function: `ui_main_screen_init(void)` by default

Multi-screen output:

- `genLvglProject(project)` emits one `ui.c` and one `ui.h` for multiple screens.
- Each screen gets `ui_<screen>_screen_init(void)`.
- `ui_init(void)` initializes every screen and loads the configured initial screen with v8 `lv_scr_load(...)`.
- Widget globals are screen-scoped to avoid collisions across screens.
- UI Designer persists the project shape as `uiProject` in `.ucp` v2.
- Widgets may optionally carry `event` metadata for `clicked` or `value_changed`; the v8 generator emits callback stubs and `lv_obj_add_event_cb(...)` registrations.
- Event metadata may optionally carry a minimal `screen_load` action; project export emits `lv_scr_load(ui_target)` inside the generated callback after resolving the target screen.
- Widgets may optionally carry minimal `style` metadata for `bgColor` and `radius`; the v8 generator emits `lv_style_t` init and `lv_obj_add_style(...)`.
- `Image` widgets may optionally carry an `assetId`; the v8 generator emits `LV_IMG_DECLARE(...)` and `lv_img_set_src(...)`, or an explicit TODO when the asset is missing.
- `Panel` widgets may optionally carry minimal `layout` metadata for `flex_row` or `flex_column`; the v8 generator emits flex layout setup and gap pad setters.
- Non-Panel widgets may optionally carry `parentId` that points at a same-screen `Panel`; the v8 generator creates child objects under the panel parent and emits parents before children.

Current API flavor:

| Area | Current output | LVGL 8.3 fit | LVGL latest/open fit | Note |
|---|---|---|---|---|
| Screen create | `lv_obj_create(NULL)` | compatible | compatible conceptually | Latest docs also call screens root widgets created with `NULL` parent |
| Screen load | not emitted | missing | missing | Generated app must call the init/load path separately |
| Multi-screen load | `lv_scr_load(ui_main)` in `genLvglProject()` | compatible | v9 naming likely differs | Project export emits init/load; current-screen `genLvgl()` remains legacy |
| Active screen helper | not emitted | n/a | n/a | Future project skeleton should choose v8 `lv_scr_load` or latest `lv_screen_load` |
| Button | `lv_btn_create` | compatible | likely renamed | v9 docs use widget name `lv_button`; API check needed before v9 mode |
| Image | `lv_img_create` | compatible | likely renamed | v9 docs use widget name `lv_image`; API check needed before v9 mode |
| Label | `lv_label_create` | compatible | compatible name | Text setter remains a core concept |
| Position/size | `lv_obj_set_pos`, `lv_obj_set_size` | compatible | compatible for children | Do not apply to screens |
| Events | `lv_obj_add_event_cb(widget, callback, LV_EVENT_*, NULL)` for clicked/value_changed | compatible | compatible conceptually | Minimal callback stubs and screen-load action routing implemented; richer action graph pending |
| Screen action | `lv_scr_load(ui_target)` inside generated event handlers | compatible | v9 naming likely differs | Project export resolves known target screens; current-screen export falls back to TODO if target is unavailable |
| Styles | `lv_style_t`, `lv_style_set_bg_color`, `lv_style_set_bg_opa`, `lv_style_set_radius`, `lv_obj_add_style` | compatible | compatible conceptually | Minimal bgColor/radius tokens implemented; themes/fonts/states pending |
| Layout | `lv_obj_set_layout(..., LV_LAYOUT_FLEX)`, `lv_obj_set_flex_flow(...)`, pad row/column gap for `Panel.layout` | compatible | conceptually compatible, API naming needs v9 check | Minimal Panel layout only; no nested hierarchy or responsive rules yet |
| Object parent | `lv_label_create(ui_Panel_1)` when `parentId` points at a Panel | compatible | compatible conceptually | Minimal same-screen Panel child parent only; no nested Panel or auto-reflow yet |
| Assets | `LV_IMG_DECLARE(asset)` + `lv_img_set_src(widget, &asset)` for `Image.assetId` | compatible | conceptually compatible, API naming needs v9 check | Minimal placeholder only; no binary/image file pipeline |

## Widget Mapping

| UCP type | Current constructor | First support level | Notes |
|---|---|---|---|
| `Label` | `lv_label_create` | text + pos/size | Add long mode later |
| `Button` | `lv_btn_create` + child label | text + pos/size | Good event-callback candidate |
| `Slider` | `lv_slider_create` | pos/size only | Add value/range later |
| `Switch` | `lv_switch_create` | pos/size only | Add state later |
| `Arc` | `lv_arc_create` | range/value hard-coded | Add editable value/range later |
| `Chart` | `lv_chart_create` | pos/size only | Needs data series model |
| `Gauge` | `lv_meter_create` | pos/size only | Needs meter scale model |
| `Bar` | `lv_bar_create` | pos/size only | Add value/range later |
| `Panel` | `lv_obj_create` | pos/size + optional flex layout metadata + optional child object parent target | Minimal container marker; nested containers and responsive profiles still pending |
| `Dropdown` | `lv_dropdown_create` | options from text | Text is overloaded as options |
| `Checkbox` | `lv_checkbox_create` | label text | Add checked state later |
| `Roller` | `lv_roller_create` | options from text | Text is overloaded as options |
| `TextArea` | `lv_textarea_create` | initial text | Add placeholder/password later |
| `Image` | `lv_img_create` | optional `assetId` source binding | Full asset pipeline still pending |
| `NavList` | `lv_list_create` | empty object only | Needs item model |

## Version Strategy

| Option | Benefit | Cost | Decision |
|---|---|---|---|
| Keep v8-only output for now | Matches current generator and existing tests | Does not target latest LVGL naming | Adopt for first slice |
| Add v9 mode immediately | Modernizes output | Requires broad constructor/screen/API audit | Defer |
| Add compatibility abstraction | Enables future v8/v9 generator modes | Needs stable golden tests first | Prepare after baseline tests |

## First Implementation Slice Candidate

Chosen: golden-output tests for existing v8 single-screen exporter.

Why:

- protects current user workflow;
- does not mutate `.ucp` format;
- gives a baseline before multi-screen/styles/events changes;
- lets future v9 work be explicit instead of accidental.

Next slice after the first matrix:

1. Added `genLvglProject()` as a multi-screen model.
2. Kept `genLvgl(widgets, screen)` backward-compatible.
3. Wired `uiProject` into UI Designer state and `.ucp` v2 persistence.
4. Added minimal clicked/value_changed event callback stubs after the persisted screen model.
5. Added minimal bgColor/radius style tokens with LVGL style attachment.
6. Added minimal Image `assetId` placeholders with `LV_IMG_DECLARE` and `lv_img_set_src`.
7. Added minimal Panel flex layout metadata with `lv_obj_set_layout`, `lv_obj_set_flex_flow` and gap pad setters.
8. Added minimal `screen_load` event action routing with `lv_scr_load(ui_target)`.
9. Added minimal Panel child-parent metadata with same-screen parent validation and LVGL child object creation under the Panel.
10. Defer full asset pipeline, nested/responsive layouts, richer action graphs, themes/fonts/states and v9 mode to later slices.
