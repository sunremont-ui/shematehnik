# UCP Web LVGL Lab

Research-first laboratory for improving UI Designer and LVGL Export after roadmap phase 17.

## Scope

- Current implementation:
  - `platform_app/web/src/design.ts` -- `uiProject` store + legacy `uiDesign` compatibility store.
  - `platform_app/web/src/codegen.ts` -- `genLvgl()`.
  - `platform_app/web/src/modules/UiDesignerView.tsx` -- widget editor.
  - `platform_app/web/src/modules/codegen_exports.tsx` -- LVGL Export view.
- Lab artifacts:
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/README.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/agent-handoff.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/current-audit.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/research-plan.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/source-notes.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/compatibility-matrix.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-proposal.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/multi-screen-model.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-02-multiscreen.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-03-ui-project-state.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-04-events.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-05-styles.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-06-assets.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-07-layouts.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-08-actions.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-09-container-parents.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-10-asset-manifest.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-11-flex-align.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-12-cross-track-align.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-13-flex-grow.md`
  - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-14-asset-pipeline.md`

## Rules

- Start with source/audit notes before changing code.
- Separate current facts from planned exporter capabilities.
- Do not claim SquareLine import/export compatibility until verified against real files.
- Promote lab findings into `platform_app/wiki/roadmap-web.md`, `platform_app/wiki/modules/codegen.md`, and ADR/design notes before broad implementation.
- Keep generator improvements covered by golden-output tests in `platform_app/web/src/codegen.test.ts`.

## Suggested Lab Order

1. Audit current `uiProject`/`uiDesign` model and generated `ui.c/ui.h`.
2. Build LVGL v8/v9 compatibility matrix from official docs/examples.
3. Define target data model for screens, widgets, styles, events, assets and layouts.
4. Create tiny golden fixtures for generated C/H output.
5. Implement the smallest vertical slice.
6. Promote validated decisions back to wiki/roadmap.

Current slices: LVGL source notes, compatibility matrix, exact single-screen `ui.c/ui.h` golden baseline, `genLvglProject()` multi-screen baseline, UI Designer state / `.ucp` migration wrapper, minimal clicked/value_changed event callback stubs, minimal `screen_load` actions, minimal bgColor/radius style tokens, minimal `Image.assetId` placeholders, the `UiProjectDesign.assets` project manifest (id/src + missing-asset report), a binary RGB565 image pipeline (`genLvglImageAsset` inline `lv_img_dsc_t`), minimal `Panel.layout` flex output with main/cross/track `align`, per-child `flexGrow` and same-screen `Panel` child parents are in place. Read `agent-handoff.md` for the latest continuation snapshot. Prefer a second image format, per-child flex shrink/self-align, nested/responsive layout work, richer action graph or LVGL v9 mode next unless a narrower fixture is requested.

## Validation

After implementation changes, run:

```bash
cd platform_app/web
npm.cmd test -- codegen.test.ts
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "CodeGen LVGL"
```

Manual check: open `?module=lvgl`; verify widget edits change `ui.c/ui.h` output and downloads still work.
