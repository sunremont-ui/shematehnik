# Agent Handoff -- LVGL Exporter Improvement V0

## Snapshot

Date: 2026-06-13.

Last implementation work:

- Slice 17 (extended style tokens: text/border/padding) implemented and verified; commit it with this handoff update.
- Slices 15 (RGB565A8 alpha image format) and 16 (widget hidden flag + opacity) committed as `3c86ced feat(web): LVGL RGB565A8 alpha images + widget hidden/opacity`.
- Slice 14 (binary RGB565 image asset pipeline) committed as `73e3d64 feat(web): add LVGL binary RGB565 image asset pipeline`.
- Slice 13 (per-child flex grow) committed as `c7a1e35 feat(web): add LVGL per-child flex grow`.
- Slice 12 (Panel flex cross-axis + track align) committed as `40d7209 feat(web): add LVGL Panel flex cross-axis and track alignment`.
- Slice 11 (Panel flex main-axis align) committed as `639c422 feat(web): add LVGL Panel flex main-axis alignment`.
- Slice 10 (project image asset manifest) committed as `eacb611 feat(web): add LVGL project asset manifest`.

Current lab state:

- Direct LVGL v8-style C export only.
- No SquareLine import/export compatibility claim.
- `uiProject` is the persisted multi-screen source of truth.
- `uiDesign` remains a legacy single-screen compatibility store.
- Implemented slices: single-screen golden baseline, multi-screen generator, UI project persistence, events, screen-load actions, extended styles (bg/radius/text/border/pad), image asset placeholders, project asset manifest (id/src + missing-asset report) with inline RGB565 + RGB565A8/alpha `lv_img_dsc_t` pixels, widget hidden/opacity, Panel flex layout + main/cross/track align, per-child flex grow, and same-screen Panel child parents.

## Current Working Files

Core code:

- `platform_app/web/src/design.ts`
- `platform_app/web/src/codegen.ts`
- `platform_app/web/src/image.ts`
- `platform_app/web/src/modules/UiDesignerView.tsx`
- `platform_app/web/src/modules/codegen_exports.tsx`
- `platform_app/web/src/codegen.test.ts`
- `platform_app/web/src/image.test.ts`
- `platform_app/web/src/project.test.ts`
- `platform_app/web/e2e/smoke.spec.ts`

Lab and curated docs:

- `platform_app_lab/projects/lvgl-exporter-improvement-v0/README.md`
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/current-audit.md`
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/research-plan.md`
- `platform_app_lab/projects/lvgl-exporter-improvement-v0/compatibility-matrix.md`
- `platform_app/wiki/modules/codegen.md`
- `platform_app/wiki/integration/squareline.md`
- `platform_app/wiki/roadmap-web.md`
- `platform_app/wiki/log.md`

Skill/command surfaces:

- `.codex/skills/ucp-web-lvgl-lab/SKILL.md`
- `.claude/commands/ucp-web-lvgl-lab.md`
- `platform_app/wiki/skills.md`

## Verified Checks

Latest full verification from slice 17:

```bash
cd platform_app/web
npm.cmd test -- codegen.test.ts project.test.ts
npm.cmd test
npm.cmd run build
# e2e: see shell note below
node node_modules/@playwright/test/cli.js test --grep "CodeGen LVGL" --reporter=line
```

Results:

- Full Vitest: 17 files / 159 tests passed.
- Build: OK; known lazy `ThreeDView` chunk warning remains.
- Targeted Playwright: 1 passed (`CodeGen LVGL`).
- e2e gotcha: `getByLabel` is a substring match and a select's accessible name includes its selected option text. New style controls (e.g. `Text align`) can collide with layout `Align`; the layout-align selector is now `getByLabel(/^Align/)`. Watch for similar collisions when adding labels.

Shell note: in the current Git Bash environment `npm run test:e2e` (and any `npm run`)
aborts immediately with a `"C:\Program"` path-split error from the npm script wrapper,
and the PowerShell tool is unavailable. Run Playwright directly via
`node node_modules/@playwright/test/cli.js test ...` to bypass it. Prior slices also saw
a webServer shutdown timeout after `ok 1`; if you hit that, treat it as an environment
issue once the test prints a pass, and record it honestly in `wiki/log.md`.

## Do Not Reopen Unless Needed

- Do not promise SquareLine `.spj` import/export without a real fixture and primary docs.
- Do not switch to LVGL v9 naming without a compatibility slice and new golden fixtures.
- Do not remove `genLvgl(widgets, screen)`; it is the legacy current-screen export path.
- Do not remove `uiDesign`; it is the compatibility wrapper for old `.ucp` design data.
- Do not stage unrelated untracked folders in this checkout.

## Good Next Slice Options

Slices 10-17 are done: asset manifest with inline RGB565 + RGB565A8/alpha pixels, widget
hidden/opacity, extended style tokens (text/border/padding), full main/cross/track flex
align and per-child flex grow. The v8 widget + layout + style + asset surface is now broad.
Pick one small vertical slice, write a `slice-18-*.md` plan first, then implement.

1. LVGL v9 research-only matrix update (recommended)

- No code changes.
- Re-check official LVGL v9 docs and record exact v9 constructor/screen/style/event/image
  differences in `compatibility-matrix.md`.
- Produce a candidate `slice-19-v9-mode.md` with acceptance criteria before any v9 codegen.

2. Custom font selection

- Add a minimal `UiStyle.font` (e.g. a montserrat size enum) -> `lv_style_set_text_font`.
- Generator emits the call only when set; keep font asset embedding out of scope.
- Tests: no-font output unchanged and one fixture.

3. Asset folder / skeleton export

- Bundle generated `ui.c/ui.h` plus declared inline assets into a downloadable set.
- Keep it a zip/manifest list, no build files yet.

Recommended next slice: option 1 (LVGL v9 research) before adding more v8 surface.

## Promotion Checklist For The Next Agent

For any implementation slice:

1. Update or add a lab slice document.
2. Add deterministic Vitest coverage before or with the generator change.
3. Update UI Designer only after the data model and generator contract are clear.
4. Update curated docs:
   - `platform_app/wiki/modules/codegen.md`
   - `platform_app/wiki/integration/squareline.md` if boundaries change
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/modules/web_frontend.md`
   - `platform_app/wiki/skills.md`
   - `platform_app/wiki/log.md`
5. Update `.codex/skills/ucp-web-lvgl-lab/SKILL.md` and `.claude/commands/ucp-web-lvgl-lab.md`.
6. Run checks from `platform_app/web`.
7. Commit only relevant tracked files and new lab docs.
