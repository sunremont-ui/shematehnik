# SquareLine Studio Bridge

## Status

Seed documentation page, created 2026-06-12 to close the wiki link and define the boundary for future LVGL/SquareLine work.

Current UCP web behavior is **direct LVGL C export**, not SquareLine import/export:

- UI Designer stores screens/widgets in `platform_app/web/src/design.ts` as `uiProject`; legacy single-screen `uiDesign` remains for compatibility.
- LVGL Export calls `genLvglProject()` for project export and keeps `genLvgl()` for current-screen export; both take a `mode: "v8" | "v9"` dialect (default `"v8"`, byte-identical) that swaps only the verified v8→v9 renames (see `compatibility-matrix.md`).
- The generated artifacts are `ui.c` + `ui.h`; the LVGL Export view can also download `ui.c`/`ui.h`/`README.txt` as a `.zip` (pure `src/zip.ts`).
- Current direct export includes event callback stubs + screen-load actions, full style tokens (bg/radius/text color/align/Montserrat font/border/padding/pressed-state), an image asset manifest with inline RGB565/RGB565A8 `lv_img_dsc_t`, widget hidden/opacity, `Panel` flex layout (flow/gap + main/cross/track align), per-child flex grow and same-screen `Panel` child parents; this still is not SquareLine project compatibility.

## Boundary

Do not claim SquareLine Studio project compatibility until a real fixture is added to the lab and tested.

For now, "SquareLine bridge" means a research target:

1. understand SquareLine project/export structure from primary docs and real examples;
2. compare that model with UCP `uiProject`;
3. decide whether UCP should import SquareLine projects, export SquareLine-compatible projects, or only generate LVGL C that is easy to compare with SquareLine output;
4. promote only verified findings back into curated wiki and roadmap.

## Related Lab

The active research workspace is:

`platform_app_lab/projects/lvgl-exporter-improvement-v0/`

The lab tracks:

- current UI Designer/LVGL exporter audit;
- LVGL v8/v9 compatibility matrix;
- multi-screen model proposal;
- styles/assets/events/layout/v9-dialect experiments, with minimal direct-export slices promoted only after tests;
- current confirmed layout work covers `Panel.layout` (flow/gap + main/cross/track align), per-child flex grow and non-Panel `parentId` only — not nested/responsive SquareLine project hierarchy;
- golden-output tests for generated `ui.c/ui.h` (v8 baseline byte-identical; v9 dialect covered separately);
- possible SquareLine bridge fixtures.

## Promotion Criteria

A SquareLine-related feature can move from lab to roadmap only when it has:

- a real input/output fixture;
- documented source format assumptions;
- deterministic parser or generator behavior;
- tests covering at least one happy path and one unsupported/invalid case;
- updated docs in `modules/codegen.md` and `roadmap-web.md`.
