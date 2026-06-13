# Code Generator Module

## Purpose

Code Generator в web-фронтенде UCP собирает embedded-артефакты из общих design-store данных: CRC, LVGL `ui.c/ui.h`, Arduino/ESP-IDF starter code, C/Python packet parsers, FSM C/H, Register Map C header и Markdown-документацию.

Текущая реализация относится к `platform_app/web/`: React + TypeScript UI, генераторы в `src/codegen.ts`, состояние в `src/design.ts`. Старая Qt-страница про export-folder больше не является источником истины для web-модуля.

## Module Tree

```text
Code Generator
├── CRC Calculator          -> CRC-8/16/32 calculation and C table snippets
├── UI Designer             -> shared uiProject store for LVGL Export
├── LVGL Export             -> ui.c/ui.h from UI Designer widgets
├── Arduino Export          -> Arduino .ino or ESP-IDF main.c starter
├── Protocol Code Gen       -> C/Python packet parser from Packet Editor fields
├── Pin Planner             -> MCU pin assignments and init-code export
├── EE Calculators          -> engineering reports for divider/LED/trace/LDO
├── Power Budget            -> BOM current estimate and rail budget CSV
└── Register Map            -> register/bitfield editor, C header, Markdown docs
```

Registered web module ids live in `platform_app/web/src/data/modules.ts`; dispatch lives in `platform_app/web/src/modules/index.tsx`.

## Shared Design Store

`platform_app/web/src/design.ts` stores cross-module artifacts outside the schematic/PCB model. `.ucp` v2 serializes these fields under top-level `design`:

| Store | Used by |
|---|---|
| `uiDesign` | Legacy single-screen UI Designer compatibility |
| `uiProject` | UI Designer screens, LVGL multi-screen export |
| `packet` | Packet Editor, Protocol Code Gen, Protocol Analyzer |
| `fsm` | Program System, FSM C/H export |
| `regMap` | Register Map, C header export, Markdown register docs |

Undo/redo currently covers `UcpProject` edits, not every design-store change. When extending generators, add explicit tests for snapshot/restore if persistence changes.

## Generators

| Function | Output | Source module |
|---|---|---|
| `genLvgl(widgets, screen)` | single-screen `ui.c` and `ui.h` | UI Designer/LVGL Export |
| `genLvglProject(project)` | multi-screen `ui.c` and `ui.h` | LVGL Lab / future UI Designer 2.0 |
| `genPacketStruct(fields, name)` | packed C struct | Packet Editor |
| `genProtoParser(fields, lang, name)` | C or Python packet parser | Protocol Code Gen |
| `genBlink(options)` | Arduino `.ino` or ESP-IDF `main.c` | Arduino Export |
| `genFsm(design)` | C/H FSM stepper | Program System |
| `genRegisterHeader(map)` | register map C header | Register Map |
| `genRegisterMarkdown(map)` | register map documentation | Register Map |

## LVGL Export

Current status:

- Source: `uiProject` store, edited through UI Designer; legacy `uiDesign` remains as a single-screen compatibility wrapper.
- Output: two files, `ui.c` and `ui.h`.
- Default/initial screen name: `main`.
- Supported widgets are the current UI Designer widget types, mapped to LVGL object creation calls.
- Export is deterministic and covered by an exact `ui.c/ui.h` golden-output baseline in `codegen.test.ts`, plus cross-module smoke tests.
- Multi-screen path: `genLvglProject()` accepts `UiProjectDesign` with multiple screens, emits screen-scoped widget globals, per-screen init functions and `ui_init()` with v8 `lv_scr_load(...)`.
- `.ucp` v2 persists `design.uiProject`; old files that only contain `design.uiDesign` load as one `main` screen.
- LVGL Export can show Project output or Current screen output, preserving the legacy `genLvgl(widgets, screen)` path.
- Minimal event model: widgets can store `event` metadata for `clicked` or `value_changed`; generated LVGL v8 C emits callback stubs, optional project-level `screen_load` actions via `lv_scr_load(ui_target)` and `lv_obj_add_event_cb(...)` registrations.
- Minimal style model: widgets can store `style.bgColor` and `style.radius`; generated LVGL v8 C emits `lv_style_t` init, background color/opacity, radius and `lv_obj_add_style(...)`.
- Minimal image asset placeholder: `Image` widgets can store `assetId`; generated LVGL v8 C emits `LV_IMG_DECLARE(asset)` and `lv_img_set_src(widget, &asset)`, or an explicit TODO when the image source is still missing.
- Minimal project asset manifest: `UiProjectDesign.assets` (`{ id, src?, w?, h?, format?, data? }`) declares known images. `genLvglProject()` declares the union of manifest and used widget assets once each, comments declared sources as `// src: <path>`, and reports widget assets used but absent from a non-empty manifest as explicit TODOs. Empty/absent manifest keeps the slice-06 declaration behavior unchanged.
- Binary image pipeline: a manifest asset can carry inline RGB565 pixels (`format: "rgb565"`, `w`, `h`, `data` of length `w*h*2`). `genLvglImageAsset` emits a `static const uint8_t <id>_map[]` byte array plus a `const lv_img_dsc_t <id>` (`LV_IMG_CF_TRUE_COLOR`); such assets are defined inline instead of `LV_IMG_DECLARE`d. `rgbaToRgb565` (in `image.ts`) is the pure canvas-RGBA -> RGB565 converter; the UI canvas decode feeds it. Intended for small icons -- large images bloat the `.ucp` JSON.
- Minimal Panel layout model: `Panel` widgets can store `layout.kind` (`flex_row` or `flex_column`), `layout.gap` and three flex placements `layout.align`/`crossAlign`/`trackAlign` (`start`/`center`/`end`/`space_between`/`space_around`/`space_evenly`); generated LVGL v8 C emits `lv_obj_set_layout(..., LV_LAYOUT_FLEX)`, `lv_obj_set_flex_flow(...)`, `lv_obj_set_flex_align(..., <main>, <cross>, <track>)` when any placement is set (unset args default to `LV_FLEX_ALIGN_START`) and gap pad setters.
- Minimal Panel child-parent model: non-Panel widgets can store `parentId` pointing to a same-screen `Panel`; generated LVGL v8 C creates children with the panel object as parent and emits panels before their children.
- Minimal per-child flex grow: a non-Panel widget can store `flexGrow` (positive integer); generated LVGL v8 C emits `lv_obj_set_flex_grow(child, n)` only when set. LVGL ignores it unless the parent is a flex container.

Known improvement area for the next laboratory pass:

- richer style/theme tokens, fonts and a fuller asset pipeline (more formats than RGB565, asset folder/skeleton export) beyond the current inline manifest;
- richer event/action workflows beyond direct screen loads, including user data, callback bodies and action chains;
- nested layout containers, per-child flex shrink, auto child reflow, flex/grid-like positioning and responsive display profiles;
- LVGL v8/v9 compatibility matrix;
- project-level export such as CMake/ESP-IDF/PlatformIO skeletons;
- additional golden-output fixtures for generated `ui.c/ui.h` as the model expands.

See also: [SquareLine Studio Bridge](../integration/squareline.md) and the LVGL lab roadmap in [Roadmap -- Web](../roadmap-web.md).

For continuation work, start with `platform_app_lab/projects/lvgl-exporter-improvement-v0/agent-handoff.md`.

## Protocol Code Gen

`Protocol Code Gen` reads the same `packet` fields as Packet Editor and Protocol Analyzer.

Workflow:

1. Define packet fields in Packet Editor.
2. Open Protocol Code Gen.
3. Generate C or Python parser.
4. Use Protocol Analyzer to validate sample frames against the same schema.

The current parser path assumes fixed-width big-endian fields and treats a field named `crc` as the checksum slot.

## Pin Planner

Pin Planner is part of the Code Generator family because it turns MCU pin assignments into starter code.

Key files:

- `platform_app/web/src/pinplanner.ts` -- MCU definitions, validation, code generation.
- `platform_app/web/src/modules/PinPlannerView.tsx` -- SVG package UI and export controls.
- `.codex/skills/ucp-web-pin-planner/SKILL.md` -- maintenance workflow.

## EE Calculators

EE Calculators generate engineering reports rather than firmware code. The module is colocated with Code Generator because it produces reusable design artifacts from numeric inputs.

Key files:

- `platform_app/web/src/eecalc.ts` -- pure formulas.
- `platform_app/web/src/modules/EeCalculatorsView.tsx` -- calculator cards and Markdown report export.
- `.codex/skills/ucp-web-ee-calculators/SKILL.md` -- maintenance workflow.

## Power Budget

Power Budget reads `UcpProject`, infers/defaults component current draw, groups loads by power-net labels and exports CSV.

Key files:

- `platform_app/web/src/power.ts` -- rail/load model and CSV export.
- `platform_app/web/src/modules/PowerBudgetView.tsx` -- editable load/rail table and summary bars.
- `.codex/skills/ucp-web-power-budget/SKILL.md` -- maintenance workflow.

## Register Map

Register Map edits device/register/bitfield metadata and generates both C and Markdown.

Generated C header includes:

- device base address and register offsets;
- absolute register addresses;
- reset values and access comments;
- field masks/shifts;
- inline `GET`/`SET` helpers.

Generated Markdown includes register tables and bitfield tables suitable for firmware docs.

Key files:

- `platform_app/web/src/design.ts` -- `regMap` store and `.ucp` v2 persistence.
- `platform_app/web/src/codegen.ts` -- `genRegisterHeader()` and `genRegisterMarkdown()`.
- `platform_app/web/src/modules/RegisterMapView.tsx` -- editor and live previews.
- `.codex/skills/ucp-web-register-map/SKILL.md` -- maintenance workflow.

## Validation

Run from `platform_app/web` after generator changes:

```bash
npm.cmd test
npm.cmd run build
```

Targeted smoke checks:

- `?module=lvgl` for UI Designer -> LVGL export.
- `?module=protogen` for packet parser output.
- `?module=pinplanner` for MCU init code.
- `?module=powerbudget` for rail budget CSV.
- `?module=regmap` for C/Markdown register previews.

The Playwright webServer occasionally leaves the process alive after the selected smoke test has printed `ok`; record that separately from actual assertion failures.
