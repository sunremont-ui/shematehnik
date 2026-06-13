# Current Audit -- UI Designer / LVGL Export

## Date

2026-06-12

## Files Audited

- `platform_app/web/src/design.ts`
- `platform_app/web/src/codegen.ts`
- `platform_app/web/src/modules/UiDesignerView.tsx`
- `platform_app/web/src/modules/codegen_exports.tsx`
- `platform_app/wiki/modules/codegen.md`

## Confirmed Current State

- `uiDesign` stores a flat array of widgets with `id`, `type`, `x`, `y`, `w`, `h`, and `text`.
- `genLvgl(widgets, screen = "main")` returns an object with `c` and `h` strings.
- Pre-slice-03: `genLvglProject(project)` returned project-level multi-screen `c` and `h` strings, but was not yet wired into UI Designer or `.ucp`.
- Current UI Designer and LVGL Export workflow targets a single screen name at a time.
- UI Designer and LVGL Export share the same store, so editing widgets changes generated LVGL output.
- `.ucp` v2 persists `uiDesign` in the top-level `design` envelope.

## Current Strengths

- Small deterministic generator.
- No external dependency required for generation.
- Cross-module workflow exists: UI Designer -> LVGL Export.
- Good candidate for golden-output tests because output is text-only.

## Current Gaps

- Pre-slice-03: no first-class persisted/UI multi-screen model. A generator-only model existed in `genLvglProject()`.
- Minimal style metadata now exists for background color and radius; no theme/font/image asset model yet.
- Minimal event/action metadata now exists for clicked/value_changed callback stubs and screen-load navigation actions; richer action graphs are still pending.
- Minimal Panel layout and child-parent metadata exist; full nested/responsive layout abstraction is still pending.
- No project skeleton export for ESP-IDF, CMake or PlatformIO.
- No explicit LVGL v8/v9 compatibility matrix.
- No SquareLine project import/export bridge.

## Generator Findings

- Current output is best described as LVGL v8-style C.
- `Button` maps to `lv_btn_create`.
- `Image` maps to `lv_img_create`, but there is no image source/asset model.
- The generated screen is created with `lv_obj_create(NULL)`. Project export now emits `ui_init()` and `lv_scr_load(...)`; current-screen export remains a legacy screen-only snippet without a project skeleton.
- The first lab implementation should preserve this baseline with golden-output tests before adding new data fields.
- The second lab implementation added a generator-only multi-screen baseline while preserving the legacy `genLvgl()` path; slice 03 then wired persistence and UI state.

## Initial Promotion Criteria

A lab finding can move into the curated roadmap when it has:

- a clear user workflow;
- a small data-model change;
- deterministic generated output;
- at least one Vitest golden-output test;
- an updated smoke/manual verification path;
- documented limits in `platform_app/wiki/modules/codegen.md`.

## Addendum -- 2026-06-12 UI Project State

The initial audit above captured the pre-wrapper baseline. The follow-up slice now adds:

- `uiProject` as the first-class persisted multi-screen state;
- legacy `uiDesign` as a single-screen compatibility store;
- `.ucp` v2 `design.uiProject` round-trip;
- old `.ucp` v2 `design.uiDesign` migration into one `main` screen;
- UI Designer screen selection and LVGL Export Project / Current screen modes.

## Addendum -- 2026-06-12 Minimal Events

The event slice adds:

- `UiW.event?: { code: "clicked" | "value_changed"; handler: string }`;
- UI Designer property controls for event code and handler name;
- v8 callback stubs generated as `static void handler(lv_event_t *e)` with a user-action TODO;
- `lv_obj_add_event_cb(...)` registration in both single-screen and multi-screen export;
- `.ucp` v2 round-trip coverage through `uiProject`.

## Addendum -- 2026-06-12 Minimal Styles

The style slice adds:

- `UiW.style?: { bgColor?: string; radius?: number }`;
- UI Designer property controls for fill color, swatches and radius;
- v8 `lv_style_t` declarations and init calls;
- `lv_style_set_bg_color`, `lv_style_set_bg_opa`, `lv_style_set_radius` and `lv_obj_add_style(...)`;
- `.ucp` v2 round-trip coverage through `uiProject`.

## Addendum -- 2026-06-13 Minimal Image Assets

The asset placeholder slice adds:

- `UiW.assetId?: string` for `Image` widgets;
- UI Designer property control for the asset id;
- v8 `LV_IMG_DECLARE(asset)` declarations;
- `lv_img_set_src(widget, &asset)` when an asset id exists;
- explicit generated TODO comments for `Image` widgets without an asset id;
- `.ucp` v2 round-trip coverage through `uiProject`.

## Addendum -- 2026-06-13 Minimal Panel Layout

The layout slice adds:

- `UiW.layout?: { kind: "flex_row" | "flex_column"; gap?: number }`;
- UI Designer property controls for `Panel` layout kind and gap;
- v8 `lv_obj_set_layout(widget, LV_LAYOUT_FLEX)` calls;
- v8 `lv_obj_set_flex_flow(...)` for row/column flow;
- v8 pad row/column style setters for the minimal gap value;
- `.ucp` v2 round-trip coverage through `uiProject`.

## Addendum -- 2026-06-13 Minimal Screen Navigation Actions

The action-routing slice adds:

- `UiEvent.action?: { kind: "screen_load"; targetScreenId: string }`;
- UI Designer property controls for `Action` and `Target screen`;
- v8 project export callback bodies that call `lv_scr_load(ui_target)`;
- current-screen export fallback TODOs when the target screen is unavailable in that mode;
- `.ucp` v2 round-trip coverage through `uiProject`.

## Addendum -- 2026-06-13 Minimal Panel Child Parents

The container-parent slice adds:

- `UiW.parentId?: number` for non-Panel widgets;
- same-screen validation so only a `Panel` can be selected as parent;
- UI Designer `Parent panel` property control;
- canvas preview and drag math that keep child coordinates relative to the selected panel;
- LVGL v8 object creation under the panel parent, with parent-before-child emission order;
- `.ucp` v2 round-trip coverage through `uiProject`.

Still open:

- full style/theme/font/image asset model and binary/image file pipeline;
- richer event/action routing beyond direct screen-load callbacks;
- nested containers, auto child reflow and responsive profiles;
- project skeleton export;
- LVGL v9 output mode;
- SquareLine project fixture.
