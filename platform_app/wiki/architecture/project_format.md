# Project File Format

## Current Web Format

UCP web stores projects as `.ucp` JSON.

Current `.ucp` v2 envelope:

```json
{
  "version": 2,
  "project": {},
  "design": {}
}
```

## `project`

`project` contains the editable hardware model:

- schematic components;
- wires;
- labels;
- PCB tracks and board data;
- user parts.

The main implementation lives in `platform_app/web/src/project.ts`.

## `design`

`design` contains cross-module artifacts that are not plain schematic/PCB geometry:

- `uiProject` -- UI Designer screens / LVGL multi-screen export;
- `uiDesign` -- legacy UI Designer single-screen compatibility wrapper;
- `packet` -- Packet Editor / Protocol Code Gen / Protocol Analyzer;
- `fsm` -- Program System FSM export;
- `regMap` -- Register Map C/Markdown export.

The store implementation lives in `platform_app/web/src/design.ts`.

## Compatibility

Legacy v1 files without the envelope are opened migration-style. They should not overwrite design-store state unexpectedly.

Legacy v2 files with `design.uiDesign` but without `design.uiProject` load as a single `main` screen in `uiProject`.

Undo/redo currently covers `UcpProject` edits, not every design-store edit.

## Update Rules

When adding project-file fields:

- keep old files readable;
- add normalization in the relevant loader/store;
- add round-trip tests;
- update [Web Frontend](../modules/web_frontend.md), [Code Generator](../modules/codegen.md) if design-store artifacts change, and [log.md](../log.md).
