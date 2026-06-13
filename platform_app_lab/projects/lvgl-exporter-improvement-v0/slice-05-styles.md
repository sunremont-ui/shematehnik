# Slice 05 -- Minimal LVGL Styles

## Decision

Add the smallest useful style-token model to persisted UI widgets:

- `style?: { bgColor?: "#RRGGBB"; radius?: number }`;
- generated v8 `lv_style_t` declarations and initialization;
- generated background color/opacity, radius and style attachment calls;
- UI Designer controls for fill color, swatches and radius.

## Why This Slice

The exporter now has stable screen state and event metadata. Background color and radius are a narrow style fixture that proves the style pipeline without committing to themes, fonts, states or a full visual design system.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: add `UiStyle`, `UI_STYLE_SWATCHES` and style normalization.
- `platform_app/web/src/codegen.ts`: emit `lv_style_t` declarations, `lv_style_init`, background color/opacity, radius and `lv_obj_add_style(...)`.
- `platform_app/web/src/modules/UiDesignerView.tsx`: add Fill, swatches, Radius and Clear style controls; reflect style in the preview.
- `platform_app/web/src/codegen.test.ts`: add single-screen and multi-screen style output assertions.
- `platform_app/web/src/project.test.ts`: keep style metadata through `.ucp` v2 `uiProject` round-trip.

Out of scope:

- style names shared between widgets;
- fonts, text color, padding, state-specific styles or themes;
- image assets;
- LVGL v9 output mode.

## Acceptance Criteria

- [x] Existing no-style golden output remains unchanged.
- [x] Background color emits `lv_style_set_bg_color(...)` and `LV_OPA_COVER`.
- [x] Radius emits `lv_style_set_radius(...)`.
- [x] Project export uses screen-scoped style variable names.
- [x] Style metadata round-trips through `.ucp` v2.

## Result

2026-06-12:

- Implemented minimal style tokens and UI controls.
- Checks passed: `npm.cmd test -- codegen.test.ts project.test.ts` (46 tests), `npm.cmd test` (16 files / 133 tests), `npm.cmd run build` and Playwright fallback smoke for UI Designer Fill/Radius controls -> LVGL Export style registration.
- Browser-harness status: Chrome is running, but the harness daemon/browser connection is still unavailable; direct stdin invocation currently fails through the uv/python shim after reinstall.

## Next Candidate Slice

Assets are now the next useful vertical slice:

- an image/source placeholder for `Image` widgets;
- generated explicit missing-asset TODO or `lv_img_set_src(...)` when an asset id exists;
- golden-output coverage without claiming a full asset pipeline.
