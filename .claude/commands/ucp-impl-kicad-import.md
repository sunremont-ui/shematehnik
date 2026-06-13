# UCP Implement: KiCad v7 Schematic Import

Parse KiCad `.kicad_sch` s-expression format and populate `SchematicScene`.

## Target files

- `platform_app/modules/schematic/kicad_importer.h/.cpp` — new parser
- `platform_app/modules/schematic/schematic_module.cpp` — add File→Import KiCad menu action

## KiCad v7 s-expression structure

```
(kicad_sch (version 20230121) ...
  (symbol (lib_id "Device:R") (at 100 100 0)
    (property "Reference" "R1" ...)
    (property "Value" "10k" ...)
  )
  (wire (pts (xy 100 50) (xy 150 50)))
  ...
)
```

## Implementation steps

1. Write `KiCadImporter::parse(const QString& path)`:
   - Read file as text, tokenize s-expressions with a simple recursive-descent parser
   - Extract `symbol` → create `SchematicComponent` (use lib_id last segment as type, set RefDes + Value from properties)
   - Extract `wire` → collect endpoint pairs
2. In `SchematicModule`, add "File → Import KiCad…" `QAction` → open `QFileDialog` for `*.kicad_sch`
3. Call `KiCadImporter::parse()` → populate `SchematicScene` via existing `addComponent` / `addWire` API
4. Add smoke test: import a minimal hand-crafted `.kicad_sch` fixture, assert component + wire count

## After implementing

Mark `[ ] KiCad import` done in `wiki/roadmap.md` v1.1 section.
