# Slice 15 -- Second Image Format: RGB565A8 (TRUE_COLOR_ALPHA)

## Decision

Add an alpha-capable image format alongside slice-14 RGB565:

- `UiAsset.format` becomes `"rgb565" | "rgb565a8"`;
- `rgb565a8` stores 3 bytes/pixel (2 little-endian RGB565 + 1 alpha), `data.length === w*h*3`;
- pure `rgbaToRgb565a8(width, height, rgba)` helper;
- `genLvglImageAsset` selects `.header.cf = LV_IMG_CF_TRUE_COLOR_ALPHA` for `rgb565a8`;
- a second `imgα` import button in the manifest editor.

## Why This Slice

Slice 14 only emitted opaque RGB565. Icons with transparency need an alpha channel;
`LV_IMG_CF_TRUE_COLOR_ALPHA` is LVGL's standard 16-bit + alpha-byte format and reuses
the slice-14 descriptor shape, so it is the narrowest second format.

## Scope

- `design.ts`: `format` union + `bpp` (2 or 3) gating in `normalizeUiAssets`.
- `image.ts` (+ test): `rgbaToRgb565a8`; `hasInlinePixels` handles both formats.
- `codegen.ts`: `genLvglImageAsset` picks `cf` by format.
- `codegen.test.ts`: alpha descriptor `cf` + `data_size === w*h*3`.
- `project.test.ts`: alpha asset round-trips through `.ucp` v2.
- `codegen_exports.tsx`: `imgα` import using `rgbaToRgb565a8`.

Out of scope: indexed/RAW/PNG-compressed formats, alpha pre-multiplication, dithering.

## Acceptance Criteria

- [x] `rgbaToRgb565a8` packs 3 bytes/pixel (rgb565 LE + alpha), `data.length === w*h*3`.
- [x] `rgb565a8` asset emits `.header.cf = LV_IMG_CF_TRUE_COLOR_ALPHA` and `.data_size = w*h*3`.
- [x] `rgb565` path is unchanged.
- [x] alpha `data` round-trips through `.ucp` v2; wrong length is dropped (`bpp` gating).

## Result

2026-06-14:

- `UiAssetFormat` union + `bpp` gating, `rgbaToRgb565a8`/`bytesPerPixel`, `cf` selection
  in `genLvglImageAsset`, and an `imgα` import button. Verified in the slice-15/16 batch:
  `npm.cmd test` -- 17 files / 157 tests; `npm.cmd run build` -- OK; targeted Playwright
  `CodeGen LVGL` -- 1 passed.
