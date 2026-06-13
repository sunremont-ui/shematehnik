# Slice 08 -- Minimal Screen Navigation Actions

## Date

2026-06-13

## Goal

Turn the existing LVGL event callback fixture into the first useful action route: a widget event can load another UI Designer screen in generated LVGL v8 project output.

This slice intentionally stays below a full action graph. It does not add arbitrary callback bodies, user data payloads, conditions, animation options or application-state bindings.

## Data Model

`UiEvent` keeps the existing required callback shape and now accepts an optional action:

```ts
event?: {
  code: "clicked" | "value_changed";
  handler: string;
  action?: {
    kind: "screen_load";
    targetScreenId: string;
  };
}
```

The field is normalized through the persisted `uiProject` path. Unknown action kinds and empty targets are dropped.

## UI Workflow

Selected widgets with an enabled event expose:

- `Action`: `None` or `Load screen`;
- `Target screen`: a project screen selector shown only for `Load screen`.

The default target is the first screen other than the current one, falling back to the current project screen when there is only one screen.

## LVGL Output

For project export, `genLvglProject()` resolves `targetScreenId` through the generated screen globals and emits:

```c
static void open_settings(lv_event_t *e) {
    (void)e;
    lv_scr_load(ui_settings);
}
```

Current-screen export preserves the legacy path. If it cannot resolve the target screen in that mode, it emits an explicit TODO instead of an invalid screen reference.

## Acceptance Criteria

- Existing no-action event output remains callback-stub compatible.
- `screen_load` action emits `lv_scr_load(ui_<target>)` in project export.
- Screen-load handlers are emitted after screen globals, so generated C has declarations before use.
- `.ucp` v2 preserves event actions through `uiProject`.
- UI Designer -> LVGL Export smoke covers a button event loading a second screen.

## Result

2026-06-13:

- Implemented optional `UiEvent.action` with `screen_load` routing.
- Added UI Designer `Action` and `Target screen` controls.
- Added generator coverage for project-level screen navigation actions.
- Targeted check passed: `npm.cmd test -- codegen.test.ts project.test.ts` -- 51 tests.
- Full check passed: `npm.cmd test` -- 16 files / 138 tests.
- Build check passed: `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning.
- Targeted Playwright smoke printed `ok 1` for `CodeGen LVGL`, then hit the known webServer shutdown timeout.

## Deferred

- custom callback bodies;
- transition animations such as `lv_scr_load_anim`;
- action chains, guards and application state;
- richer event user-data payloads;
- LVGL v9 screen-load naming mode;
- SquareLine project action compatibility.
