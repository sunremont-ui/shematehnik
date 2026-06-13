# Slice 06 -- Minimal LVGL Image Asset Placeholder

## Decision

Add the smallest useful image-asset placeholder to persisted UI widgets:

- `assetId?: string` on `UiW`;
- UI Designer property control for `Image` widgets;
- generated v8 `LV_IMG_DECLARE(asset)` declarations;
- generated `lv_img_set_src(widget, &asset)` when an asset id exists;
- explicit TODO comment when an `Image` widget has no asset id.

## Why This Slice

The exporter already has stable screens, event metadata and minimal style tokens. `Image` widgets previously mapped to `lv_img_create(...)` but had no source model, so generated C could not show the user's intended image reference. This slice proves the data-model and generator path without claiming a full file/asset pipeline.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: add `assetId` normalization for UI widgets.
- `platform_app/web/src/codegen.ts`: emit image declarations and `lv_img_set_src(...)`.
- `platform_app/web/src/modules/UiDesignerView.tsx`: add an `Asset id` field for selected `Image` widgets and show it in the preview.
- `platform_app/web/src/codegen.test.ts`: add single-screen missing/present asset checks and project-level declaration dedupe.
- `platform_app/web/src/project.test.ts`: keep `assetId` through `.ucp` v2 round-trip and legacy migration.
- `platform_app/web/e2e/smoke.spec.ts`: extend the UI Designer -> LVGL Export smoke with an image asset id.

Out of scope:

- image file import/upload;
- binary C array generation;
- asset folder/project skeleton export;
- font/theme/style asset catalogs;
- SquareLine project asset compatibility.

## Acceptance Criteria

- [x] Existing no-image golden output remains unchanged.
- [x] `Image` with `assetId: "img_logo"` emits `LV_IMG_DECLARE(img_logo);`.
- [x] Generated widget init emits `lv_img_set_src(ui_Image_1, &img_logo);`.
- [x] Reused asset ids are declared once in project export.
- [x] Missing image assets are explicit TODO comments, not silent empty output.
- [x] `assetId` round-trips through `.ucp` v2.

## Result

2026-06-13:

- Implemented minimal image asset placeholders in the UI model, generator and UI Designer.
- Checks passed: `npm.cmd test -- codegen.test.ts project.test.ts` (48 tests), `npm.cmd test` (16 files / 135 tests), `npm.cmd run build` and a one-shot Vite + Chromium browser smoke for UI Designer Image asset -> LVGL Export.
- `npm.cmd run test:e2e -- --grep "CodeGen LVGL"` printed `ok 1`, then hit the known Playwright webServer shutdown timeout.
- `browser-harness` remains unavailable in this environment because the uv/python shim fails to create its process; browser verification used Playwright instead.

## Next Candidate Slice

Layout containers are now the next useful vertical slice:

- a minimal layout metadata field for `Panel` containers;
- generated v8 flex layout calls for one simple flow;
- UI controls that do not imply a full responsive layout system;
- golden-output and browser smoke coverage.
