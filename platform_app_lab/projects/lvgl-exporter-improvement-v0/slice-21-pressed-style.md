# Slice 21 -- Pressed-State Style

## Decision

Add a minimal pressed-state style override (the most common interactive feedback):

- `UiStyle.pressedBgColor` (`#RRGGBB`);
- the generator emits a second `lv_style_t <nm>_style_pressed` with the pressed
  background color/opacity, attached via `lv_obj_add_style(nm, &<nm>_style_pressed,
  LV_PART_MAIN | LV_STATE_PRESSED)`;
- a `Pressed fill` color control in the UI Designer style panel.

## Why This Slice

All current style tokens target the default state only. Pressed feedback (e.g. a button
darkening on touch) is the most common per-state need and demonstrates the multi-style /
state-part path. LVGL needs a separate `lv_style_t` per state, so this proves that shape
narrowly with one token.

## Scope

- `design.ts`: `UiStyle.pressedBgColor`, normalized as a valid hex.
- `codegen.ts`: `lvPressedFor`; declare/attach the pressed style independently of the
  default style (a widget may have only a pressed token).
- `UiDesignerView.tsx`: a `Pressed fill` color control.
- `codegen.test.ts`: pressed style declared + attached with `LV_STATE_PRESSED`; a
  pressed-only widget gets the pressed style but no default; no-pressed output unchanged.
- `project.test.ts`: `pressedBgColor` round-trips through `.ucp` v2.

Out of scope: other pressed tokens (radius/text/border), checked/focused/disabled states,
transitions/animations.

## Generator Contract

`emitStyleDecls` declares `<nm>_style` when `lvStyleFor` is non-null and
`<nm>_style_pressed` when `lvPressedFor` is non-null (independently). `emitStyleAttach`
emits the default style block when present and, separately, the pressed style block
(`lv_style_init` + `bg_color`/`bg_opa` + `lv_obj_add_style(... LV_STATE_PRESSED)`) when
present. A widget with neither emits no style.

## Acceptance Criteria

- [x] `pressedBgColor` emits `static lv_style_t <nm>_style_pressed;` and an
      `lv_obj_add_style(<nm>, &<nm>_style_pressed, LV_PART_MAIN | LV_STATE_PRESSED);`.
- [x] A widget with only `pressedBgColor` emits the pressed style but no default style.
- [x] No `pressedBgColor` -> no pressed style (existing output unchanged).
- [x] `pressedBgColor` round-trips through `.ucp` v2.

## Result

2026-06-14:

- `UiStyle.pressedBgColor` + `lvPressedFor`; `emitStyleDecls`/`emitStyleAttach` declare and
  attach an independent `<nm>_style_pressed` with `LV_STATE_PRESSED` (default style block was
  wrapped in `if (style)` so a pressed-only widget skips the default). UI Designer style
  panel gained a `Pressed fill` control.
- Checks: `npm.cmd test` -- 18 files / 166 tests passed; `npm.cmd run build` -- OK with the
  known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed.
