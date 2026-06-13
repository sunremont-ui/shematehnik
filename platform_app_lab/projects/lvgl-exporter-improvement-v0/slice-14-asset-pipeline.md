# Slice 14 -- Binary Image Asset Pipeline (RGB565 inline)

## Decision

Generate real LVGL C image data for manifest assets that carry decoded pixels,
keeping the scope to one format:

- extend `UiAsset` with optional `w`, `h`, `format: "rgb565"`, `data: number[]`
  (decoded little-endian RGB565 bytes, `data.length === w*h*2`);
- a pure `rgbaToRgb565(width, height, rgba)` helper in `src/image.ts` converts
  canvas `ImageData` bytes to that manifest shape;
- a pure `genLvglImageAsset(asset)` emits a `static const uint8_t <id>_map[]` byte
  array plus a `const lv_img_dsc_t <id>` descriptor (`LV_IMG_CF_TRUE_COLOR`);
- `genLvglProject()` emits the descriptor for assets with valid pixel data and keeps
  `LV_IMG_DECLARE(...)` for declare-only manifest/used assets;
- UI Designer LVGL Export manifest rows gain an image file import (canvas -> RGB565).

## Why This Slice

Slice 10 gave a manifest of image ids/sources but the generator could only `extern`
them via `LV_IMG_DECLARE`. A real exporter must be able to embed a small icon so the
generated `ui.c` compiles and shows the image without hand-written asset files. RGB565
`TRUE_COLOR` is the simplest LVGL pixel format and keeps the byte conversion a pure,
testable function.

## Scope Decision (pixel source)

Pixels are decoded in the browser via `<input type=file>` -> `Image` -> `canvas`
`getImageData` -> `rgbaToRgb565`. The conversion and the C generation are pure and
unit-tested with tiny fixtures; the canvas decode is UI-only (manual/e2e). Inline data
is meant for small icons -- large images bloat the `.ucp` JSON (documented caveat).

## Scope

Code/test:

- `platform_app/web/src/design.ts`: `UiAsset.{w,h,format,data}`, normalized strictly
  (kept only when `format==="rgb565"`, `w>=1`, `h>=1`, `data.length===w*h*2`).
- `platform_app/web/src/image.ts` (+ `image.test.ts`): `rgbaToRgb565`.
- `platform_app/web/src/codegen.ts`: `genLvglImageAsset` + integration in
  `emitProjectImageAssets`.
- `platform_app/web/src/codegen.test.ts`: descriptor emission, declare fallback,
  `genLvglImageAsset` null for missing data.
- `platform_app/web/src/project.test.ts`: inline `data` round-trips through `.ucp` v2.
- `platform_app/web/src/modules/codegen_exports.tsx`: per-row image import.

Out of scope:

- formats other than RGB565 `TRUE_COLOR` (no alpha/indexed/RAW);
- asset folder/skeleton/CMake export;
- image resizing / palette / compression;
- e2e of the canvas decode (covered by Vitest on the pure helpers).

## Generator Contract

In `emitProjectImageAssets` with a non-empty manifest:

- manifest entry with valid pixel data -> emit `genLvglImageAsset(asset)` descriptor
  block (no `LV_IMG_DECLARE`); `lv_img_set_src(widget, &id)` still resolves;
- manifest entry without data -> `LV_IMG_DECLARE(id); // src: <path>` (unchanged);
- used widget asset absent from the manifest -> `LV_IMG_DECLARE` + missing TODO;
- empty/absent manifest -> slice-06 declaration behavior unchanged.

## Acceptance Criteria

- [x] `rgbaToRgb565` packs RGBA into little-endian RGB565 (`data.length === w*h*2`).
- [x] Manifest asset with pixel data emits `static const uint8_t <id>_map[]` and
      `const lv_img_dsc_t <id>` with correct `.header.w/.h` and `.data_size`.
- [x] A data-backed asset is not also `LV_IMG_DECLARE`d.
- [x] Declare-only manifest/used assets keep slice-10 behavior.
- [x] Inline `data` round-trips through `.ucp` v2; invalid data is dropped.

## Result

2026-06-13:

- Added `UiAsset.{w,h,format,data}` with strict normalization, the pure
  `rgbaToRgb565`/`hasInlinePixels` helpers in `src/image.ts`, `genLvglImageAsset` and
  its integration in `emitProjectImageAssets`, plus a per-row image import (canvas ->
  RGB565) in the LVGL Export manifest editor.
- Checks: `npm.cmd test` -- 17 files / 153 tests passed (new `image.test.ts`);
  `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted
  Playwright `CodeGen LVGL` -- 1 passed (run via `node node_modules/@playwright/test/cli.js`;
  see slice 10 shell note). Canvas decode is exercised manually; Vitest covers the pure
  conversion and C generation.

## Next Candidate Slice

- A second asset format (e.g. `LV_IMG_CF_TRUE_COLOR_ALPHA` / ARGB8888) or PNG-RAW.
- Or nested/responsive layout work (breakpoints, percent sizes).
- Or a research-only LVGL v9 compatibility matrix before any v9 codegen.
