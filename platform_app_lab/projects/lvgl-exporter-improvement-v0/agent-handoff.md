# Agent Handoff -- LVGL Exporter Improvement V0

## Snapshot

Date: 2026-06-13.

Last implementation work:

- Slice 12 (Panel flex cross-axis + track alignment) implemented and verified; commit it together with this handoff update.
- Slice 11 (Panel flex main-axis align) committed as `639c422 feat(web): add LVGL Panel flex main-axis alignment`.
- Slice 10 (project image asset manifest) committed as `eacb611 feat(web): add LVGL project asset manifest`.

Current lab state:

- Direct LVGL v8-style C export only.
- No SquareLine import/export compatibility claim.
- `uiProject` is the persisted multi-screen source of truth.
- `uiDesign` remains a legacy single-screen compatibility store.
- Implemented slices: single-screen golden baseline, multi-screen generator, UI project persistence, events, screen-load actions, styles, image asset placeholders, project asset manifest (id/src + missing-asset report), Panel flex layout + main/cross/track align, and same-screen Panel child parents.

## Current Working Files

Core code:

- `platform_app/web/src/design.ts`
- `platform_app/web/src/codegen.ts`
- `platform_app/web/src/modules/UiDesignerView.tsx`
- `platform_app/web/src/modules/codegen_exports.tsx`
- `platform_app/web/src/codegen.test.ts`
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

Latest full verification from slice 12:

```bash
cd platform_app/web
npm.cmd test -- codegen.test.ts project.test.ts
npm.cmd test
npm.cmd run build
# e2e: see shell note below
node node_modules/@playwright/test/cli.js test --grep "CodeGen LVGL" --reporter=line
```

Results:

- Full Vitest: 16 files / 147 tests passed.
- Build: OK; known lazy `ThreeDView` chunk warning remains.
- Targeted Playwright: 1 passed (`CodeGen LVGL`).

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

Slice 10 (asset manifest), slice 11 (main-axis align) and slice 12 (cross/track align)
are done. The full `lv_obj_set_flex_align` is now covered. Pick one small vertical slice,
write a `slice-13-*.md` plan first, then implement.

1. Binary/file asset pipeline

- Build on the slice-10 `UiProjectDesign.assets` manifest `src` field.
- Add image import + LVGL C array generation for declared assets.
- Keep it narrow: one format, deterministic output, no folder/skeleton export yet.
- Tests: array generation for a tiny fixture image, manifest-to-array linkage.

2. Per-child flex grow

- Add a minimal `UiW.flexGrow` for widgets inside a flex `Panel`.
- Generator emits `lv_obj_set_flex_grow(child, n)` only when set.
- Keep wrap/auto-reflow and grid out of scope.
- Tests: no-grow output unchanged and one grow fixture.

3. Minimal LVGL v9 research-only matrix update

- No code changes.
- Re-check official LVGL current docs and record exact v9 constructor/screen/style/event differences.
- Produce a candidate `slice-13-v9-mode.md` with acceptance criteria before implementation.

Recommended next slice if the user asks to continue implementation: option 2 (per-child
flex grow) as the smallest narrow extension, or option 1 for a real asset pipeline.

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
