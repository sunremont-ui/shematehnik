# Slice 20 -- Project Bundle ZIP Export

## Decision

Let the LVGL Export view download the generated project as a single `.zip`, with no new
runtime dependency:

- `src/zip.ts`: a pure `crc32` and a pure `zipStore(files)` that builds an uncompressed
  (STORED) ZIP `Uint8Array`;
- a `genLvglReadme(project)` text listing screens and declared image assets;
- a `Download .zip` button bundling `ui.c`, `ui.h` and `README.txt` via `downloadBlob`.

## Why This Slice

The exporter could only download `ui.c`/`ui.h` one file at a time. A real handoff wants
the whole skeleton in one archive. A STORED ZIP needs only CRC32 + fixed-layout headers,
so it is a pure, deterministic, unit-testable function -- no JSZip/pako dependency, in
line with the lab's "real logic -> pure function + Vitest" principle.

## Scope

- `src/zip.ts` (+ `zip.test.ts`): `crc32`, `zipStore`.
- `codegen.ts`: `genLvglReadme(project)` (screens + asset manifest summary).
- `modules/codegen_exports.tsx`: `Download .zip` button in `LvglExportView`.
- `codegen.test.ts`: `genLvglReadme` content.

Out of scope: DEFLATE compression, nested folders, build files (CMake/PlatformIO),
embedding separate asset `.c` files (assets stay inline in `ui.c`).

## ZIP Format

STORED (compression method 0): per-file local header (`PK\003\004`) + name + data,
then a central directory (`PK\001\002`) per file, then EOCD (`PK\005\006`). All
little-endian; CRC32 per file; sizes equal (uncompressed). Filenames are ASCII.

## Acceptance Criteria

- [x] `crc32("123456789") === 0xCBF43926` (canonical) and `crc32("") === 0`.
- [x] `zipStore` output starts with `PK\003\004` and ends with an EOCD whose entry count
      equals the number of files.
- [x] `genLvglReadme` lists the screen count and each declared asset id/format.
- [x] `Download .zip` bundles `ui.c`, `ui.h`, `README.txt`.

## Result

2026-06-14:

- Pure `crc32`/`zipStore` in `src/zip.ts` (+ `zip.test.ts`), `genLvglReadme` in
  `codegen.ts`, and a `Download .zip` button in the LVGL Export view via `downloadBlob`.
- Checks: `npm.cmd test` -- 18 files / 164 tests passed (new `zip.test.ts`);
  `npm.cmd run build` -- OK (after typing `zipStore` as `Uint8Array<ArrayBuffer>` so it
  satisfies `BlobPart`); targeted Playwright `CodeGen LVGL` -- 1 passed. No external zip
  dependency added.
