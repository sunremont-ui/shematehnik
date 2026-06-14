# Log

Chronological record of wiki evolution.

---

## [2026-06-14] lab | Web -- LVGL extended style tokens (text, border, padding)

- `platform_app/web/src/design.ts`: extended `UiStyle` with `textColor`/`textAlign`/`borderWidth`/`borderColor`/`pad` (+ `UiTextAlign`/`UI_TEXT_ALIGNS`), strictly normalized (valid hex; enum; ints >= 1); shared `hexColor` helper.
- `platform_app/web/src/codegen.ts`: added `LV_TEXT_ALIGN`, restructured `lvStyleFor` into a full `LvStyle` and extended `emitStyleAttach` to emit `lv_style_set_text_color/text_align/border_width/border_color/pad_all` when set. No tokens -> no style (slice-05 output preserved).
- `platform_app/web/src/modules/UiDesignerView.tsx`: style panel gained Text color / Text align / Border / Border color / Padding controls.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`: full-token emission, token-free no-style and `.ucp` v2 round-trip.
- `platform_app/web/e2e/smoke.spec.ts`: the new `Text align` control made `getByLabel("Align")` ambiguous; switched the layout-align selector to `getByLabel(/^Align/)` (a select's accessible name includes its selected option text).
- `platform_app_lab/.../slice-17-style-tokens.md`, `wiki/modules/codegen.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, handoff, SKILL/command: lab slice and curated docs promoted; custom fonts, per-state styles, gradients/shadows and per-side padding remain deferred.
- Checks: `npm.cmd test` -- 17 files / 159 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (via `node node_modules/@playwright/test/cli.js`).

---

## [2026-06-14] lab | Web -- LVGL widget hidden flag and opacity

- `platform_app/web/src/design.ts`: added optional `UiW.hidden` (kept only when `true`) and `UiW.opa` (kept only for `0 <= n < 255`, since 255 is the opaque default).
- `platform_app/web/src/codegen.ts`: `emitWidget` emits `lv_obj_add_flag(nm, LV_OBJ_FLAG_HIDDEN)` and `lv_obj_set_style_opa(nm, n, LV_PART_MAIN | LV_STATE_DEFAULT)` when set; unset keeps existing output.
- `platform_app/web/src/modules/UiDesignerView.tsx`: every widget gained a `Hidden` checkbox and an `Opacity` slider.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`: hidden/opacity emitted-when-set checks and `.ucp` v2 round-trip.
- `platform_app_lab/.../slice-16-widget-visibility.md`, `wiki/modules/codegen.md`, `wiki/roadmap-web.md`, handoff, SKILL/command: lab slice and curated docs promoted.
- Checks (slice 15/16 batch): `npm.cmd test` -- 17 files / 157 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (via `node node_modules/@playwright/test/cli.js`).

---

## [2026-06-14] lab | Web -- LVGL second image format (RGB565A8 / TRUE_COLOR_ALPHA)

- `platform_app/web/src/design.ts`: `UiAsset.format` became `UiAssetFormat = "rgb565" | "rgb565a8"`; `normalizeUiAssets` gates inline pixels by bytes-per-pixel (2 or 3).
- `platform_app/web/src/image.ts` (+ `image.test.ts`): added `rgbaToRgb565a8` (3 bytes/pixel: RGB565 LE + alpha) and `bytesPerPixel`; `hasInlinePixels` now handles both formats.
- `platform_app/web/src/codegen.ts`: `genLvglImageAsset` selects `.header.cf = LV_IMG_CF_TRUE_COLOR_ALPHA` for `rgb565a8`.
- `platform_app/web/src/modules/codegen_exports.tsx`: a second `imgα` import button decodes via `rgbaToRgb565a8`; the W×H badge marks alpha assets.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`: alpha descriptor `cf`/`data_size` and `.ucp` v2 round-trip of an `rgb565a8` asset.
- `platform_app_lab/.../slice-15-asset-alpha.md`, `wiki/modules/codegen.md`, `wiki/roadmap-web.md`, `wiki/modules/web_frontend.md`, handoff, SKILL/command: lab slice and curated docs promoted; non-RGB565 formats and asset folder/skeleton export remain deferred.
- Checks: see the widget hidden/opacity entry (same slice 15/16 batch run).

---

## [2026-06-13] lab | Web -- LVGL binary image asset pipeline (RGB565)

- `platform_app/web/src/design.ts`: extended `UiAsset` with optional `w`/`h`/`format: "rgb565"`/`data` (decoded bytes), normalized strictly (kept only when `format==="rgb565"`, `w>=1`, `h>=1`, `data.length===w*h*2`).
- `platform_app/web/src/image.ts` (+ `image.test.ts`): pure `rgbaToRgb565` (canvas RGBA -> little-endian RGB565) and `hasInlinePixels` guard.
- `platform_app/web/src/codegen.ts`: `genLvglImageAsset` emits `static const uint8_t <id>_map[]` + a `const lv_img_dsc_t <id>` (`LV_IMG_CF_TRUE_COLOR`); `emitProjectImageAssets` emits descriptors for data-backed assets and keeps `LV_IMG_DECLARE` for declare-only manifest/used assets.
- `platform_app/web/src/modules/codegen_exports.tsx`: LVGL Export manifest rows gained an image import (canvas decode -> `rgbaToRgb565` -> manifest) and a W×H badge.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`: descriptor emission, declare fallback, `genLvglImageAsset` null cases and inline `data` `.ucp` v2 round-trip.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-14-asset-pipeline.md`, `wiki/modules/codegen.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, handoff and SKILL/command: lab slice and curated docs promoted; non-RGB565 formats, asset folder/skeleton export and LVGL v9 mode remain deferred. Inline data is intended for small icons (large images bloat `.ucp`).
- Checks: `npm.cmd test` -- 17 files / 153 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (run via `node node_modules/@playwright/test/cli.js`; canvas decode exercised manually, pure conversion + C gen covered by Vitest).

---

## [2026-06-13] lab | Web -- LVGL per-child flex grow

- `platform_app/web/src/design.ts`: added optional `UiW.flexGrow` with `normalizeUiFlexGrow` (kept only as a positive integer `>= 1`).
- `platform_app/web/src/codegen.ts`: `emitWidget` now emits `lv_obj_set_flex_grow(nm, n)` when `flexGrow` is set; unset/<=0 keeps existing output.
- `platform_app/web/src/modules/UiDesignerView.tsx`: non-Panel widgets with a parent Panel expose a `Grow` input.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added grow-emitted / no-grow-absent checks, `.ucp` v2 round-trip of `flexGrow` and a UI Designer -> LVGL Export grow smoke.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-13-flex-grow.md`, `wiki/modules/codegen.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, handoff and SKILL/command: lab slice and curated docs promoted; binary asset pipeline, nested/responsive layout and LVGL v9 mode remain deferred.
- Checks: `npm.cmd test` -- 16 files / 148 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (run via `node node_modules/@playwright/test/cli.js`; `npm run` still mangles the script path in this Git Bash shell).

---

## [2026-06-13] lab | Web -- LVGL Panel flex cross-axis and track alignment

- `platform_app/web/src/design.ts`: added optional `UiLayout.crossAlign` and `UiLayout.trackAlign`, normalized like `align` (only with a valid `layout.kind`).
- `platform_app/web/src/codegen.ts`: `emitLayout` now fills the 2nd/3rd args of `lv_obj_set_flex_align` from cross/track (default `LV_FLEX_ALIGN_START`) and emits the call when any of `align`/`crossAlign`/`trackAlign` is set; main-only output keeps the slice-11 string and no-align keeps slice-07 output.
- `platform_app/web/src/modules/UiDesignerView.tsx`: replaced positional `setLayout` with an object-merge `updateLayout` helper and added `Align`/`Cross`/`Track` selects for `Panel`.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added cross-only and all-three align checks, `.ucp` v2 round-trip of cross/track and a UI Designer -> LVGL Export cross-align smoke.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-12-cross-track-align.md`, `wiki/modules/codegen.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, handoff and SKILL/command: lab slice and curated docs promoted; binary asset pipeline, nested/responsive layout and LVGL v9 mode remain deferred.
- Checks: `npm.cmd test` -- 16 files / 147 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (run via `node node_modules/@playwright/test/cli.js`; `npm run` still mangles the script path in this Git Bash shell).

---

## [2026-06-13] lab | Web -- LVGL Panel flex main-axis alignment

- `platform_app/web/src/design.ts`: added `UiFlexAlign`/`UI_FLEX_ALIGNS` and optional `UiLayout.align`, normalized only alongside a valid `layout.kind`.
- `platform_app/web/src/codegen.ts`: `emitLayout` now emits `lv_obj_set_flex_align(obj, <main>, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START)` when a flow and an align are both set; cross/track placement stay `START` (out of scope). No align keeps slice-07 output unchanged.
- `platform_app/web/src/modules/UiDesignerView.tsx`: Panel controls gained an `Align` select; `setLayout` preserves/sets `align`.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added align-emitted / no-align-absent checks, `.ucp` v2 round-trip of `align` and a UI Designer -> LVGL Export align smoke.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-11-flex-align.md`, `wiki/modules/codegen.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, handoff and SKILL/command: lab slice and curated docs promoted; cross-axis/track align, responsive layout, binary asset pipeline and LVGL v9 mode remain deferred.
- Checks: `npm.cmd test` -- 16 files / 145 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (run via `node node_modules/@playwright/test/cli.js`; `npm run` still mangles the script path in this Git Bash shell).

---

## [2026-06-13] lab | Web -- LVGL project asset manifest

- `platform_app/web/src/design.ts`: added `UiAsset` and optional `UiProjectDesign.assets`, with `normalizeUiAssets` (trim/dedupe id, single-line src) wired into `normalizeUiProject`; empty manifest omits the key.
- `platform_app/web/src/codegen.ts`: `genLvglProject()` now declares the union of manifest and used widget image assets once each, comments declared sources as `// src: <path>`, and emits a used-but-undeclared TODO when the manifest is non-empty; empty/absent manifest keeps slice-06 output byte-identical (`emitImageAssetDecls`).
- `platform_app/web/src/modules/codegen_exports.tsx`: LVGL Export (Project mode) gained a minimal asset-manifest editor (add/remove id + src rows) bound to `uiProject`.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added src-comment, missing-asset warning, union/dedupe, `.ucp` v2 manifest round-trip, empty-manifest omission and a UI Designer -> LVGL Export manifest smoke.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-10-asset-manifest.md`, `wiki/modules/codegen.md`, `wiki/roadmap-web.md`: lab slice and curated docs promoted; binary/file asset pipeline, nested/responsive layout, richer action graph and LVGL v9 mode remain deferred.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 57 passed; `npm.cmd test` -- 16 files / 144 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; targeted Playwright `CodeGen LVGL` -- 1 passed (run via `node node_modules/@playwright/test/cli.js` because `npm run` mangled the script path in this Git Bash shell).

---

## [2026-06-13] docs | Web -- LVGL handoff refresh

- `platform_app_lab/projects/lvgl-exporter-improvement-v0/agent-handoff.md`: added compact continuation snapshot for the next agent with current commit, verified checks, known Playwright timeout, files to read, non-goals and next slice options.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/README.md`: linked the handoff artifact from the lab index and current status.
- `.codex/skills/ucp-web-lvgl-lab/SKILL.md` and `.claude/commands/ucp-web-lvgl-lab.md`: added `agent-handoff.md` to the required reading list and continuation notes.
- `platform_app/wiki/roadmap-web.md`, `platform_app/wiki/skills.md`, `platform_app/wiki/modules/codegen.md` and `platform_app/wiki/modules/web_frontend.md`: added curated pointers to the handoff so another agent can continue without rediscovering the lab state.
- Checks: documentation-only update; `git diff --check` clean after edits.

---

## [2026-06-13] lab | Web -- LVGL minimal Panel child parents

- `platform_app/web/src/design.ts`: added optional `UiW.parentId` and normalization that keeps it only for non-Panel widgets pointing at a same-screen `Panel`.
- `platform_app/web/src/codegen.ts`: LVGL export now creates child widgets under their Panel parent and emits valid parents before children in both single-screen and project exports.
- `platform_app/web/src/modules/UiDesignerView.tsx`: selected non-Panel widgets expose `Parent panel`; canvas preview and drag math treat child coordinates as relative to the selected Panel.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added single-screen/project parent creation checks, `.ucp` round-trip coverage and UI Designer -> LVGL Export smoke coverage.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-09-container-parents.md`, README/audit/matrix/research-plan, `wiki/modules/codegen.md`, `wiki/integration/squareline.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, `wiki/skills.md`, `platform_app/web/README.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md` and `.claude/commands/ucp-web-lvgl-lab.md`: lab, curated docs and skills promoted; nested/responsive layouts, full asset pipeline, richer action graph and LVGL v9 mode remain deferred.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 53 passed; `npm.cmd test` -- 16 files / 140 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; `npm.cmd run test:e2e -- --grep "CodeGen LVGL"` printed `ok 1`, then hit the known Playwright webServer shutdown timeout after 180s.

---

## [2026-06-13] lab | Web -- LVGL minimal screen-load actions

- `platform_app/web/src/design.ts`: extended `UiEvent` with optional `action: { kind: "screen_load"; targetScreenId }`, normalized through the persisted `uiProject` path.
- `platform_app/web/src/codegen.ts`: project LVGL export now resolves target screens and emits `lv_scr_load(ui_target)` inside generated event handlers, with handler definitions placed after screen globals.
- `platform_app/web/src/modules/UiDesignerView.tsx`: selected widgets with events expose `Action` and `Target screen` controls for screen navigation.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added project screen-load generation, `.ucp` round-trip and UI Designer -> LVGL Export smoke coverage.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-08-actions.md`, README/audit/matrix/research-plan, `wiki/modules/codegen.md`, `wiki/integration/squareline.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, `wiki/skills.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md` and `.claude/commands/ucp-web-lvgl-lab.md`: lab, curated docs and skills promoted; richer action graphs and LVGL v9 mode remain deferred.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 51 passed; `npm.cmd test` -- 16 files / 138 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; `npm.cmd run test:e2e -- --grep "CodeGen LVGL"` printed `ok 1`, then hit the known Playwright webServer shutdown timeout; no leftover Vite/Playwright node process remained.

---

## [2026-06-13] lab | Web -- LVGL minimal Panel flex layout

- `platform_app/web/src/design.ts`: added optional `UiW.layout` metadata with `flex_row` / `flex_column` and normalized non-negative `gap`.
- `platform_app/web/src/codegen.ts`: Panel/layout metadata now emits LVGL v8 flex setup: `lv_obj_set_layout(..., LV_LAYOUT_FLEX)`, `lv_obj_set_flex_flow(...)` and gap pad setters.
- `platform_app/web/src/modules/UiDesignerView.tsx`: selected `Panel` widgets expose Layout and Gap controls.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added single-screen/project layout generation, `.ucp` round-trip and UI Designer -> LVGL Export smoke coverage.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-07-layouts.md`, README/audit/matrix/research-plan, `wiki/modules/codegen.md`, `wiki/integration/squareline.md`, `wiki/modules/web_frontend.md`, `wiki/roadmap-web.md`, `wiki/skills.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md` and `.claude/commands/ucp-web-lvgl-lab.md`: lab, curated docs and skills promoted; full layout hierarchy/responsive profiles remain deferred.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 50 passed; `npm.cmd test` -- 16 files / 137 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; `npm.cmd run test:e2e -- --grep "CodeGen LVGL"` printed `ok 1`, then hit the known Playwright webServer shutdown timeout; `browser-harness` against `http://127.0.0.1:4174/?module=ui` verified UI Designer -> LVGL Export contains `LV_IMG_DECLARE(img_logo)`, `lv_img_set_src`, `lv_obj_set_layout` and `LV_FLEX_FLOW_ROW`.

## [2026-06-13] lab | Web -- LVGL minimal image asset placeholders

- `platform_app/web/src/design.ts`: added optional `assetId` metadata for UI widgets, normalized through the persisted `uiProject` path.
- `platform_app/web/src/codegen.ts`: `Image` widgets now emit `LV_IMG_DECLARE(asset)` and `lv_img_set_src(widget, &asset)` when an asset id exists; missing sources produce an explicit TODO comment.
- `platform_app/web/src/modules/UiDesignerView.tsx`: selected `Image` widgets expose an `Asset id` property and show the selected image asset id in the canvas preview.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`, `platform_app/web/e2e/smoke.spec.ts`: added image asset generation, declaration dedupe, `.ucp` round-trip and UI Designer -> LVGL Export smoke coverage.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-06-assets.md`, README/audit/matrix/research-plan, `wiki/modules/codegen.md` and `wiki/roadmap-web.md`: lab and curated docs promoted; next candidate is a minimal layout container slice.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 48 passed; `npm.cmd test` -- 16 files / 135 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; `npm.cmd run test:e2e -- --grep "CodeGen LVGL"` printed `ok 1`, then hit the known Playwright webServer shutdown timeout; one-shot Vite + Chromium browser smoke -- Image asset id to LVGL Export OK. `browser-harness` remains unavailable because the uv/python shim cannot create its process.

---

## [2026-06-12] lab | Web -- LVGL minimal style tokens

- `platform_app/web/src/design.ts`: added minimal `UiStyle` metadata for `bgColor` and `radius`, including validation/normalization and shared swatches for UI Designer.
- `platform_app/web/src/codegen.ts`: `genLvgl()` and `genLvglProject()` now emit `lv_style_t` declarations, `lv_style_init`, background color/opacity, radius and `lv_obj_add_style(...)` while preserving no-style golden output.
- `platform_app/web/src/modules/UiDesignerView.tsx`: widget properties now expose Fill, swatches, Radius and Clear style controls, and the canvas preview reflects style metadata.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`: added single-screen/project style generation checks and `.ucp` round-trip coverage.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-05-styles.md`, README/audit/matrix/research-plan, `wiki/modules/codegen.md`, `wiki/roadmap-web.md`, `wiki/skills.md`, `wiki/modules/web_frontend.md`, `wiki/integration/squareline.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md`, `.claude/commands/ucp-web-lvgl-lab.md`: lab and curated docs promoted; next candidate is a minimal asset placeholder slice.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 46 passed; `npm.cmd test` -- 16 files / 133 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; Playwright fallback smoke on `http://127.0.0.1:5178/?module=ui` -- Fill/Radius controls to LVGL Export style registration OK. Browser-harness diagnostics: Chrome is running, but daemon is not alive and stdin invocation currently fails through the uv/python shim even after reinstalling the local tool.

---

## [2026-06-12] lab | Web -- LVGL minimal event callbacks

- `platform_app/web/src/design.ts`: added minimal `UiEvent` metadata for `clicked` and `value_changed`, with normalization through the persisted `uiProject` path.
- `platform_app/web/src/codegen.ts`: `genLvgl()` and `genLvglProject()` now emit deduplicated `static void handler(lv_event_t *e)` stubs and `lv_obj_add_event_cb(...)` registrations while preserving no-event golden output.
- `platform_app/web/src/modules/UiDesignerView.tsx`: widget properties now expose Event and Handler controls.
- `platform_app/web/src/codegen.test.ts`, `platform_app/web/src/project.test.ts`: added event callback output checks and `.ucp` round-trip coverage.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-04-events.md`, README/audit/matrix/research-plan, `wiki/modules/codegen.md`, `wiki/roadmap-web.md`, `wiki/integration/squareline.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md`, `.claude/commands/ucp-web-lvgl-lab.md`: lab and curated docs promoted; next candidate is a minimal style-token slice.
- Checks: `npm.cmd test -- codegen.test.ts project.test.ts` -- 44 passed; `npm.cmd test` -- 16 files / 131 tests passed; `npm.cmd run build` -- OK with the known lazy `ThreeDView` chunk warning; Playwright fallback smoke on `http://127.0.0.1:5177/?module=ui` -- Event control to LVGL Export callback registration OK. `browser-harness --doctor` still reports daemon/browser-connection failures despite Chrome running.

---

## [2026-06-12] lab | Web — LVGL UI project state + `.ucp` wrapper

- `platform_app/web/src/design.ts`: добавлен `UiProjectDesign`/`uiProject` для multi-screen UI Designer state; legacy `uiDesign` сохранён как single-screen compatibility store, old `design.uiDesign` migrates to one `main` screen.
- `platform_app/web/src/modules/UiDesignerView.tsx`: добавлены screen selection, create screen, initial screen selection и per-screen widget editing; Export C now uses project-level LVGL output.
- `platform_app/web/src/modules/codegen_exports.tsx`, `platform_app/web/src/App.tsx`: LVGL Export получил Project / Current screen режимы; autosave now tracks `uiProject`.
- `platform_app/web/src/project.test.ts`: добавлены проверки `.ucp` v2 round-trip для двух экранов и legacy `uiDesign` migration wrapper.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-03-ui-project-state.md`, `multi-screen-model.md`, `README.md`, `wiki/modules/codegen.md`, `wiki/roadmap-web.md`: лабораторный срез и curated docs обновлены; следующий кандидат — minimal event/action callback fixture.
- Проверки: `npm.cmd test -- codegen.test.ts` — 14 passed; `npm.cmd test -- project.test.ts` — 28 passed; `npm.cmd test` — 16 files / 129 tests passed; `npm.cmd run build` — OK, прежнее Vite warning о lazy `ThreeDView` chunk >500 kB; `npm.cmd run test:e2e -- --grep "UI Designer"` printed `ok 1`, then hit the known Playwright webServer 120s shutdown timeout; manual Playwright smoke against dev server: 2 screens / 4 widgets, project `ui_init()`, new initial screen load, current-screen legacy output, console errors `[]`.

## [2026-06-12] lab | Web — LVGL multi-screen generator slice

- `platform_app/web/src/codegen.ts`: добавлен `genLvglProject(project)` и интерфейсы `LvglProjectDesign`/`LvglScreenDesign`; legacy `genLvgl(widgets, "main")` оставлен обратно-совместимым.
- `platform_app/web/src/codegen.test.ts`: добавлен exact golden-output тест для двух экранов, screen-scoped widget globals, per-screen init functions и `ui_init()` с v8 `lv_scr_load(ui_main)`.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/multi-screen-model.md`, `slice-02-multiscreen.md`: зафиксирована модель, граница без `.ucp` migration и следующий кандидат — UI Designer state/persistence wrapper.
- `wiki/modules/codegen.md`, `wiki/roadmap-web.md`, `wiki/skills.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md`, `.claude/commands/ucp-web-lvgl-lab.md`: подтверждённый multi-screen generator baseline продвинут в docs/roadmap/skills.
- Проверки: `npm.cmd test -- codegen.test.ts` — 14 passed; `npm.cmd test` — 16 files / 127 tests passed; `npm.cmd run build` — OK, остаётся прежнее Vite warning о lazy `ThreeDView` chunk >500 kB.

## [2026-06-12] lab | Web — LVGL exporter lab started

- `platform_app_lab/projects/lvgl-exporter-improvement-v0/source-notes.md`: собраны первичные LVGL latest/open и LVGL 8.3 источники; SquareLine docs помечены как недоступные через текущий web-tool, без claims.
- `compatibility-matrix.md`: зафиксирован текущий LVGL v8-style baseline (`lv_btn_create`, `lv_img_create`, single-screen `ui.c/ui.h`) и граница будущей v9/SquareLine работы.
- `slice-proposal.md`: выбран первый безопасный срез — golden-output tests для текущего `genLvgl()` без изменения `.ucp` и поведения генератора.
- `web/src/codegen.test.ts`: добавлен точный golden-output тест для `ui.c/ui.h` baseline.
- `wiki/roadmap-web.md`, `wiki/skills.md`, `.codex/skills/ucp-web-lvgl-lab/SKILL.md`, `.claude/commands/ucp-web-lvgl-lab.md`: статус LVGL Lab обновлён с seed до first slice done; следующие заходы начинают с multi-screen model proposal.
- `wiki/modules/codegen.md`: current LVGL Export теперь явно упоминает exact golden-output baseline.
- Проверки: `npm.cmd test -- codegen.test.ts` — 13 passed; `npm.cmd test` — 16 files / 126 tests passed.

## [2026-06-12] docs | Web — skills/wiki/roadmap sync + LVGL lab seed

- `wiki/modules/codegen.md`: переписан под текущий web-модуль Code Generator — `design.ts` stores, реальные функции `codegen.ts`, LVGL Export baseline, Pin Planner, EE Calculators, Power Budget и Register Map.
- `wiki/skills.md`, `.claude/commands/ucp-web-impl-new-modules.md`: добавлены отдельные команды для фаз 17.4/17.5/17.6 (`/ucp-web-impl-logic-analyzer`, `/ucp-web-impl-power-budget`, `/ucp-web-impl-register-map`) и следующий `/ucp-web-lvgl-lab`.
- `.claude/commands/` и `.codex/skills/`: добавлены dedicated instructions для Logic Analyzer, Power Budget, Register Map и LVGL Lab.
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/`: заведена лаборатория улучшения UI Designer/LVGL Export с audit, research plan, workstreams и promotion criteria.
- `wiki/integration/squareline.md`, `wiki/integration/kicad.md`, `wiki/integration/freecad.md`, `architecture/project_format.md`, `architecture/plugin_system.md`, `concepts/simulation.md`, `concepts/protocols.md`: закрыты wiki-ссылки из index и зафиксированы границы текущей реализации.
- `wiki/roadmap-web.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`, `web/README.md`: roadmap теперь показывает следующий LVGL Lab контур; docs отражают `regMap` в `.ucp` v2 design-store.

## [2026-06-12] feature | Web — фаза 17.6: Register Map ✅

- `web/src/design.ts`: добавлен `regMap` store в `.ucp` v2 design snapshot/restore; карта регистров сохраняет device/base/registers/fields.
- `web/src/codegen.ts`: добавлены `genRegisterHeader()` и `genRegisterMarkdown()` — C header с base/offset/address/reset, bit masks, inline `GET/SET` и Markdown-документация.
- `web/src/modules/RegisterMapView.tsx`, `web/src/data/modules.ts`, `web/src/modules/index.tsx`: новый модуль Code Generator → Register Map; UI с редактированием device/base/registers/access/reset/fields, live preview C/Markdown и download `.h/.md`.
- `web/src/codegen.test.ts`: добавлены 2 теста на Register Map C masks/inline helpers и Markdown tables; `web/e2e/smoke.spec.ts` обновлён до 31 модуля и добавил smoke для Register Map.
- Документация: закрыт пункт 17.6 и вся фаза 17 в `wiki/roadmap-web.md`, обновлены `web/README.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`, `.claude/commands/ucp-web-impl-new-modules.md`.
- Проверки: `npm.cmd test` — 125 passed; `npm.cmd run build` — OK, остаётся прежнее Vite warning о lazy three chunk >500 kB; `npm.cmd run test:e2e -- --grep "Register Map"` показал `ok 1` за 782ms, но процесс снова не завершился до 120s timeout из-за известного зависания Playwright webServer.

## [2026-06-12] feature | Web — фаза 17.5: Power Budget ✅

- `web/src/power.ts`: добавлен чистый слой Power Budget — дефолтные токи по kind/value, группировка нагрузок по power-net labels (`VCC/3V3/5V/12V/...`), rail budgets, margins, overload/unassigned warnings и CSV export.
- `web/src/modules/PowerBudgetView.tsx`, `web/src/data/modules.ts`, `web/src/modules/index.tsx`: новый модуль Code Generator → Power Budget; UI с editable токами нагрузок, editable лимитами шин, SVG bar summary, warning list и `Download budget.csv`.
- `web/src/power.test.ts`: 5 unit-тестов на defaults, группировку по шинам, overload warning, unassigned warning и CSV; `web/e2e/smoke.spec.ts` обновлён до 30 модулей и добавил smoke для Power Budget.
- Документация: закрыт пункт 17.5 в `wiki/roadmap-web.md`, обновлены `web/README.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`, `.claude/commands/ucp-web-impl-new-modules.md`.
- Проверки: `npm.cmd test` — 123 passed; `npm.cmd run build` — OK, остаётся прежнее Vite warning о lazy three chunk >500 kB; `npm.cmd run test:e2e -- --grep "Power Budget"` показал `ok 1` за 731ms, но процесс снова не завершился до 120s timeout из-за известного зависания Playwright webServer.

## [2026-06-12] feature | Web — фаза 17.4: Logic Analyzer ✅

- `web/src/logic.ts`: добавлен чистый слой Logic Analyzer — нормализация каналов, импорт CSV (`time,ch0,ch1...`) и VCD (`$var`, timescale, scalar/vector changes), `sampleValue()`, декодеры UART/I2C/SPI и форматирование времени.
- `web/src/modules/LogicAnalyzerView.tsx`, `web/src/data/modules.ts`, `web/src/modules/index.tsx`: новый модуль Protocol → Logic Analyzer; UI с импортом `.csv/.vcd`, canvas тайминг-диаграммой, zoom/pan, курсорами A/B, UART/I2C/SPI controls и экспортом аннотаций CSV.
- `web/src/logic.test.ts`: 5 unit-тестов на CSV/VCD import, UART `0x55` @ 9600, I2C start+address; `web/e2e/smoke.spec.ts` обновлён до 29 модулей и добавил smoke для Logic Analyzer.
- Документация: закрыт пункт 17.4 в `wiki/roadmap-web.md`, обновлены `web/README.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`, `.claude/commands/ucp-web-impl-new-modules.md`.
- Проверки: `npm.cmd test` — 118 passed; `npm.cmd run build` — OK, остаётся прежнее Vite warning о lazy three chunk >500 kB; `npm.cmd run test:e2e -- --grep "Logic Analyzer"` показал `ok 1` за 863ms, но процесс снова не завершился до 120s timeout из-за известного зависания Playwright webServer. Дополнительно Vite dev server поднят на `http://127.0.0.1:5173/`, Browser-проверка `?module=logic`: 29 tree rows, canvas `1206×375`, UART `0x55`, console errors `[]`.

## [2026-06-12] feature | Web — фаза 16.1: `.ucp` v2 project bundle ✅

- `web/src/project.ts`: `serialize()` теперь пишет envelope `{version:2, project, design}`, `deserialize()` читает v2 и legacy v1; v1-файлы открываются без изменения design-store.
- `web/src/design.ts`: добавлены `snapshot()/restore()` для store, нормализация `uiDesign`, `packet`, `fsm`, общий `snapshotDesign()`/`restoreDesign()`.
- `web/src/App.tsx`, `web/src/modules/protocol_family.tsx`: автосейв подписан на `uiDesign`/`packet`/`fsm`; Packet Editor помечает проект modified при правке схемы пакета.
- Ограничение зафиксировано: undo/redo по-прежнему покрывает `UcpProject` (schematic/PCB/userParts), но не откатывает design-store (`uiDesign`/`packet`/`fsm`).
- Тесты: `npm.cmd test` — 100 passed; `npm.cmd run build` — OK, остаётся ожидаемое предупреждение Vite о крупном chunk до фазы 16.2.

## [2026-06-12] feature | Web — фаза 16.2: lazy three.js chunk ✅

- `web/src/modules/index.tsx`: `ThreeDView` и `PartEditorView` переведены на `React.lazy`/`Suspense`; `three`, `OrbitControls`, board mesh и STL/STEP helpers больше не попадают в стартовый import graph.
- Build-size эффект: основной Vite chunk уменьшился примерно с `835.76 kB` до `307.78 kB`; 3D вынесен в `ThreeDView-*.js` (`527.51 kB`, lazy-loaded при открытии 3D/Part).
- Проверки: `npm.cmd run build` — OK; `npm.cmd test` — 100 passed; одиночный Playwright `3D Editor` показал `ok` за 973ms, но команда снова не завершилась до 30s timeout из-за уже наблюдаемого зависания Playwright/webServer.

## [2026-06-12] feature | Web — фаза 16.3: File System Access save/recent ✅

- `web/src/fsAccess.ts`: добавлен тонкий адаптер File System Access API (`showOpenFilePicker`, `showSaveFilePicker`, permission check, write handle) и IndexedDB recent handles.
- `web/src/App.tsx`, `web/src/components/MenuBar.tsx`: File → Save пишет в текущий `.ucp` handle, Save As открывает picker, Open использует picker при наличии API, Recent открывает сохранённые handles; без API остаётся прежний hidden file input/download fallback.
- Безопасность поведения: импорт `.net/.kicad_sch` сбрасывает текущий `.ucp` handle, чтобы следующий Save не перезаписал старый проект; импорт `.kicad_sym` только пополняет библиотеку и не меняет текущий handle.
- Проверки: `npm.cmd run build` — OK, стартовый chunk ≈`311.29 kB`; `npm.cmd test` — 100 passed.

## [2026-06-12] feature | Web — фаза 16.4: PWA install/offline shell ✅

- `web/public/manifest.webmanifest`, `web/public/icons/ucp-icon.svg`: добавлен PWA manifest (`display: standalone`, theme/background colors, SVG icon, shortcuts).
- `web/public/sw.js`, `web/src/pwa.ts`, `web/src/main.tsx`: добавлен production-only service worker registration; service worker кэширует app shell/WASM и runtime same-origin assets, для navigation отдаёт offline fallback `index.html`.
- `web/index.html`: подключены manifest, theme-color, SVG favicon, description; язык страницы переключён на `ru`.
- Проверки: `npm.cmd run build` — OK, `dist/manifest.webmanifest`, `dist/sw.js`, `dist/icons/ucp-icon.svg` скопированы; стартовый chunk ≈`311.84 kB`; `npm.cmd test` — 100 passed.

## [2026-06-12] feature | Web — фаза 16.5: module error boundary ✅

- `web/src/components/ModuleErrorBoundary.tsx`: добавлен class-based React error boundary с локальной fallback-карточкой, сообщением ошибки и кнопкой `Reload module`.
- `web/src/components/Workspace.tsx`: каждый keep-alive модуль обёрнут в свой boundary; crash одного view пишет статус `Module error: ...`, логируется в console и не роняет shell/другие модули.
- `web/src/App.tsx`: PWA shortcuts `?module=schematic/packet` теперь открывают нужный модуль; выбор модуля синхронизирует `module` query param, New Project очищает его.
- Проверки: `npm.cmd run build` — OK, стартовый chunk ≈`312.89 kB`; `npm.cmd test` — 100 passed.

## [2026-06-12] feature | Web — фаза 16.6: Command palette ✅

- `web/src/components/CommandPalette.tsx`: добавлен Ctrl+K overlay с поиском по всем модулям и системным действиям (`New Project`, toggle tree, theme switch), keyboard navigation (`↑/↓/Enter/Esc`) и mouse selection.
- `web/src/App.tsx`, `web/src/components/Dialogs.tsx`: Ctrl+K открывает palette, shortcuts dialog обновлён; выбор модуля из palette проходит через `ucp.select()` и синхронизирует `?module=...`.
- Фаза 16 полностью закрыта в `wiki/roadmap-web.md`.
- Проверки: `npm.cmd run build` — OK, стартовый chunk ≈`315.73 kB`; `npm.cmd test` — 100 passed.

## [2026-06-12] feature | Web — фаза 17.1: Filter Designer ✅

- `web/src/filter.ts`: добавлен расчётный слой Filter Designer — RC low/high-pass, RLC low/band-pass через общий `acSweep`, active low-pass approximation, `fc`/`Q`/BW, CSV-экспорт и инженерное форматирование.
- `web/src/modules/FilterDesignerView.tsx`, `web/src/data/modules.ts`, `web/src/modules/index.tsx`: новый модуль в дереве Schematic → Filter Designer; UI с выбором топологии, номиналами R/C/L/Gain/Q, SVG Боде-графиком, метриками и Export CSV.
- `web/src/filter.test.ts`: 4 unit-теста на RC −3 dB, high-pass, RLC band-pass resonance, active gain + CSV; `web/e2e/smoke.spec.ts` обновлён до 26 модулей и добавил smoke для Filter Designer.
- Документация: закрыт пункт 17.1 в `wiki/roadmap-web.md`, обновлены `web/README.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`.
- Проверки: `npm.cmd test` — 104 passed; `npm.cmd run build` — OK, стартовый chunk ≈`325.02 kB`, lazy three chunk ≈`527.51 kB` и прежнее Vite warning >500 kB остаётся; UI проверен программно через Vite preview + Chromium (`Filter Designer`, SVG, Export CSV, 26 tree rows). Обычный одиночный `npx playwright test ... -g "Filter Designer"` снова ушёл в известный webServer timeout без результата.

## [2026-06-12] feature | Web — фаза 17.2: Pin Planner ✅

- `web/src/pinplanner.ts`: добавлена чистая модель Pin Planner — MCU presets для STM32F103C8, ATmega328P/Uno, ESP32-C3; назначения функций на пины; `validatePinPlan()` с конфликтами/предупреждениями; `generatePinInit()` для STM32 HAL / Arduino / ESP-IDF.
- `web/src/modules/PinPlannerView.tsx`, `web/src/data/modules.ts`, `web/src/modules/index.tsx`: новый модуль Code Generator → Pin Planner; UI с выбором MCU, SVG-корпусом, назначением функций, issue table, generated init preview, Copy/Download.
- `web/src/pinplanner.test.ts`: 4 unit-теста на дубли периферийных функций, неподдерживаемые функции и генерацию Arduino/STM32 init; `web/e2e/smoke.spec.ts` обновлён до 27 модулей и добавил smoke для Pin Planner.
- Скиллы: добавлены `.codex/skills/ucp-web-pin-planner` и `.claude/commands/ucp-web-impl-pin-planner.md`; общий `.claude/commands/ucp-web-impl-new-modules.md` помечает 17.1/17.2 done.
- Документация: закрыт пункт 17.2 в `wiki/roadmap-web.md`, обновлены `web/README.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`, `wiki/skills.md`.
- Проверки: `npm.cmd test` — 108 passed; `npm.cmd run build` — OK, стартовый chunk ≈`341.26 kB`, lazy three chunk ≈`527.51 kB` и прежнее Vite warning >500 kB остаётся; UI проверен программно через Vite preview + Chromium (`Pin Planner`, SVG, Download init.c, init-код, 27 tree rows).

## [2026-06-12] feature | Web — фаза 17.3: EE Calculators ✅

- `web/src/eecalc.ts`: добавлен чистый расчётный слой EE Calculators — делитель напряжения с нагрузкой, обратный расчёт R2, LED-резистор с ближайшим E12 и запасом по мощности, IPC-2221 ширина дорожки external/internal, тепловой расчёт LDO.
- `web/src/modules/EeCalculatorsView.tsx`, `web/src/data/modules.ts`, `web/src/modules/index.tsx`: новый модуль Code Generator → EE Calculators; UI с карточками расчётов, SVG-индикаторами divider/trace/thermal, таблицами результатов и Markdown export.
- `web/src/eecalc.test.ts`: 5 unit-тестов на loaded divider, target divider, LED/E12, IPC-2221 trace width, LDO thermal; `web/e2e/smoke.spec.ts` обновлён до 28 модулей и добавил smoke для EE Calculators.
- Скиллы: добавлены `.codex/skills/ucp-web-ee-calculators` и `.claude/commands/ucp-web-impl-ee-calculators.md`; общий `.claude/commands/ucp-web-impl-new-modules.md` помечает 17.3 done.
- Документация: закрыт пункт 17.3 в `wiki/roadmap-web.md`, обновлены `web/README.md`, `wiki/index.md`, `wiki/modules/web_frontend.md`, `wiki/skills.md`.
- Проверки: `npm.cmd test` — 113 passed; `npm.cmd run build` — OK, стартовые chunks ≈`100.77 kB` + `353.94 kB`, lazy three chunk ≈`527.51 kB` и прежнее Vite warning >500 kB остаётся; `npm.cmd run test:e2e -- --grep "EE Calculators"` — 1 passed.

## [2026-06-12] feature | Web — фаза 13: Schematic UX ✅

- Закрыта фаза 13 в `wiki/roadmap-web.md`: multi-select рамкой, групповое перемещение/удаление, Ctrl+C/V copy-paste с переименованием ref, junction dots, inline edit ref/value, ERC по типам пинов.
- Обновлены `web/src/modules/SchematicView.tsx`, `web/src/project.ts`, `web/src/data/library.ts`, `web/src/App.tsx`, `web/src/store.ts`, `web/src/project.test.ts`.
- Проверки: `npm.cmd test` — 87 passed; `npm.cmd run build` — OK, Vite предупреждает о крупном chunk из-за ещё не выполненной фазы 16.2 code-split three.js; общий `npm.cmd run test:e2e` позже показал 10/10 ok, но процесс не завершился до 180s timeout.

## [2026-06-12] feature | Web — фаза 14: библиотека и пользовательские детали ✅

- `web/src/data/library.ts`: добавлены `UserPart`/`UserPin`, runtime user library, persist `ucp.userParts`, импорт `.kicad_sym`, custom pin geometry/types, расширена штатная библиотека до 50+ деталей.
- `web/src/project.ts`: `.ucp` теперь хранит `userParts`; `pinsOf`/`pinOffset`/`nextRef` учитывают пользовательские детали.
- `web/src/modules/schematic_family.tsx`: Symbol Editor сохраняет реальные детали в библиотеку с category/base kind/value/footprint/pin types.
- `web/src/modules/SchematicView.tsx`, `web/src/App.tsx`, `web/src/store.ts`, `web/src/components/MenuBar.tsx`: палитра использует builtin+user parts; File → Open принимает `.kicad_sym`.
- Тесты: `npm.cmd test` — 90 passed; `npm.cmd run build` — OK, остаётся ожидаемое предупреждение Vite о крупном chunk до фазы 16.2; `npm.cmd run test:e2e` показал 10/10 ok, но процесс Playwright не завершился до 180s timeout.

## [2026-06-12] feature | Web — фаза 15.1: Program System FSM editor ✅

- `web/src/design.ts`: добавлен общий `fsm` store (`FsmDesign`, `FsmState`, `FsmTransition`) и пресеты FilamentDryer/FanController/WasherCycle.
- `web/src/codegen.ts`: добавлен `genFsm()` — C/H генератор `typedef enum` + `fsm_step()` switch-case, guard/action, `FSM_INITIAL`.
- `web/src/modules/ProgramsView.tsx`: статичные карточки заменены на SVG FSM-редактор: состояния, drag, initial, переходы, guard/action, пресеты, Export C.
- Тесты: `npm.cmd test` — 93 passed; `npm.cmd run build` — OK, остаётся ожидаемое предупреждение Vite о крупном chunk до фазы 16.2.

## [2026-06-12] feature | Web — фаза 15.2: Protocol Analyzer real decode ✅

- `web/src/decode.ts`: добавлены `decodePackets()`, `parseHexBytes()`, `formatHexBytes()`, `crc16Ccitt()`; декодер синхронизируется по header/sync/magic, считает big-endian поля, CRC, garbage и remainder.
- `web/src/design.ts`: добавлен общий `capture` store и helpers `appendCapture()`/`clearCapture()`.
- `web/src/modules/protocol_family.tsx`: Packet Editor отправляет sample frame в Analyzer; UART Monitor пишет RX-байты в capture; Analyzer декодирует manual hex или UART capture по текущему Packet Editor schema.
- `web/e2e/smoke.spec.ts`: добавлен сценарий Packet Editor → Protocol Analyzer.
- Тесты: `npm.cmd test` — 96 passed; `npm.cmd run build` — OK; одиночный Playwright `Protocol Analyzer` показал `ok`, но процесс снова не завершился до 120s timeout.

## [2026-06-12] feature | Web — фаза 15.3: AI Schematic browser Claude API ✅

- `web/src/ai.ts`: добавлены `requestAiSchematic()` (direct browser fetch к Anthropic API с `anthropic-dangerous-direct-browser-access`), `placeAiResult()` и demo fallback.
- `web/src/modules/AiView.tsx`: поле Claude API key (`localStorage`), demo-режим без ключа, размещение результата в `UcpProject` через `addItems()` и переход в Schematic.
- `web/src/ai.test.ts`: проверены уникальные refs, remap wires, fallback неизвестного kind в `U`, отбрасывание невалидных проводов.
- Документация `wiki/modules/web_frontend.md` и `web/README.md` обновлена: AI больше не только демо, Program/Analyzer отражены как реальные cross-module режимы.
- Тесты: `npm.cmd test` — 98 passed; `npm.cmd run build` — OK, остаётся ожидаемое предупреждение Vite о крупном chunk до фазы 16.2; реальный Claude-запрос требует ручной проверки с пользовательским ключом.

## [2026-06-12] feature | Web — фаза 12: PCB Pro ✅

- **Дорожки в модели**: `UcpProject.tracks` (`PcbTrack{sig,layer,points}`) + `board{w,h}` мм — undo/redo и автосейв бесплатно; `deserialize` валидирует (sig живого провода, ≥2 точек); store: `setTracks`/`setBoard`; project.ts перекодирован UTF-16→UTF-8
- **Новый чистый модуль `src/pcb.ts`**: `segSegDist`/`segPtDist`, `clearanceDrc` (track-track по слою / track-pad сквозной / pad-pad, зазор по краям), `buildPour` (растровые полосы 4px, чужие объекты раздуты на clearance, своя цепь заливается), `buildCopperGerber` (+G36/G37 регионы заливки), `buildEdgeGerber`, `buildSilkGerber` (рамки+пин-1), `buildDrill`, `buildPnp` (KiCad-формат, мм от угла платы)
- **PcbView**: клик по дорожке — выбор, внутренний сегмент тянется перпендикулярно (snap 2px, через `getScreenCTM`), Del/Reroute; Route all — последовательная укладка в модель; clearance-слайдер 0.1–1 мм; pour с выбором цепи; размер платы W×H; маркеры нарушений на сцене + список
- **Export fab**: F_Cu(+pour)/B_Cu/Edge_Cuts/F_Silkscreen/drill/pos.csv
- Ограничения: pour без термобарьеров, silk без ref-текста (нет векторного шрифта), min-width не проверяется
- Тесты: Vitest 80 (+13 `pcb.test.ts`: геометрия/DRC/pour/PnP/Gerber/round-trip), Playwright 10 (+PCB: route→DRC→persist); build чист

## [2026-06-11] feature | Web — фаза 11: SPICE 2.0 — нелинейные элементы ✅

- **Решатель** (`src/spice.ts`): Ньютон-Рафсон поверх MNA — общий `nrSolve` (демпфинг ±0.5 В точки линеаризации, V-источники держатся строками-ограничениями, до 200 итераций), генерический стамп `I − J·x` по терминалам
- **Приборы**: диод Шокли с продолжением экспоненты (LED: n=2, Is=1e-18), БЮТ Эберс-Молл транспортный (βF=100, βR=1, NPN/PNP через pol), MOSFET level 1 (K=0.1, Vth=2, симметрия канала при Vds<0); GMIN=1e-12
- **Топология**: `pinsOf("Q")` → 3 вывода (1=Б/З, 2=К/С, 3=Э/И), `pinOffset` — 3-пиновая геометрия; `buildElements` распознаёт D/Q/M и полярность из value (LED, 2907/PNP, IRF9/PMOS, 7000/MOS…)
- **Анализы**: DC и TRAN через NR (тёплый старт по шагам); AC линеаризует D/Q/M в DC-рабочей точке (bias); новый **SWEEP** (`dcSweep`) — V(probe) от Vsrc; доп. источник **V2** (aux) во всех анализах, по AC закорочен
- **SpiceView**: режим SWEEP, панель V2 (узел+напряжение), два перетаскиваемых курсора A/B с readout Δ, экспорт CSV (tran/ac/sweep/dc), .cir с моделями D/Q/M, чип «nonlinear»
- Тесты: Vitest 67 (+8: диод прямое/обратное, NPN β, PNP, NMOS насыщение, sweep-монотонность, выпрямитель, AC rd=VT/Id), Playwright 9 (SPICE: +SWEEP); build чист

## [2026-06-11] feature | Web — фаза 10.4: OTA Flash через esptool-js — фаза 10 закрыта ✅

- `OtaView.tsx`: реальная прошивка ESP32 — `esptool-js@0.6` лениво импортируется по клику Flash (отдельный чанк ~100 КБ, основной бандл не вырос); `requestPort` → `Transport` → `ESPLoader.main()` (имя чипа в чип-бейдж) → `writeFlash` (fileArray, flashMode/Freq/Size "keep", compress, reportProgress → прогресс-бар) → `after("hard_reset")`
- UI: file-input `.bin`, hex-адрес (0x10000), baud 115200–921600, терминал esptool в лог-pane; перед запросом порта закрывается общий порт `serial.ts`
- Без Web Serial — прежняя симуляция с чипом «симуляция (нет Web Serial)»; подсказка про кнопку BOOT
- deps: `esptool-js@0.6.0`, `@types/w3c-web-serial` (dev); Playwright 9 (+OTA controls); Vitest 59; build чист
- Ручная проверка с ESP32 по USB — за пользователем

## [2026-06-11] feature | Web — фаза 10.1–10.3: Web Serial (UART Monitor + PID live)

- **`src/serial.ts`** — общий слой Web Serial: один порт на приложение, стор `useSerial()` (supported/status/info/baud), `serialOpen/serialClose/serialWrite/onSerialData` (несколько подписчиков), read-loop по chromium-паттерну (восстановимые ошибки → новый reader; отключение устройства → closed)
- Чистые помощники: `LineBuffer` (сборка строк из чанков, рвёт CRLF/LF/CR и UTF-8 посреди символа), `parseTelemetry` («T:26.1 S:60 O:128» — формат debug-печати прошивок), `formatBytes`
- **UART Monitor** — реальный порт (Connect, baud 9600…921600, hex/ascii, TX-строка с \r\n) + симуляция как явный режим (кнопка Simulate, чип «симуляция»)
- **PID Tuner** — переключатель Sim|Live: live читает телеметрию с устройства (график T + SP из потока), отправка уставки `S=<v>\n`; sim-режим не тронут
- Тесты: Vitest 59 (`serial.test.ts` — 9: LineBuffer/parseTelemetry/formatBytes), Playwright 8 (+UART sim-фолбэк, +PID Sim/Live); build чист (779 КБ)
- Ручная проверка с железом (STM32/ESP32 по USB-UART) — за пользователем: Chrome → Connect → выбрать порт

## [2026-06-11] plan | Web Frontend — roadmap цикл 2 (фазы 10–17) + скиллы

- Исследование границы «реальное/мок»: мок остались UART Monitor, OTA, AI, Programs, Analyzer, Firmware/Agent; SPICE только линейный (R/C/L); PCB-DRC без зазоров
- [roadmap-web.md](roadmap-web.md): добавлены фазы 10–17 — Web Serial (UART/PID live/esptool-js OTA), SPICE 2.0 (диод/BJT/MOSFET, Ньютон-Рафсон), PCB Pro (clearance-DRC, ручные дорожки, pour, P&P), Schematic UX, библиотека (custom parts, `.kicad_sym`), кросс-модули (FSM-генератор, Analyzer по `design.ts`, AI опц.), гигиена (`.ucp` v2, code-split three, PWA), 6 новых модулей
- Новые скиллы `/ucp-web-impl-*` (по одному на пункт/группу) + дашборд `/ucp-web-roadmap`; обновлены `/ucp-web`, [skills.md](skills.md)
- Конвенция логов: после каждого пункта — галочка в roadmap-web + запись сюда (файлы, тесты, коммит)

## [2026-06-10] feature | Web — фаза 8.3–8.5: реальный SPICE, three.js, генераторы

- **SPICE по топологии** (`src/spice.ts`): узлы из проводов+меток (`buildNodes`), номиналы `parseValue` (10k/100n), режимы DC/TRAN (backward-Euler companion C/L)/AC (комплексный MNA → Боде); панель выбора source/ground/probe; экспорт `.cir`
- **3D на three.js** (`src/three/`): WebGL-меш платы + OrbitControls, экспорт бинарный STL + STEP AP214; Part Editor рендерит CSG тем же вьюпортом; deps `three@0.184`
- **Настоящие генераторы** (`src/codegen.ts` + общий стор `src/design.ts`): LVGL ui.c/ui.h из виджетов, C-struct/парсер пакета (C/Python, CRC), параметрический Arduino/ESP-IDF; Sequence → PNG
- Тесты: Vitest 50 (spice/codegen/exporters), Playwright 6; обновлён [Web Frontend](modules/web_frontend.md)

## [2026-06-10] update | Web Frontend — A* routing, layers, KiCad import

- Роутер `src/routing.ts`: A* по сетке с объездом препятствий (`routeOrthogonal`/`routeOrthogonalEx`) — общий для Schematic (объезд корпусов) и PCB (объезд футпринтов)
- PCB: последовательная разводка (уложенные дорожки = препятствия) + **двухслойная** F.Cu/B.Cu с переходными отверстиями; Schematic-провода и ERC-подсветка висящих выводов
- Импорт `.kicad_sch`: компоненты с раскладкой + цепи по геометрии (`lib_symbols` × трансформация инстанса → union-find проводов); + `.net` (полный)
- Обновлены [Web Frontend](modules/web_frontend.md), скилл `/ucp-web-route` (PCB на A*); новые скиллы `/ucp-web-route`, `/ucp-web-module`, `/git`
- Тесты: 29 Vitest + 2 Playwright; коммиты `0c608a0`→`d7776ed`

## [2026-06-10] update | Web Frontend — WASM core, shared model, tests/CI/deploy

- Веб-фронтенд доведён с мок-демо до прод-готовности; обновлена [Web Frontend](modules/web_frontend.md)
- **WASM-ядро** (`wasm/`, Emscripten+embind): `crc`, `pidStep`, `rcLowpass`, `connectedComponents`, `csg` (BSP) — с JS-фолбэком, бейдж `engine: wasm|js`; артефакты в `public/wasm/`
- **Общая модель** `UcpProject{components, wires}` (`.ucp`): Schematic правит (multi-pin U=6, рисование проводов), Netlist/PCB/3D читают; DRC, экспорт нетлиста (`.net`) и Gerber (RS-274X)
- undo/redo (Edit-меню, коалесинг), File Save/Open, автосейв localStorage, keep-alive вкладок
- Vitest (21) + Playwright (2), CI-джоба `web`, деплой на GitHub Pages (`deploy-web.yml`)
- Скилл `/ucp-web` обновлён (test/test:e2e/build:wasm)

## [2026-06-02] add | Web Frontend (React+TS+Vite)

- Новая веб-версия UI: порт Qt6 десктоп-оболочки на React 18 + TypeScript (strict) + Vite 5, в `platform_app/web/`
- Оболочка 1:1: MenuBar/ModuleTree/Workspace/StatusBar + GitHub-dark тема из `applyTheme("dark")`; состояние через `UcpContext` (замена EventBus+Project); `MODULE_TREE` повторяет `ModuleFactory`
- Все 25 модулей реализованы интерактивно (мок-данные): Schematic/SPICE/PCB/3D/PID/Protocol/CodeGen/UI Designer/AI/OTA/Firmware/Agent
- Проверено браузером: 0 JS-ошибок, CRC-32("123456789")=0xCBF43926, `npm run build` чист
- Добавлены: [Web Frontend](modules/web_frontend.md), запись в [skills.md](skills.md) (`/ucp-web`), первый коммит репо `8f7e60e`

## [2026-05-17] improve | Soldering Iron — session-02 (6 улучшений)

- **TIM4 pulse**: убран DWT busy-wait из ISR нагревателя → двухступенчатый ISR TIM3→TIM4→PA8
- **sin² коррекция**: `triac_correction[101]` — линеаризация реальной мощности симистора
- **Debounce кнопки**: `btn_debounce_polls` счётчик, подтверждение через 3 опроса (15мс)
- **EMA фильтр**: Q8 fixed-point, α=51/256≈0.2 — давит помехи симистора на ADC
- **Standby**: таймер 10мин бездействия → stop heater + экран STANDBY, любой ввод → wake
- **Flash storage**: `core/flash_storage.h/.c` — magic 0xDEADBEEF + HAL_FLASH сектор 7
- обновлены: `heater_driver`, `heater_module`, `encoder_driver`, `temp_module`, `display_module`, `menu_renderer`, `app.h/.c`, `main.c`, `CMakeLists.txt`

## [2026-05-17] add | STM32 Firmware Architecture concept

- создано: `concepts/stm32-firmware-architecture.md` — шаблон для всех будущих embedded-устройств
- содержит: структуру папок, EventBus C-версию, App tick шаблон, FSM меню, таблицу периферии, Flash storage, Standby, CMakeLists шаблон, чеклист нового устройства

## [2026-05-17] add | Soldering Iron Firmware

- создано: `modules/soldering_iron_firmware.md`
- описание firmware паяльника на STM32F401CCU6: DisplayModule (SSD1306), EncoderModule (TIM2), TempSensorModule (ADC+NTC), HeaterModule (симистор, фазовый сдвиг), RegulatorModule (P-регулятор), EventBus, App FSM
- обновлено: `index.md` — добавлена строка в секцию Modules

---

## [2026-05-17] feature | v2.0 COMPLETE — CSG, STEP, AI Schematic, OTA Flash, WASM

### v1.3 — 3D Boolean Ops (CSG) + STEP Export

- **BSP-tree CSG** (`modules/threed/threed_module.h/.cpp`): full `csgUnion / csgSubtract / csgIntersect` using `CsgMesh = QVector<CsgTriangle>`, no external library
  - `CsgNode`: `build()`, `clip()`, `clipTo()`, `invert()`, `allTriangles()` — standard BSP algorithm
  - `splitTriangle()`: plane-clips triangle with fan triangulation for polygon pieces
  - `primitiveToMesh()`: tessellates any `ThreeDPrimitive` (Box/Cylinder/Board/Sphere) to `CsgMesh`
  - `CsgResultPrimitive`: stores result mesh, implements `buildVertices()` / `exportSTLTriangles()`
  - Toolbar buttons in `PartEditorModule`: "A|B Union", "A-B Subtract", "A&B Intersect"
- **STEP export** (`StepWriter::meshToStep()`): ISO-10303-21/AP214 with `COORDINATES_LIST` + `TRIANGULATED_FACE_SET` — no OpenCASCADE
  - "STEP" toolbar button in PartEditorModule; `ThreeDView::exportSTEP()`
- Integration tests: 4 CSG tests + 3 STEP tests added to `test_integration.cpp`

### v2.0 — AI Schematic

- New module `modules/ai/ai_schematic_module.h/.cpp`:
  - `REGISTER_MODULE(AiSchematicModule)` — smoke-tested
  - POST to `https://api.anthropic.com/v1/messages` (model `claude-sonnet-4-6`) via `QNetworkAccessManager`
  - API key from `UCP_CLAUDE_KEY` env; graceful fallback if missing or no network
  - `applySchematic()`: strips ```json fences, parses `{components, connections}`, emits `EventBus::instance().emitEvent("ai.schematic.ready", ...)`
  - Guard: `#ifdef HAS_QT_NETWORK`
- `SchematicModule::onAiSchematic()`: subscribes to `ai.schematic.ready`, places components in 8-col grid (120×100px), draws wires
- `CMakeLists.txt`: `find_package(Qt6 COMPONENTS Network QUIET)` → `HAS_QT_NETWORK` + `Qt6::Network` link
- Integration tests: 4 AI tests (valid JSON, markdown strip, empty, event emitted via `AiEventReceiver` helper)

### v2.0 — OTA Flash

- New module `modules/ota/ota_flash_module.h/.cpp`:
  - `REGISTER_MODULE(OtaFlashModule)`
  - `buildArgs()`: returns `{"-m","esptool","--port",...,"write_flash","--flash_mode","dio",...}`
  - `parseProgressLine()`: `static QRegularExpression(R"(\(\s*(\d+)\s*%\))")` → int or -1
  - Port list: `QSerialPortInfo::availablePorts()` under `#ifdef HAS_QT_SERIALPORT`, else COM1–3 fallback
  - `onFlash()`: spawns `python` process, streams stdout/stderr to log, `QProgressBar` via `parseProgressLine()`
- Integration tests: 6 OTA tests (widget, buildArgs port/addr/defaults, parseProgressLine normal/empty/boundary)

### v2.0 — WASM

- `cmake/wasm.cmake`: Emscripten toolchain (`emcc`/`em++`/`emar`), reads `$ENV{EMSDK}` + `QT_WASM_ROOT`, sets `CMAKE_EXECUTABLE_SUFFIX ".html"`, Qt WASM linker flags
- `UCP_WASM` CMake flag: OTA Flash excluded via `$<$<NOT:$<BOOL:${UCP_WASM}>>:...>`, `add_compile_definitions(Q_OS_WASM)`
- `spice_module.h/.cpp`: `#ifndef Q_OS_WASM` guards on `#include <QProcess>`, slot declarations, `m_process` member, `runSimulation()` early return
- `.github/workflows/ci.yml`: `wasm` job — emsdk 3.1.50 + aqtinstall Qt 6.6.0 wasm_singlethread, `continue-on-error: true`, artifact upload (ucp.html/wasm/js)

### Test suite update

| Suite | Tests | Status |
|-------|-------|--------|
| CoreTests | 8 | PASS |
| SmokeTests | 64 (22 module types) | PASS |
| IntegrationTests | 36 | PASS |

### Documentation + skills updated

- `wiki/roadmap.md`: v1.3 + v2.0 all items ✓ DONE
- `memory/project_ucp.md`: rewritten for v2.0.0 (22 modules, full key patterns)
- New skills: `/ucp-impl-ai-schematic`, `/ucp-impl-ota-flash`, `/ucp-impl-wasm`
- `wiki/skills.md`: v1.1–v1.3 all marked DONE, v2.0 section added
- `wiki/index.md`: AI Schematic + OTA Flash module pages added
- New wiki pages: `wiki/modules/ai_schematic.md`, `wiki/modules/ota_flash.md`

---

## [2026-05-17] feature | v1.0 — Wire serialization + EventBus off() + 19 integration tests

### Wire serialization (`schematic_module.cpp`)
- `SchematicScene::serialize()`: wires now encoded as `{from:{refdes,pin}, to:{refdes,pin}}` instead of empty `{}`
- `SchematicScene::deserialize()`: restores wires via `QHash<refdes→comp>` lookup after components loaded; no undo-stack pollution
- New integration test `schematic_wire_roundtrip`: serialize R1–C1 scene, deserialize into new scene, verify 1 wire + correct pin connections

### EventBus unsubscribe (`event_bus.h/cpp`, `module.cpp`)
- `EventBus::on()` now stores each `QMetaObject::Connection` in `QMultiHash<QObject*, Connection> m_connections`
- First `on()` call for a receiver registers auto-cleanup on `QObject::destroyed`
- `EventBus::off(QObject*)` disconnects and removes all connections for that receiver
- `Module::destroy()` calls `EventBus::instance().off(this)` — eliminates dangling lambda callbacks

### v1.0 roadmap
- Wire serialization ✓, EventBus off ✓, Project save/load UI ✓ (was already implemented)
- Remaining: stable IModule API, Qt Help docs, package managers
- Total integration tests: 19 (was 18)

### Wiki/skill updates
- `architecture/event_bus.md`: added off() documentation
- `modules/schematic_editor.md`: added wire serialization + refdes counter sections
- `.claude/commands/ucp-impl-wire-serial.md`: marked DONE
- `.claude/commands/ucp-impl-eventbus-unsub.md`: marked DONE
- `.claude/commands/ucp-impl-project-save.md`: marked DONE

---

## [2026-05-17] testing | Integration tests + critical bug fixes + improvement vectors

### Integration test suite (`tests/test_integration.cpp`) — 14 tests
- CRC-32 known vector ("123456789" → 0xCBF43926) ✓
- CRC-16/MODBUS known vector (0x4B37) ✓  
- CRC C-code generation non-empty ✓
- PID: proportional, clamp high/low, disabled=0, Z-N autotune, integral accumulation ✓
- Schematic: add component, refdes counter, serialize→deserialize roundtrip ✓
- PCB: DRC on empty scene passes, placeFootprint non-null with pads ✓

### Critical production bugs found and fixed

**Bug 1 — SchematicScene: components never visible after placement**  
`addComponent()` created SchematicComponent but did NOT call `addItem()` before pushing to QUndoStack. `AddComponentCmd::redo()` has `m_first=true` which skips the initial `addItem`. Result: placed components were invisible on screen.  
Fix: call `addItem(comp)` before `push()` in `addComponent()`. Same fix applied to `addWire()` + pre-connected pins.

**Bug 2 — PidTunerModule: null crash on init**  
`init()` called `addChannel()` which accessed `m_channelSelector` (null before `widget()`).  
Fix: null-guard in `addChannel()` + repopulate from children in `widget()`.

**Bug 3 — QString::arg format string**  
`"#define PIN_%-20s"` is printf syntax, not Qt. Fixed: `leftJustified(20)`.

### Improvement vectors added to roadmap (Tier 1–4, 15 items)

---

## [2026-05-17] testing | Smoke tests + bug fixes + module documentation

### Smoke test suite (`tests/test_smoke.cpp`)
- 62 test cases across 3 groups: factory_all_types, module_init, module_widget
- All 20 registered module types covered
- `tests/CMakeLists.txt` updated: `ucp_smoke_tests` target with `--whole-archive` + `QT_QPA_PLATFORM=offscreen`
- Run: `QT_QPA_PLATFORM=offscreen ctest` — 100% pass

### Bugs found and fixed
- **PidTunerModule**: `addChannel()` called from `init()` accessed `m_channelSelector`/`m_channelContainer` before `widget()` — null ptr crash. Fixed: null-guard + repopulate in `widget()`
- **ArduinoExportModule / CodeGenModule**: `"#define PIN_%-20s"` printf format inside `QString::arg()` — 5 runtime warnings. Fixed: `leftJustified(20)` 

### New wiki pages (5 modules previously undocumented)
- `wiki/modules/spice.md` — ngspice integration, raw-file parser, WaveformWidget
- `wiki/modules/pcb.md` — layers, footprints, DRC, Gerber export, keyboard shortcuts
- `wiki/modules/threed.md` — QPainter renderer, primitives, STL export
- `wiki/modules/protocol.md` — sequence diagrams, packet editor, UART monitor, protocol analyzer
- `wiki/modules/codegen.md` — CRC, LVGL, Arduino/ESP-IDF, protocol code gen

### Roadmap
- Added Improvement Vectors section (Tier 1–4) with 15 specific actionable items
- Smoke tests item marked done in v0.9

---

## [2026-05-17] meta | Memory system, skills page, wiki index updated

- Created Claude Code memory system: `~/.claude/projects/d--shemaTehnik/memory/`
  - `MEMORY.md` — index
  - `project_ucp.md` — UCP architecture + roadmap status snapshot
  - `project_mcu_wiki.md` — wikiMemory Obsidian vault overview
  - `user_profile.md` — user domain, language, communication style
  - `feedback_style.md` — confirmed coding rules (CMake 3.20, no comments, no trailing summaries)
  - `skills_commands.md` — all available slash commands with triggers and descriptions
- Created `wiki/skills.md` — slash command reference for this project (RU)
- Updated `wiki/index.md` — added link to skills.md

---

## [2026-05-17] feature | v0.4/v0.7/v0.8/v0.9 optional items + infrastructure complete

### PCB Auto-placement from Netlist (v0.4 remaining)
- `PcbModule::onNetlistReceived(const QVariant &)`: EventBus subscriber for `netlist.generated`
- `importFromNetlist(const QString &)`: static typeToFp map (R→R_0805, C→C_0805, U→DIP8, etc.)
- Parses netlist component lines, places footprints in 8-column grid (40mm spacing)
- "Import from Schematic" toolbar button triggers placement from stored `m_lastNetlist`
- Files: pcb_module.h/.cpp extended (~40 new lines)

### I2C/SPI Protocol Analyzer (v0.7 remaining)
- `ProtocolAnalyzerModule`: new child of ProtocolModule
- `parseHexInput()`: regex split on whitespace/comma/0x-prefix, returns `QVector<uint8_t>`
- `decodeI2C()`: START → ADDRESS (7-bit + R/W) → ACK/NAK → DATA bytes → STOP; addRow() populates QTableWidget
- `decodeSPI()`: byte pairs as MOSI/MISO columns, auto-detects odd input length
- 4 presets: I2C Read, I2C Write, SPI 8-bit, SPI 16-bit (hex input examples)
- Files: protocol_module.h/.cpp extended (~130 new lines)

### Protocol Code Generator (v0.8 remaining)
- `ProtocolCodeGenModule`: new child of CodeGenModule
- `widget()`: packet name field, CRC algorithm selector (all 12 from CrcEngine), "Append CRC" checkbox
- Fields QTableWidget: Name/Type/Description columns; default Modbus-style fields (addr, func, data, crc)
- `generateCode()`: `#pragma pack(push,1)` struct + `_encode()` (memcpy + CRC compute + append) + `_decode()` (length check + CRC verify + memcpy)
- `exportFiles()`: writes `<name>.h` with header guards + `crc.c` from `CrcEngine::generateCCode()`
- CRC identifier: `alg.name.toLower().remove('/').remove('-')` → valid C identifier
- Files: codegen_module.h/.cpp extended (~140 new lines)

### CLI & Multilingual (v0.9 remaining)
- `main.cpp` rewritten: QCommandLineParser with `--build <project.ucp>` + `--lang <en|ru>`
- `runHeadlessBuild()`: opens JSON, prints name/version/module count, returns 0
- `QTranslator`: loads `qt_<lang>` from Qt translations path + `ucp_<lang>` from `:/translations`
- Language auto-detected from `QLocale::system().name().left(2)`; `--lang` overrides
- Files: `translations/ucp_ru.ts` (95 strings across 6 contexts), `translations/ucp_en.ts` (identity translations)

### Unit Tests (v0.9 remaining)
- `tests/test_core.cpp`: `StubModule` concrete subclass with `eventCount` + `onEvent()`
- 8 test slots: `module_name`, `module_id_unique`, `module_parent_child`, `module_find_child`, `module_serialize_roundtrip`, `eventbus_emit_receive`, `eventbus_multiple_receivers`, `eventbus_no_crossfire`
- All EventBus tests call `QCoreApplication::processEvents()` before asserting count
- `tests/CMakeLists.txt`: `find_package(Qt6 REQUIRED COMPONENTS Test)`, links `ucp_core`

### Infrastructure
- CMakeLists.txt: `qt_add_translations()` for ucp_ru.ts + ucp_en.ts; `enable_testing()` + `add_subdirectory(tests)`
- `translations/` directory: placeholder ucp_ru.ts + ucp_en.ts (Qt Linguist XML format)
- wiki/roadmap.md: auto-placement, protocol analyzer, protocol codegen, CLI, multilingual, unit tests marked DONE
- Total new code: ~310 new lines C++17 + ~240 lines XML translations, project total ~8000+ lines

---

## [2026-05-16] feature | v0.2/v0.3/v0.4/v0.7 optional items complete

### Symbol Editor (v0.2 remaining)
- `SymbolScene`: QGraphicsScene with dot grid (10px), center axes, 5 drawing tools
- Tools: Select, Line, Rect, Circle, Text (QInputDialog on click)
- Del/Esc key handling; item select + delete
- Serialize/deserialize all drawn items to/from JSON
- `SymbolEditor::widget()`: name + description fields, toolbar, QGraphicsView
- Pin table (QTableWidget: Name/X/Y/Dir) with Add/Remove buttons
- Pin markers auto-refreshed on table change (tagged with `setData(99)`)
- Save/Load JSON via QFileDialog
- Files: schematic_module.h/.cpp extended (~160 new lines)

### SPICE Analysis Selector (v0.3 remaining)
- `SpiceAnalysis` enum: Tran / AC / DcSweep
- UI: QGroupBox with QComboBox + QStackedWidget (3 param pages)
- Tran page: Step (ms) + Stop (ms) with QDoubleSpinBox
- AC page: Points/decade, Fstart, Fstop
- DC Sweep page: Source name, Start/Stop/Step voltages
- `runSimulation()`: strips existing analysis line, injects selected analysis before `.end`
- Files: spice_module.h/.cpp extended (~80 new lines)

### PCB Undo/Redo (v0.4 remaining)
- `AddPcbTraceCmd`, `AddPcbViaCmd`, `AddPcbFootprintCmd`: `m_first`/`m_owned` pattern
- `PcbScene::m_undoStack` initialized in constructor; board outline added directly (not in stack)
- `addTrace()`, `addVia()`, `placeFootprint()` each push to undo stack after `addItem()`
- Undo/Redo toolbar actions added to PcbModule widget
- Files: pcb_module.h/.cpp extended (~70 new lines)

### UART Monitor (v0.7 remaining)
- `UartMonitorModule`: new child of ProtocolModule
- UI: Port combo (Scan button), Baud, Format (8N1/8N2/7E1/7O1), Connect toggle
- RX log: colored timestamp (hh:mm:ss.zzz), RX=green / TX=blue, HTML-safe
- Hex mode toggle; Clear button; Enter key sends
- HAS_QT_SERIALPORT guard: real QSerialPort when Qt6::SerialPort linked
- Demo mode: COM1–9 listed, data echoed locally
- CMakeLists.txt: `find_package(Qt6 OPTIONAL_COMPONENTS SerialPort)`; conditional link + define
- Files: protocol_module.h/.cpp extended (~160 new lines)

### Infrastructure
- CMakeLists.txt: version bumped to 0.9.1
- modules_init.h: added UartMonitorModule force-link
- wiki/roadmap.md: Symbol Editor, Analysis Selector, PCB Undo/Redo, UART Monitor marked DONE
- Total new code: ~470 lines C++17, project total ~7500+ lines

---

## [2026-05-16] init | Project kickoff

- Created wiki structure: AGENTS.md, index.md, log.md
- Created: overview.md, philosophy.md, roadmap.md
- Created: architecture/module_system.md, architecture/event_bus.md
- Created: modules/schematic_editor.md, modules/program_system.md
- Created: concepts/hal.md, concepts/pin_mapping.md
- Initial code written: core (module, factory, event bus, project), schematic module example, main window

## [2026-05-16] feature | SchematicEditor — full QGraphicsScene implementation

- SchematicComponent: 7 component types (R, C, D, NPN, PNP, GND, V) with pins
- SchematicPin: connection points, wire tracking
- SchematicWire: auto-orthogonal routing, pin-to-pin connection
- SchematicScene: wire mode with rubber band preview
- ComponentLibrary: dock widget with component list
- WireTool sub-module: routing options (orthogonal toggle)
- NetlistModule sub-module: stub with QTextEdit output
- SPICEModule sub-module: stub (ready for ngspice)
- Totals: 856 lines (243 header + 613 implementation)
- Updated roadmap: ~80% of v0.2 done

## [2026-05-16] feature | SPICE simulation + full NetlistGenerator

- NetlistGenerator: DFS-based net tracing (adjacency graph → net numbers)
- Supports R, C, D, NPN, PNP, V, GND SPICE output
- Default analysis: .tran 1m 100m (or .ac if AC source detected)
- SPICEModule: ngspice subprocess integration (ngspice -b)
- SPICE3 raw format parser (header + tab-separated values)
- WaveformWidget: QPainter graph with grid, legend, cursor tooltip
- Multi-signal: up to 9 signals with distinct colors
- Component values: defaults (R=1k, C=100n, V=5V...), serialized in JSON
- New file: spice_module.h/.cpp (518 lines)
- Updated schematic_module.h/.cpp: value field, constructor defaults
- Totals: ~2000 lines C++17 across project

## [2026-05-16] feature | v0.6 3D Editor + v0.8 Code Generator + v0.9 Polish

### 3D Editor (v0.6) — no OpenCASCADE dependency
- ThreeDView: QPainter isometric renderer with painter's algorithm face sorting
- Rotation: LMB drag (X+Y axes), zoom: mouse wheel. Range: rotX [-89°,89°], zoom [0.3–20×]
- BoxPrimitive: 6 quads, each split to 2 triangles for STL
- CylinderPrimitive: N=16 segments, 2 caps + 16 side quads
- BoardPrimitive: flat box with green top face (PCB texture)
- Directional light shading: dot(normal, light_dir) → brightness multiplier
- PrimitivePropsPanel: QDoubleSpinBox for Pos XYZ and Size XYZ, live update
- Binary STL export: 80-byte header, per-triangle normals, correct endianness
- Object list with type icons (□ ⊙ ▬), selection sync list↔view
- Default scene: board + IC housing + capacitor (demo scene)
- Files: threed_module.h, threed_module.cpp (~550 lines)

### Code Generator (v0.8)
- CrcCalculatorModule: 12 algorithms (CRC-8, CRC-8/Dallas-Maxim, CRC-16/CCITT,
  CRC-16/Modbus, CRC-16/ARC, CRC-16/XMODEM, CRC-32, CRC-32C, etc.)
- CRC: real table-driven computation with refIn/refOut/xorOut parameters
- CRC C code generator: 256-entry lookup table + typed function (uint8/16/32_t)
- LvglExportModule: 4 screens (main_menu, program_select, pin_mapping, monitor)
  - Generates LVGL v8.x compatible C/H code with lv_obj_t, lv_label, lv_btn, etc.
  - Export to folder: ui_*.c + ui_*.h + main.c + CMakeLists.txt
- ArduinoExportModule: 3 targets (Arduino .ino, ESP-IDF main.c, PlatformIO)
  - Pre-built pin maps for Greenhouse, Fan, Washing Machine programs
  - Exports full files with #define PIN_ and setup()/loop() or app_main()
- Files: codegen_module.h, codegen_module.cpp (~500 lines)

### v0.9 Polish — MainWindow overhaul
- Dark theme: full QPalette + 400-char QSS (QToolBar, QMenu, QTreeWidget,
  QTabBar, QPushButton, QComboBox, QSpinBox, QScrollBar, QSplitter, QGroupBox)
- Light theme toggle via View menu with QActionGroup (exclusive)
- Status bar: 3 zones (left=status, center=module name, right=version)
- EventBus "status.message" → QLabel with 5s auto-clear timer
- About dialog: HTML with module list, version, tech stack
- Shortcuts dialog (Ctrl+/): all keyboard shortcuts in HTML table
- Module tree toggle (Ctrl+\), animated tree expansion
- Window title: "ModuleName — ProjectName *" (modified indicator)
- Files: main_window.h, main_window.cpp rewritten (~220 lines)

### Infrastructure
- CMakeLists.txt: v0.8.0, added threed/, codegen/ sources
- modules_init.h: ThreeDModule, CodeGenModule force-linked
- wiki/roadmap.md: v0.6, v0.8, v0.9 marked DONE
- Total session: ~1900 new lines, project total ~7000+ lines C++17

## [2026-05-16] feature | v0.2 complete + v0.4 PCB Layout + v0.7 Protocol Designer

### Schematic Editor (v0.2 complete)
- Undo/Redo via QUndoStack: AddComponentCmd, AddWireCmd, DeleteItemsCmd, MoveComponentCmd
- Value Editor: double-click on component → QDialog for RefDes + Value
- SVG Export: QSvgGenerator export via toolbar button
- Delete key (Del/Backspace) removes selected items + connected wires
- Voltage source now has a proper circle symbol with +/- labels
- Files: schematic_module.h/.cpp fully rewritten (~600 lines)

### PCB Layout (v0.4)
- PcbPad: SMD and through-hole pads with net assignment
- PcbTrace: copper trace with layer + width, QPainter rendering
- PcbVia: through-hole via connecting F.Cu to B.Cu
- PcbFootprint: group of pads + silkscreen lines + courtyard boundary
- FootprintLibrary (singleton): 8 built-in footprints (R_0805, C_0402, C_0805, DIP8, DIP14, SOT23, TO92, Conn_01x02)
- PcbScene: 4 layers (F.Cu/B.Cu/F.SilkS/Edge.Cuts), trace routing mode, grid snap 0.25mm
- Layer visibility toggle per layer
- DRC: basic clearance check between traces and pads of different nets
- Gerber Export: RS-274X format for all 4 layers (apertures + flashes + draws)
- Files: pcb_module.h, pcb_module.cpp (~650 lines)

### Protocol Designer (v0.7)
- SeqDiagram parser: Mermaid-compatible (participant, ->>, -->, -->>; note over; title)
- SequenceDiagramWidget: pure QPainter renderer — boxes, lifelines, sync/async/reply arrows, notes
- 4 presets: UART 8N1, I2C Write, SPI Full-Duplex, Modbus RTU
- PacketEditorModule: QTableWidget (name/offset/width/type/desc) with live update
- PacketBitMapWidget: colored bit-field visualization (8 colors, bit labels)
- C struct export: #pragma pack(push,1) struct with bit-fields and comments
- 3 packet presets: UART 8N1 frame, Modbus RTU, 32-bit control register
- Files: protocol_module.h, protocol_module.cpp (~580 lines)

### Infrastructure
- CMakeLists.txt: added Qt6::Svg, pcb_module.cpp, protocol_module.cpp
- modules_init.h: force-link PcbModule, ProtocolModule
- wiki/roadmap.md: marked v0.2, v0.4, v0.7 as DONE
- Total new code: ~1830 lines C++17, project total ~5000+ lines

## [2026-05-16] feature | PID + Program System (v0.5)

### PID System
- PidCore: clean C++ PID algorithm (P+I+D, anti-windup clamping, Ziegler-Nichols autotune)
- PidChannel: single PID loop with Kp/Ki/Kd sliders, real-time PidGraphWidget
- PidTunerModule: multi-channel PID manager (add/stop/resume loops)
- Files: pid_core.h/.cpp, pid_tuner_module.h/.cpp (254 lines)

### Program System
- ProgramBase: abstract base with 5 states (IDLE/RUNNING/PAUSED/ERROR/COMPLETED)
- ProgramRegistry: factory with REGISTER_PROGRAM macro
- PinMappingWidget: table editor for Signal→GPIO assignment
- ProgramSystemModule: UI with program list, controls, pin mapping, log
- Files: program_core.h/.cpp, pin_mapping_widget.h/.cpp, program_system_module.h/.cpp (394 lines)

### Ready-made programs
- Greenhouse: 3 PID loops (temp/humidity/light), day/night cycle, 9 pins
- Fan: temperature→RPM curve, timer modes, 6 pins
- Washing Machine: 5 cycle types, PID motor+heater, 12 pins, 120min schedule
- Files: greenhouse_prog.h/.cpp, fan_prog.h/.cpp, washing_machine_prog.h/.cpp (233 lines)

### ESP32 Code Export
- Esp32Exporter: generates hal.h + pid_config.h + main.c + CMakeLists.txt
- Pin definitions, GPIO init, ADC/PWM wrappers, PID config
- Files: esp32_exporter.h/.cpp (180 lines)

### Infrastructure
- modules_init.h: force-link registrars for static library builds
- CMakeLists.txt: updated with all new sources
- Totals: ~1061 new lines, project total ~3183 lines C++17
