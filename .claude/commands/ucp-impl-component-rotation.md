# UCP Implement: Component Rotation (R key)

Rotate selected schematic component 90° on R keypress; update pin positions accordingly.

## Target files

- `platform_app/modules/schematic/schematic_component.h/.cpp` — add rotation state + `rotate90()`
- `platform_app/modules/schematic/schematic_scene.cpp` — handle Key_R in `keyPressEvent`
- `platform_app/modules/schematic/schematic_scene.h/.cpp` — add `RotateComponentCmd` to undo stack

## Design

```cpp
// SchematicComponent
int m_rotation = 0; // 0, 90, 180, 270
void rotate90();    // increments m_rotation, calls setTransformOriginPoint(center), setRotation(m_rotation)
```

Pin hit-testing: pins are child items; `QGraphicsItem::setRotation()` on the parent rotates children automatically — pin positions in scene coordinates update via `mapToScene()`.

Wire endpoints must re-snap after rotation: in `rotate90()`, emit `pinMoved(pin, newScenePos)` signal → connected wires update their endpoints.

## Implementation steps

1. Add `m_rotation` field and `rotate90()` to `SchematicComponent`
2. Add `RotateComponentCmd : QUndoCommand` (stores old/new rotation, calls rotate90 on undo/redo)
3. In `SchematicScene::keyPressEvent`, on `Qt::Key_R`: for each selected `SchematicComponent`, push `RotateComponentCmd`
4. Update `serialize()`/`deserialize()` to save/restore `rotation`
5. Update integration test roundtrip: rotate component, serialize, deserialize, assert rotation == 90
6. Run `/ucp-test`

## After implementing

Mark `[ ] Component rotation` done in `wiki/roadmap.md` v1.1 section.
