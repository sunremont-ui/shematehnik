# Slice 18 -- Built-in Font Size Token

## Decision

Complete the text-style story with a font selection limited to LVGL's built-in
Montserrat fonts:

- `UiStyle.font?: number` -- one of a fixed allowed set of Montserrat sizes;
- `UI_FONT_SIZES = [12,14,16,18,20,24,28,32]`;
- generator emits `lv_style_set_text_font(&s, &lv_font_montserrat_<n>)` when set;
- a `Font` select in the UI Designer style panel.

## Why This Slice

Slice 17 added text color and alignment but not the font itself. Built-in Montserrat
fonts are always available when enabled in `lv_conf.h`, need no font asset embedding,
and reuse the slice-17 `lv_style_t`/`emitStyleAttach` path -- the narrowest way to close
the text-style gap. Custom/imported font binaries stay out of scope.

## Scope

- `design.ts`: `UiStyle.font`, `UI_FONT_SIZES`, normalization (integer in the set).
- `codegen.ts`: extend `lvStyleFor`/`emitStyleAttach` with the font token.
- `UiDesignerView.tsx`: a `Font` select.
- `codegen.test.ts`: font emitted when set; absent otherwise.
- `project.test.ts`: `font` round-trips through `.ucp` v2.

Out of scope: imported/binary fonts, per-state fonts, non-Montserrat families.

## Acceptance Criteria

- [x] `font: 24` emits `lv_style_set_text_font(&<s>, &lv_font_montserrat_24);`.
- [x] No `font` -> no text-font call (slice-17 output unchanged).
- [x] An out-of-set / non-integer font is dropped in normalization.
- [x] `font` round-trips through `.ucp` v2.

## Result

2026-06-14:

- `UiStyle.font` + `UI_FONT_SIZES`, the `lv_style_set_text_font(&s, &lv_font_montserrat_<n>)`
  emit in `lvStyleFor`/`emitStyleAttach`, and a `Font` select in the UI Designer style panel.
- Checks: `npm.cmd test` -- 17 files / 160 tests passed; `npm.cmd run build` -- OK with the
  known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed.
- Built-in Montserrat fonts assume the matching `LV_FONT_MONTSERRAT_<n>` is enabled in
  `lv_conf.h`; imported/binary fonts stay out of scope.
