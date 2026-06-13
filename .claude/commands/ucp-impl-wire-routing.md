# UCP Implement: Orthogonal Wire Routing

Replace current direct-line wire with manhattan routing: horizontal + vertical segments with obstacle avoidance.

## Target files

- `platform_app/modules/schematic/schematic_scene.h/.cpp` — wire routing logic
- `platform_app/modules/schematic/schematic_wire.h/.cpp` — polyline wire item

## Design

Current: `SchematicWire` is a `QGraphicsLineItem` from pin A to pin B.

New: `SchematicWire` becomes a `QGraphicsPathItem` with a QPainterPath built from bend points.

```
routeManhattan(QPointF from, QPointF to) → QList<QPointF> bends
  1. Try direct L-shape: (from → mid-x → to)
  2. If mid-x collides with component bounding box: route around (3-segment Z-shape)
  3. Return bend points; wire draws as polyline
```

Collision check: iterate `scene()->items()` for `SchematicComponent`, check `boundingRect()`.

## Implementation steps

1. Change `SchematicWire` base from `QGraphicsLineItem` → `QGraphicsPathItem`
2. Add `static QList<QPointF> routeManhattan(QPointF from, QPointF to, QGraphicsScene*)` to `SchematicScene`
3. Update `addWire()` to call `routeManhattan` and set the path
4. Update `serialize()`/`deserialize()` — only store endpoints, reroute on load
5. Rebuild integration test `schematic_wire_roundtrip` — endpoints must match after reload
6. Run `/ucp-test`

## After implementing

Mark `[ ] Wire routing` done in `wiki/roadmap.md` v1.1 section.
