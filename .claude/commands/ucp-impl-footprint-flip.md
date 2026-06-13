# UCP Implement: Footprint Rotate/Flip

Add R (rotate 90°) and F (flip to B.Cu) keys for selected PCB footprints.

## Target files

- `platform_app/modules/pcb/pcb_footprint.h/.cpp` — add `rotation`, `flipped` state
- `platform_app/modules/pcb/pcb_scene.cpp` — handle Key_R / Key_F
- Undo commands: `RotateFootprintCmd`, `FlipFootprintCmd`

## Design

```cpp
class PcbFootprint : public QGraphicsItem {
    int m_rotation = 0;    // 0, 90, 180, 270
    bool m_flipped = false; // false = F.Cu side
    void rotate90();  // setRotation(m_rotation += 90)
    void flip();      // m_flipped ^= 1; move pads F.Cu ↔ B.Cu
};
```

On flip: iterate child `PcbPad` items, toggle pad layer `F.Cu` ↔ `B.Cu`. Update silkscreen layer accordingly.

## Implementation steps

1. Add `m_rotation`, `m_flipped` fields to `PcbFootprint`; implement `rotate90()` and `flip()`
2. Add `RotateFootprintCmd` and `FlipFootprintCmd` (QUndoCommand), both store old/new state
3. In `PcbScene::keyPressEvent`: Key_R → push RotateFootprintCmd; Key_F → push FlipFootprintCmd (for selected footprints)
4. Update `serialize()`/`deserialize()` for rotation + flipped fields
5. Run `/ucp-test`

## After implementing

Mark `[ ] Footprint rotate/flip` done in `wiki/roadmap.md` v1.2 section.
