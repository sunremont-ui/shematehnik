# Slice 04 -- Minimal LVGL Events

## Decision

Add the smallest useful event/action model to persisted UI widgets:

- `event?: { code: "clicked" | "value_changed"; handler: string }`;
- generated v8 callback stubs;
- generated `lv_obj_add_event_cb(...)` registration;
- UI Designer controls for event code and handler name.

## Why This Slice

Screens and `.ucp` project state are now stable enough to attach widget metadata. Event callback stubs are useful immediately for buttons and sliders, but they do not pretend to generate a full application framework.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: add `UiEventCode`, `UiEvent`, `UI_EVENT_CODES` and event normalization.
- `platform_app/web/src/codegen.ts`: emit deduplicated static callback stubs and event registrations in both `genLvgl()` and `genLvglProject()`.
- `platform_app/web/src/modules/UiDesignerView.tsx`: add Event and Handler property controls.
- `platform_app/web/src/codegen.test.ts`: add single-screen and multi-screen event output assertions.
- `platform_app/web/src/project.test.ts`: keep event metadata through `.ucp` v2 `uiProject` round-trip.

Out of scope:

- action graphs or screen navigation actions;
- custom user data payloads;
- event-specific code bodies beyond TODO stubs;
- LVGL v9 output mode.

## Acceptance Criteria

- [x] Existing no-event golden output remains unchanged.
- [x] Clicked widgets emit `LV_EVENT_CLICKED`.
- [x] Value-changed widgets emit `LV_EVENT_VALUE_CHANGED`.
- [x] Handler names are sanitized by the existing C identifier helper.
- [x] Event metadata round-trips through `.ucp` v2.

## Result

2026-06-12:

- Implemented the minimal event model and UI controls.
- Targeted checks passed: `npm.cmd test -- codegen.test.ts project.test.ts` (44 tests).
- Full checks passed: `npm.cmd test` (131 tests), `npm.cmd run build`, and Playwright fallback smoke for UI Designer event controls -> LVGL Export callback registration.

## Next Candidate Slice

Style tokens are now the next good vertical slice:

- a minimal named style on widgets;
- generated `lv_style_t` init and attach calls;
- one or two editable properties such as background color and radius;
- golden-output coverage before adding broad theme controls.

Follow-up:

- Implemented as `slice-05-styles.md`.
