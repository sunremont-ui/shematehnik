---
name: ucp-web-lvgl-lab
description: Research, plan, and promote improvements for the UCP web UI Designer / LVGL Export module in D:\shemaTehnik\platform_app\web. Use when working on LVGL exporter audits, multi-screen UI model, styles/themes/assets/events/layouts, LVGL v8/v9 compatibility, SquareLine bridge notes, golden-output tests, roadmap/wiki updates, or lab artifacts under platform_app_lab.
---

# UCP Web LVGL Lab

Use this skill for research-first LVGL exporter work after roadmap phase 17.

## Workflow

1. Read the current state:
   - `platform_app/wiki/modules/codegen.md`
   - `platform_app/wiki/integration/squareline.md`
   - `platform_app/wiki/roadmap-web.md`
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
   - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-15-asset-alpha.md`
   - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-16-widget-visibility.md`
   - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-17-style-tokens.md`
   - `platform_app_lab/projects/lvgl-exporter-improvement-v0/slice-18-font.md`
   - `platform_app/web/src/design.ts`
   - `platform_app/web/src/codegen.ts`
   - `platform_app/web/src/modules/UiDesignerView.tsx`
   - `platform_app/web/src/modules/codegen_exports.tsx`
2. Keep lab notes separate from production wiki claims.
   - Lab files may contain hypotheses.
   - `platform_app/wiki/` should only receive confirmed current state, decisions, and promoted roadmap items.
3. Before code changes, define the smallest testable improvement:
   - data model change;
   - generator output change;
   - UI editing workflow;
   - golden-output test;
   - smoke/manual verification path.
4. If researching LVGL APIs, use primary sources and record source URLs/dates in lab notes.
5. Promote validated decisions back to:
   - `platform_app/wiki/modules/codegen.md`
   - `platform_app/wiki/integration/squareline.md`
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/log.md`

## Validation

For documentation-only changes, review diffs and link integrity.

For implementation changes, run from `platform_app/web`:

```bash
npm.cmd test -- codegen.test.ts
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "CodeGen LVGL"
```

Manual UI smoke:

- Open `?module=uidesigner` and edit widgets.
- Open `?module=lvgl` and verify generated `ui.c/ui.h`.
- Download generated files and compare with expected golden snippets.

## Notes

- Current exporter has a backward-compatible single-screen path and a persisted multi-screen `uiProject` path.
- Use `agent-handoff.md` as the compact continuation snapshot before choosing the next slice.
- `genLvglProject()`, the UI Designer state / `.ucp` migration wrapper, minimal clicked/value_changed event callback stubs, minimal `screen_load` actions, minimal bgColor/radius style tokens, `Image.assetId` placeholders, the `UiProjectDesign.assets` project manifest (id/src declarations + missing-asset report), a binary image pipeline (`genLvglImageAsset` inline `lv_img_dsc_t`, RGB565 + RGB565A8/alpha), per-widget `hidden`/`opa`, extended style tokens (bg/radius/text-color/text-align/border/pad + built-in Montserrat font), minimal `Panel.layout` flex output with main/cross/track `align`, per-child `flexGrow` and same-screen `Panel` child parents are in place; richer action graphs, imported fonts, asset folder export, per-state styles, nested/responsive layouts and LVGL v9 mode are still pending.
- Do not mix SquareLine import promises with direct LVGL export work unless a real `.spj` or generated SquareLine project fixture is in the lab.
