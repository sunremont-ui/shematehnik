# Source Notes -- LVGL Exporter Improvement

## Collection Date

2026-06-12

## Source Boundary

Primary sources only for implementation decisions. Lab notes may include interpretation, but curated wiki claims should stay limited to verified facts.

## LVGL Latest / Open Docs

Source URLs:

- https://lvgl.io/docs/open
- https://lvgl.io/docs/open/CHANGELOG
- https://lvgl.io/docs/open/common-widget-features/screens
- https://lvgl.io/docs/open/common-widget-features/coordinates
- https://lvgl.io/docs/open/common-widget-features/styles/overview
- https://lvgl.io/docs/open/common-widget-features/events
- https://lvgl.io/docs/open/common-widget-features/layouts/overview
- https://lvgl.io/docs/open/common-widget-features/layouts/flex
- https://lvgl.io/docs/open/widgets
- https://lvgl.io/docs/open/widgets/button
- https://lvgl.io/docs/open/widgets/image
- https://lvgl.io/docs/open/widgets/label

Observed facts:

- The latest/open docs identify the current line as LVGL v9.5 in the changelog, with v9.5.0 dated 2026-02-18.
- Screens are widgets created with `NULL` as parent and form the root of the widget tree.
- Latest screen APIs use `lv_screen_active`, `lv_screen_load` and `lv_screen_load_anim`.
- Screen position/size should not be set; screen resolution follows the display.
- Coordinate concepts are CSS-like: parent-child movement, clipping by parent, style-backed coordinates, pixel/percentage/content units, and flex/grid layout support.
- Styles are `lv_style_t` variables; styles can be assigned to widgets, parts and states, cascade, inherit selected properties and be overridden by local styles.
- Events are attached with `lv_obj_add_event_cb(widget, callback, event_code, user_data)`; relevant first-slice events include `LV_EVENT_CLICKED` and `LV_EVENT_VALUE_CHANGED`.
- Layouts are assigned with `lv_obj_set_layout(widget, <LAYOUT_NAME>)`; built-ins are Flexbox and Grid.
- Flex is a subset of CSS Flexbox, requires `LV_USE_FLEX`, and supports flow, alignment, grow and gaps.
- Latest widget naming in docs uses `lv_button`, `lv_image`, `lv_label`, while the current UCP generator emits v8-style `lv_btn_create` and `lv_img_create`.

## LVGL 8.3 Docs

Source URLs:

- https://docs.lvgl.io/8.3/overview/object.html
- https://docs.lvgl.io/8.3/overview/coords.html
- https://docs.lvgl.io/8.3/overview/style.html
- https://docs.lvgl.io/8.3/overview/event.html
- https://docs.lvgl.io/8.3/layouts/flex.html
- https://docs.lvgl.io/8.3/widgets/core/btn.html
- https://docs.lvgl.io/8.3/widgets/core/img.html
- https://docs.lvgl.io/8.3/widgets/core/label.html

Observed facts:

- v8.3 examples use `lv_scr_act()` as the active screen parent in simple widget snippets.
- v8.3 button creation uses `lv_btn_create(parent)`.
- v8.3 image creation uses `lv_img_create(parent)` and `lv_img_set_src(...)`.
- v8.3 label creation uses `lv_label_create(parent)` and `lv_label_set_text(...)`.
- v8.3 events also use `lv_obj_add_event_cb(...)`.
- v8.3 styles expose `lv_style_t` and setters such as `lv_style_set_bg_color`, `lv_style_set_text_font`, `lv_style_set_pad_row` and `lv_style_set_pad_column`.
- v8.3 flex uses `LV_LAYOUT_FLEX` and style/function APIs around `LV_FLEX_FLOW_*`, `LV_FLEX_ALIGN_*` and `LV_STYLE_FLEX_*`.

## SquareLine Studio

Attempted source URLs:

- https://docs.squareline.io/
- https://docs.squareline.io/docs/intro
- https://docs.squareline.io/docs/exporting/project-export
- https://squareline.io/docs

Result:

- No reliable page content was available through the current web tool session.
- Keep SquareLine bridge as a research target only.
- Do not claim import/export compatibility until a real SquareLine project or generated fixture is added to the lab and verified.

## Immediate Interpretation

The current UCP exporter should be treated as a v8-compatible direct C generator. The first implementation slice should preserve v8 output and add tests/documentation before any v9 mode or richer data model.
