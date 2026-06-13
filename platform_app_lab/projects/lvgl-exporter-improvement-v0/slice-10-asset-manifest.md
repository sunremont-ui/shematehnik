# Slice 10 -- Minimal Project Image Asset Manifest

## Decision

Add the smallest useful project-level image-asset manifest, separate from the
per-widget `assetId` placeholder introduced in slice 06:

- `UiAsset { id: string; src?: string }` and `UiProjectDesign.assets?: UiAsset[]`;
- normalization + `.ucp` v2 round-trip for the manifest;
- `genLvglProject()` emits `LV_IMG_DECLARE(...)` for the union of manifest entries
  and used widget assets, with a `// src: <path>` comment on declared sources;
- a missing-asset report: widget assets used but not declared in the manifest get
  an explicit `/* TODO: ... not declared in the project asset manifest */` line;
- a minimal manifest editor in the LVGL Export view (add/remove id + src rows).

## Why This Slice

Slice 06 gave `Image` widgets an `assetId` and emitted declarations straight from
widgets. There was no place to record an asset's source or to tell which referenced
ids are actually known to the project. The manifest is the narrowest way to close
that gap: it lets a project declare its real image sources, dedupe declarations,
and surface "used but undeclared" references -- without touching binary generation
or a file/upload pipeline.

## Scope

Code/test:

- `platform_app/web/src/design.ts`: `UiAsset`, `UiProjectDesign.assets`,
  `normalizeUiAssets`, wired into `normalizeUiProject` (omit key when empty).
- `platform_app/web/src/codegen.ts`: `emitProjectImageAssets()` for the project
  path; single-screen `emitImageAssetDecls` unchanged (no manifest concept).
- `platform_app/web/src/modules/codegen_exports.tsx`: manifest editor in the LVGL
  Export view.
- `platform_app/web/src/codegen.test.ts`: manifest declaration with `// src`,
  union/dedupe across screens, missing-asset warning, and unchanged no-manifest
  output.
- `platform_app/web/src/project.test.ts`: `assets` survives `.ucp` v2 round-trip.
- `platform_app/web/e2e/smoke.spec.ts`: declare an asset src and see the comment.

Out of scope:

- image file import/upload and binary C array generation;
- asset folder/project skeleton export;
- font/theme/style asset catalogs;
- SquareLine project asset compatibility;
- declared-but-unused reporting (only used-but-undeclared is reported).

## Generator Contract

For `genLvglProject(project)` with `assets = project.assets ?? []`:

- `assets.length === 0`: identical to slice 06 -- declare `LV_IMG_DECLARE(id)` per
  used widget asset, deduped, no warnings. No behavior change for legacy projects.
- `assets.length > 0`:
  - declarations = manifest ids (in manifest order, deduped) then used widget asset
    ids not already declared; one `LV_IMG_DECLARE` each;
  - manifest entries with a `src` get a trailing `// src: <path>` comment;
  - for each used widget asset id absent from the manifest, emit
    `/* TODO: image asset "<id>" is used but not declared in the project asset manifest */`.

All ids pass through the existing `cident` mapping so they match the C identifiers
used by `lv_img_set_src`.

## Acceptance Criteria

- [x] No-manifest project output is byte-identical to slice 06 (golden/dedupe pass).
- [x] Manifest entry `{ id: "img_logo", src: "assets/logo.png" }` emits
      `LV_IMG_DECLARE(img_logo); // src: assets/logo.png`.
- [x] A used asset id absent from a non-empty manifest emits the missing-asset TODO.
- [x] Manifest + widget ids are declared once each (union dedupe across screens).
- [x] `assets` round-trips through `.ucp` v2; empty manifest omits the key.

## Result

2026-06-13:

- Implemented `UiAsset`/`UiProjectDesign.assets`, `normalizeUiAssets`,
  `emitProjectImageAssets()` and a minimal manifest editor in the LVGL Export view.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 57 passed;
  `npm.cmd test` -- 16 files / 144 tests passed; `npm.cmd run build` -- OK with the
  known lazy `ThreeDView` chunk warning.
- Targeted Playwright `CodeGen LVGL` -- 1 passed (5.2s). `npm run test:e2e` aborted
  immediately in this Git Bash shell with a `"C:\Program"` path-split error from the
  npm script wrapper; running `node node_modules/@playwright/test/cli.js test` directly
  bypassed it and the test (including the new manifest assertion) passed cleanly.

## Next Candidate Slice

The asset manifest covers declarations only. The next useful vertical slice is one of:

- a binary/file asset pipeline (image import + C array generation) building on the
  manifest's `src` field;
- minimal flex alignment metadata on `Panel.layout`;
- a research-only LVGL v9 compatibility matrix (`slice-11-v9-mode.md`) before any
  v9 codegen.
