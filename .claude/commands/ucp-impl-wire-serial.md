# UCP Implement: Wire Serialization

> **STATUS: ✓ DONE** — Implemented 2026-05-17. `schematic_wire_roundtrip` test passes. All 3 suites pass.

Implement save/load of schematic wires in `SchematicScene`.

## Current state (the bug)

`platform_app/modules/schematic/schematic_module.cpp` — `serialize()` emits empty `{}` for every wire.
`deserialize()` only restores components; wires are silently lost.

## Key types

- `SchematicWire` (schematic_module.h ~line 99): has `pin1()`, `pin2()` → `SchematicPin*`
- `SchematicPin` (schematic_module.h ~line 25): has `comp()` → `SchematicComponent*`, `name()` → QString
- `SchematicComponent`: has `refdes()` → QString

## Implementation plan

### 1. `SchematicScene::serialize()` — wire encoding
Replace the `{}` stub with:
```json
{"from": {"refdes": "R1", "pin": "2"}, "to": {"refdes": "R2", "pin": "1"}}
```
Get refdes via `wire->pin1()->comp()->refdes()` and pin name via `wire->pin1()->name()`.

### 2. `SchematicScene::deserialize()` — wire restoration
After restoring all components, build a lookup map:
```cpp
QHash<QString, SchematicComponent*> byRefdes;
for (auto *item : items())
    if (auto *c = dynamic_cast<SchematicComponent*>(item))
        byRefdes[c->refdes()] = c;
```
Then for each wire JSON:
```cpp
auto *fromComp = byRefdes.value(w["from"]["refdes"]);
auto *toComp   = byRefdes.value(w["to"]["refdes"]);
if (fromComp && toComp) {
    auto *p1 = fromComp->pin(w["from"]["pin"]);
    auto *p2 = toComp->pin(w["to"]["pin"]);
    if (p1 && p2) {
        auto *wire = new SchematicWire(p1, p2);
        addItem(wire);
    }
}
```
Do NOT push to undo stack here (deserialization is not undoable).

### 3. Add integration test in `tests/test_integration.cpp`
```
void schematic_wire_roundtrip();
```
- Create R1 + R2, add wire R1.pin2 → R2.pin1
- Serialize → new scene → deserialize
- Verify: exactly 1 wire in scene, wire connects correct pins

## Acceptance criteria
- `schematic_wire_roundtrip` test passes
- All existing 3 test suites still pass (`/ucp-test`)
- Wire undo stack is NOT polluted by deserialization

## After implementing
Mark `[ ] Wire serialization` done in `wiki/roadmap.md` v1.0 section.
