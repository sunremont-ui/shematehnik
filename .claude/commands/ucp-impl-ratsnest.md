# UCP Implement: PCB Ratsnest

Draw thin dashed airwire lines between unrouted pad pairs of the same net in PcbScene.

## Current state

- `platform_app/modules/pcb/pcb_module.h` / `pcb_module.cpp`
- `PcbPad` has `netId()` / `setNetId(int)` (line ~83 of header)
- `PcbScene::importFromNetlist()` places footprints but does **not** assign netIds to pads
- No ratsnest exists

## Read these files first
- `platform_app/modules/pcb/pcb_module.h`
- `platform_app/modules/pcb/pcb_module.cpp` — `importFromNetlist()` and `runDrc()`

## Implementation plan

### 1. Parse netlist and assign netIds to pads in `importFromNetlist()`

SPICE netlist line format: `R1 N001 N002 1k`  (refdes, net1, net2, ..., value)

For each component line:
- Map each net name → integer netId (build a `QHash<QString,int> netMap`)
- Find the placed footprint by refdes
- Assign netIds to pads in order: `pad[0].setNetId(netMap[net1])`, `pad[1].setNetId(netMap[net2])`

### 2. `RatsnestLayer` — private helper in `PcbScene`

After assigning netIds, call `updateRatsnest()`:
```cpp
void PcbScene::updateRatsnest() {
    // Remove old ratsnest items (tagged with QGraphicsItem::data(42) = true)
    for (auto *item : items())
        if (item->data(42).toBool()) { removeItem(item); delete item; }

    // Group pads by netId
    QHash<int, QVector<PcbPad*>> netPads;
    for (auto *item : items())
        if (auto *pad = dynamic_cast<PcbPad*>(item))
            if (pad->netId() >= 0)
                netPads[pad->netId()].append(pad);

    // For each net: nearest-neighbour spanning tree lines
    QPen rn(QColor(0xffff00), 0.5, Qt::DashLine);
    for (auto it = netPads.begin(); it != netPads.end(); ++it) {
        auto &pads = it.value();
        for (int i = 1; i < pads.size(); i++) {
            QPointF a = pads[i-1]->mapToScene(pads[i-1]->rect().center());
            QPointF b = pads[i  ]->mapToScene(pads[i  ]->rect().center());
            auto *line = new QGraphicsLineItem(QLineF(a, b));
            line->setPen(rn);
            line->setZValue(-5);
            line->setData(42, true);
            addItem(line);
        }
    }
}
```

### 3. Call `updateRatsnest()` after `importFromNetlist()` completes

### 4. Hide ratsnest when trace routes two pads of same net (future enhancement — skip for now)

### 5. Add DRC test

Add `pcb_ratsnest_updates` integration test:
- Create scene, import a 2-component netlist
- Verify at least 1 ratsnest line exists after import
- Verify items tagged with data(42) are present

## Acceptance criteria
- After "Import from Schematic" in PcbModule, yellow dashed ratsnest lines appear
- Ratsnest lines are removed and recreated on next import
- Test passes
- All 3 test suites pass (`/ucp-test`)

## After implementing
Mark `[ ] Ratsnest` done in `wiki/roadmap.md` v1.2 section.
