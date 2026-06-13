# Research Plan -- LVGL Exporter Improvement

## Research Questions

1. Which LVGL version should the web exporter target first: v8, v9, or a compatibility subset?
2. What is the smallest multi-screen model that does not break existing `.ucp` files?
3. Which style concepts should be first-class in UCP: colors, fonts, radius, padding, states, or themes?
4. How should events/actions be represented without pretending to generate a full application framework?
5. Should SquareLine bridge work mean import, export, or only compatibility notes for generated LVGL C?

## Primary Sources To Collect

Record source URL, access date and relevant sections before implementation:

- LVGL official docs for objects, screens and styles.
- LVGL official examples for events and layouts.
- LVGL migration notes between the target versions.
- SquareLine Studio public docs for project/export structure if bridge work starts.

Collected notes:

- See `source-notes.md` for LVGL latest/open and LVGL 8.3 URLs collected on 2026-06-12.
- See `compatibility-matrix.md` for the initial v8/current/latest matrix.
- SquareLine docs were not available through the current web tool session; bridge work remains blocked on real fixtures and accessible primary docs.

## Candidate Experiments

| Experiment | Minimal fixture | Expected output |
|---|---|---|
| Multi-screen export | two screens, one label/button | `ui_main_screen_init()`, `ui_settings_screen_init()` and `ui_init()` |
| Style tokens | button with named style | generated style init and attach calls |
| Event callback stub | button click action name | generated callback declaration and registration |
| Screen navigation action | button click target screen | generated callback body with `lv_scr_load(ui_target)` |
| Asset placeholder | image widget with asset id | generated TODO or asset reference with explicit missing-asset warning |
| Layout container | Panel with flex row/column metadata | generated parent object and v8 flex setup calls |
| Container parent | label/button with `parentId` pointing at a Panel | child object is created with the panel as LVGL parent |

## Test Strategy

- Add golden-output tests to `platform_app/web/src/codegen.test.ts`.
- Keep current `genLvgl()` behavior backward-compatible until migration is explicit.
- Use small fixtures with stable IDs and names.
- Add one UI smoke assertion only after the data model and generator are stable.

First selected slice:

- Exact `ui.c/ui.h` golden-output assertions for `genLvgl(widgets, "main")`.
- No generator behavior change in this slice.

Second selected slice:

- Pure multi-screen generator API: `genLvglProject(project)`.
- Two-screen exact golden-output fixture in `platform_app/web/src/codegen.test.ts`.
- No `.ucp` migration or UI Designer screen-tabs in this slice.

Third selected slice:

- Backward-compatible UI project state: `uiProject` plus legacy `uiDesign`.
- `.ucp` v2 `design.uiProject` persistence and old `design.uiDesign` migration.
- UI Designer screen selector and LVGL Export Project / Current screen modes.

Fourth selected slice:

- Minimal widget event metadata: `event?: { code: "clicked" | "value_changed"; handler: string }`.
- LVGL v8 callback stubs plus `lv_obj_add_event_cb(...)` registration.
- UI Designer property controls for event code and handler name.
- Golden-output checks for single-screen and multi-screen event registration, plus `.ucp` round-trip coverage.

Fifth selected slice:

- Minimal widget style metadata: `style?: { bgColor?: "#RRGGBB"; radius?: number }`.
- LVGL v8 `lv_style_t` declarations, init, background color/opacity, radius and `lv_obj_add_style(...)`.
- UI Designer property controls for fill color, swatches and radius.
- Golden-output checks for single-screen and multi-screen style generation, plus `.ucp` round-trip coverage.

Sixth selected slice:

- Minimal image asset placeholder metadata: `assetId?: string` on UI widgets, used by `Image`.
- LVGL v8 `LV_IMG_DECLARE(...)` and `lv_img_set_src(...)` when an asset id exists.
- Explicit generated TODO comments when an `Image` widget has no asset id.
- UI Designer property control for image asset id.
- Golden-output checks, `.ucp` round-trip coverage and a browser smoke for UI Designer -> LVGL Export.

Seventh selected slice:

- Minimal Panel layout metadata: `layout?: { kind: "flex_row" | "flex_column"; gap?: number }`.
- LVGL v8 `lv_obj_set_layout(..., LV_LAYOUT_FLEX)` and `lv_obj_set_flex_flow(...)`.
- Minimal row/column pad setters for gap.
- UI Designer property controls for Panel layout and gap.
- Golden-output checks, `.ucp` round-trip coverage and UI Designer -> LVGL Export smoke coverage.

Eighth selected slice:

- Minimal event action metadata: `event.action?: { kind: "screen_load"; targetScreenId: string }`.
- LVGL v8 project export resolves target screens and emits `lv_scr_load(ui_target)` inside the generated handler.
- UI Designer property controls for Action and Target screen.
- Golden-output checks, `.ucp` round-trip coverage and UI Designer -> LVGL Export smoke coverage.

Ninth selected slice:

- Minimal Panel child-parent metadata: `parentId?: number` on non-Panel widgets.
- UI Designer property control for choosing a same-screen Panel as parent.
- Canvas preview and drag math keep child coordinates relative to the selected Panel.
- LVGL v8 export creates children under the Panel object and emits parents before children.
- Golden-output checks, `.ucp` round-trip coverage and UI Designer -> LVGL Export smoke coverage.

## Promotion Workflow

1. Update this lab with source notes and experiment results.
2. Add or update implementation tests.
3. Update `platform_app/wiki/modules/codegen.md`.
4. Update `platform_app/wiki/roadmap-web.md`.
5. Add a dated `platform_app/wiki/log.md` entry.
