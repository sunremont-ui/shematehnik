# Slice 17 -- Extended Style Tokens (text, border, padding)

## Decision

Extend the slice-05 `UiStyle` (bgColor/radius) with five common LVGL v8 style
properties, all flowing through the existing per-widget `lv_style_t`:

- `textColor` (`#RRGGBB`) -> `lv_style_set_text_color(&s, lv_color_hex(0x..))`;
- `textAlign` (`left`/`center`/`right`) -> `lv_style_set_text_align(&s, LV_TEXT_ALIGN_*)`;
- `borderWidth` (>= 1) -> `lv_style_set_border_width(&s, n)`;
- `borderColor` (`#RRGGBB`) -> `lv_style_set_border_color(&s, lv_color_hex(0x..))`;
- `pad` (>= 1) -> `lv_style_set_pad_all(&s, n)`;
- UI Designer style panel gains Text color / Text align / Border / Border color /
  Padding controls.

## Why This Slice

Style was limited to background + radius. Text color/alignment, borders and padding
are the next most common LVGL presentation knobs and reuse the existing
`lvStyleFor`/`emitStyleAttach`/`emitStyleDecls` machinery (one `lv_style_t` per widget),
so they add no new generation structure.

## Scope

- `design.ts`: `UiStyle.{textColor,textAlign,borderWidth,borderColor,pad}`,
  `UiTextAlign`/`UI_TEXT_ALIGNS`, strict normalization (valid hex; enum; ints >= 1).
- `codegen.ts`: `LV_TEXT_ALIGN` map; extend `lvStyleFor` + `emitStyleAttach`.
- `UiDesignerView.tsx`: the five new style controls.
- `codegen.test.ts`: full-token emission; bgColor/radius-only output unchanged.
- `project.test.ts`: the new tokens round-trip through `.ucp` v2.

Out of scope: per-state styles, gradients, shadows, outline, per-side padding,
custom fonts (font handle/selection is a later slice).

## Generator Contract

`lvStyleFor` returns non-null when any token is set; `emitStyleAttach` emits
`lv_style_init` + each set token + `lv_obj_add_style`. A widget with no tokens emits no
style (slice-05 output preserved). `borderWidth`/`pad` of 0 are treated as unset.

## Acceptance Criteria

- [x] No-style widget emits no `lv_style_*` (existing output unchanged).
- [x] bgColor/radius-only output is unchanged from slice 05.
- [x] Full tokens emit text color/align, border width/color and `pad_all`.
- [x] New tokens round-trip through `.ucp` v2; invalid values are dropped.

## Result

2026-06-14:

- Extended `UiStyle` + `UiTextAlign`/`UI_TEXT_ALIGNS`, the `LV_TEXT_ALIGN` map, restructured
  `lvStyleFor`/`emitStyleAttach`, and added Text color / Text align / Border / Border color /
  Padding controls to the UI Designer style panel.
- Checks: `npm.cmd test` -- 17 files / 159 tests passed; `npm.cmd run build` -- OK with the
  known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed.
- e2e note: the new `Text align` style control made the substring `getByLabel("Align")`
  ambiguous, so the layout-align selector became `getByLabel(/^Align/)` (a select's
  accessible name includes its selected option text, so `{ exact: true }` did not match).
