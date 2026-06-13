# LVGL Exporter Improvement V0

## Goal

Turn the current UCP web LVGL exporter from a compact single-screen `ui.c/ui.h` generator into a measured improvement track for UI Designer 2.0.

The lab should answer what to build next, how to test it, and where the boundary sits between direct LVGL export and possible SquareLine Studio bridge work.

## Current Baseline

- Source model: `platform_app/web/src/design.ts` -> `uiProject` (`uiDesign` remains legacy single-screen compatibility).
- Editor: `platform_app/web/src/modules/UiDesignerView.tsx`.
- Export view: `platform_app/web/src/modules/codegen_exports.tsx`.
- Generator: `platform_app/web/src/codegen.ts` -> `genLvgl()`.
- Current output: `ui.c` and `ui.h` for one screen, default name `main`, with optional v8 event callback stubs, screen-load event actions in project export, minimal style tokens, image asset placeholders, Panel flex layout setup and Panel child object parents when widget metadata is set.
- Curated docs: `platform_app/wiki/modules/codegen.md` and `platform_app/wiki/integration/squareline.md`.
- Continuation handoff: `agent-handoff.md`.

## Workstreams

| Track | Question | Promotion target |
|---|---|---|
| L0 Audit | What does the current exporter really support? | `current-audit.md` |
| L1 Compatibility | Which LVGL v8/v9 APIs and examples should be the target? | compatibility matrix |
| L2 Data model | How should screens, widgets, styles, events, assets and layouts be represented? | design proposal |
| L3 Generator tests | What golden `ui.c/ui.h` fixtures prove the exporter? | `codegen.test.ts` fixtures |
| L4 Implementation | What is the smallest useful vertical slice? | web module PR/commit |
| L5 Promotion | Which findings become curated docs and roadmap items? | wiki + roadmap + log |

## First Deliverables

1. Finish `current-audit.md`. Done.
2. Fill `research-plan.md` with primary source links and test fixtures. Started in `source-notes.md`.
3. Draft the first implementation slice. Done in `slice-proposal.md`.
4. Add golden-output tests before changing broad UI behavior. Done for single-screen and multi-screen generator baselines.
5. Prototype the multi-screen model without `.ucp` migration. Done in `multi-screen-model.md` and `slice-02-multiscreen.md`.
6. Wire the multi-screen model into UI Designer state and `.ucp` persistence. Done in `slice-03-ui-project-state.md`.
7. Add a minimal event/action callback fixture for clicked/value_changed widgets. Done in `slice-04-events.md`.
8. Add a minimal style-token fixture for background color and radius. Done in `slice-05-styles.md`.
9. Add a minimal image asset placeholder for `Image` widgets. Done in `slice-06-assets.md`.
10. Add a minimal Panel flex layout fixture. Done in `slice-07-layouts.md`.
11. Add a minimal screen-load event action fixture. Done in `slice-08-actions.md`.
12. Add a minimal Panel child-parent fixture. Done in `slice-09-container-parents.md`.

## Lab Files

- `source-notes.md` -- primary source notes and access status.
- `compatibility-matrix.md` -- v8/current/latest compatibility boundary.
- `agent-handoff.md` -- current state, verified checks and next-agent continuation notes.
- `slice-proposal.md` -- selected first slice and acceptance criteria.
- `multi-screen-model.md` -- project/screen data model and migration boundary.
- `slice-02-multiscreen.md` -- multi-screen generator slice and acceptance criteria.
- `slice-03-ui-project-state.md` -- UI Designer state and `.ucp` migration wrapper slice.
- `slice-04-events.md` -- minimal widget event model, UI controls and generated callback stubs.
- `slice-05-styles.md` -- minimal widget style tokens and LVGL style attachment.
- `slice-06-assets.md` -- minimal image asset id placeholder and LVGL source binding.
- `slice-07-layouts.md` -- minimal Panel flex layout metadata and LVGL v8 flex setup.
- `slice-08-actions.md` -- minimal event action routing for LVGL screen loads.
- `slice-09-container-parents.md` -- minimal same-screen Panel child parent metadata and LVGL parent creation.

## Status

Started 2026-06-12 after web roadmap phase 17 completion. Current state: single-screen baseline, multi-screen generator baseline, UI Designer `.ucp` persistence wrapper, minimal clicked/value_changed callback stubs, minimal screen-load event actions, minimal bgColor/radius style tokens, minimal `Image.assetId` placeholders, minimal Panel flex layout metadata and minimal Panel child-parent metadata are tested; full asset pipeline, nested/responsive layouts, richer actions/themes and LVGL v9 mode are still pending. The latest continuation state for another agent is in `agent-handoff.md`.
