# UCP Implement: PCB DRC Improvements

Extend DRC to check trace-trace shorts, minimum trace width violations, and unconnected nets.

## Target files

- `platform_app/modules/pcb/pcb_scene.h/.cpp` — `runDRC()` extension
- `platform_app/modules/pcb/drc_result.h` — result struct (new file)

## Current DRC

Only checks pad-to-pad clearance. New checks:

```
1. Trace-trace shorts: two traces on same layer whose QGraphicsItem::collidesWithItem() returns true
   → "Short: trace at (x1,y1)-(x2,y2) intersects trace at ..."
2. Min trace width: trace.width < 0.1mm → "Trace width {w}mm below minimum 0.1mm"
3. Unconnected nets: for each net in netlist, count pads with that netId;
   if any net has pads but zero traces connecting them → "Net {name}: {n} unconnected pads"
```

## DrcResult struct

```cpp
struct DrcResult {
    enum Type { Short, MinWidth, Unconnected };
    Type type;
    QString message;
    QPointF location;
};
```

`runDRC()` returns `QList<DrcResult>`; display in a `QDialog` table (Type | Message | Location).

## Implementation steps

1. Create `drc_result.h` with struct above
2. Extend `PcbScene::runDRC()`: add the 3 new checks
3. Update DRC dialog to show the list (replace current simple QMessageBox)
4. Add integration test: build scene with intentional short → assert DRC finds it
5. Run `/ucp-test`

## After implementing

Mark `[ ] PCB DRC improvements` done in `wiki/roadmap.md` v1.2 section.
