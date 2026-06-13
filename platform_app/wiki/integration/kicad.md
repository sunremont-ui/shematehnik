# KiCad Integration

## Status

Curated boundary page for KiCad-related import/export paths.

Current UCP web support:

- import `.net` netlists into `UcpProject`;
- import `.kicad_sch` schematics by geometry into components and wires;
- import `.kicad_sym` symbols into the user library;
- export BOM CSV, Gerber copper/silkscreen/edge files and Excellon drill files.

## Current Limits

- `.kicad_sch` import resolves direct wire connectivity by geometry.
- Net labels, power symbols, hierarchy and all KiCad edge cases are not a complete compatibility target yet.
- Imported symbols are normalized into UCP user parts; UCP does not preserve every KiCad library field.
- PCB export is UCP-generated Gerber/Drill/PnP, not a KiCad PCB project writer.

## Related Files

- `platform_app/web/src/project.ts` -- `.net`, `.kicad_sch`, `.kicad_sym` import.
- `platform_app/web/src/data/library.ts` -- built-in and user library model.
- `platform_app/web/src/pcb.ts` -- Gerber, drill and pick-and-place generation.
- [Web Frontend](../modules/web_frontend.md) -- current web import/export summary.

## Promotion Criteria

Future KiCad compatibility work should add:

- real fixture files;
- parser/generator tests;
- documented unsupported constructs;
- round-trip expectations only where the model actually supports them.
