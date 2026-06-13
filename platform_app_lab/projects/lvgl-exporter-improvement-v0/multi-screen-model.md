# Multi-Screen Model -- LVGL Exporter

## Status

Implemented as a pure generator model on 2026-06-12, then wired into UI Designer state and `.ucp` persistence in `slice-03-ui-project-state.md`.

## Decision

Introduce a project-level LVGL export shape alongside the existing flat widget list:

```ts
interface LvglScreenDesign {
  id: string;
  title?: string;
  widgets: UiW[];
}

interface LvglProjectDesign {
  screens: LvglScreenDesign[];
  initialScreenId?: string;
}
```

Production API:

- keep `genLvgl(widgets, screen)` as the legacy single-screen export;
- add `genLvglProject(project)` for multi-screen output.
- keep `uiDesign` as a legacy compatibility store;
- persist `uiProject` under `.ucp` v2 `design.uiProject`.

## Compatibility Boundary

- `.ucp` migration is now implemented for the first wrapper: old `design.uiDesign` loads as one `main` screen.
- UI Designer now has a compact screen selector and per-screen widget editing.
- No style/event/asset/layout schema yet.
- Existing `uiDesign` is wrapped as `{ screens: [{ id: "main", widgets: uiDesign }] }` when old files load.
- Generated output stays LVGL v8-style for now.

## Generated Output Contract

`genLvglProject()` emits one `ui.c` and one `ui.h` with:

- one global screen pointer per screen: `ui_main`, `ui_settings`;
- screen-scoped widget globals: `ui_main_Label_1`, `ui_settings_Button_1`;
- one init function per screen: `ui_main_screen_init()`, `ui_settings_screen_init()`;
- project init function: `ui_init()`;
- v8 screen load call for the initial screen: `lv_scr_load(ui_main)`.

Screen-scoped widget names avoid collisions when multiple screens contain widgets with the same local IDs.

## Open Questions

- Resolved in slice 03: screen metadata lives under `design.uiProject`; `design.uiDesign` remains a legacy compatibility field.
- Should UI Designer use tabs, route-like screen list, or a left screen tree?
- Should `ui_init()` load the initial screen by default, or should project skeleton code choose when to load?
- How should future v9 mode select `lv_screen_load()` without destabilizing v8 golden tests?

## Follow-up

Implemented in `slice-04-events.md`:

1. add button/value event metadata to widgets;
2. generate callback declarations and `lv_obj_add_event_cb(...)`;
3. keep event code covered by exact `ui.c/ui.h` golden tests.
