# Agent Handoff -- LVGL Exporter Improvement V0

## Snapshot

Date: 2026-06-13.

Last implementation commit:

- `5d4f4c6 feat(web): add LVGL panel child parents`

Current lab state:

- Direct LVGL v8-style C export only.
- No SquareLine import/export compatibility claim.
- `uiProject` is the persisted multi-screen source of truth.
- `uiDesign` remains a legacy single-screen compatibility store.
- Implemented slices: single-screen golden baseline, multi-screen generator, UI project persistence, events, screen-load actions, styles, image asset placeholders, Panel flex layout, and same-screen Panel child parents.

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

Latest full verification from slice 09:

```bash
cd platform_app/web
npm.cmd test -- codegen.test.ts project.test.ts
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "CodeGen LVGL"
```

Results:

- Targeted Vitest: 53 passed.
- Full Vitest: 16 files / 140 tests passed.
- Build: OK; known lazy `ThreeDView` chunk warning remains.
- Targeted Playwright: printed `ok 1` for `CodeGen LVGL`, then hit the known Playwright webServer shutdown timeout after 180s.

Treat the Playwright timeout as an environment/webServer shutdown issue when the test already prints `ok 1`; still record it honestly in `wiki/log.md`.

## Do Not Reopen Unless Needed

- Do not promise SquareLine `.spj` import/export without a real fixture and primary docs.
- Do not switch to LVGL v9 naming without a compatibility slice and new golden fixtures.
- Do not remove `genLvgl(widgets, screen)`; it is the legacy current-screen export path.
- Do not remove `uiDesign`; it is the compatibility wrapper for old `.ucp` design data.
- Do not stage unrelated untracked folders in this checkout.

## Good Next Slice Options

Pick one small vertical slice, write a `slice-10-*.md` plan first, then implement.

1. Minimal asset manifest pipeline

- Add a tiny `uiAssets` or `UiProjectDesign.assets` manifest for image ids.
- Keep binary generation out of scope.
- Generator can emit declarations plus a clearer missing/declared asset report.
- Tests: asset manifest round-trip, declaration dedupe, missing asset warning.

2. Minimal flex alignment metadata

- Extend `Panel.layout` with one or two alignment fields.
- Keep child auto-placement/responsive behavior out of scope.
- Generator emits v8 flex alignment calls only for declared metadata.
- Tests: no-alignment output unchanged and one project-level alignment fixture.

3. Minimal LVGL v9 research-only matrix update

- No code changes.
- Re-check official LVGL current docs and record exact v9 constructor/screen/style/event differences.
- Produce a candidate `slice-10-v9-mode.md` with acceptance criteria before implementation.

Recommended next slice if the user asks to continue implementation: option 1, because assets are currently the biggest practical gap and can be kept narrow.

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
