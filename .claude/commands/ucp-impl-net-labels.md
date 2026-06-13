# UCP Implement: Schematic Net Labels

Add named power/signal rails (VCC, GND, SDA, etc.) that logically connect pins without a physical wire.

## Current state

- `platform_app/modules/schematic/schematic_module.h` / `schematic_module.cpp`
- `SchematicScene` has components + wires only
- `NetlistModule::generateNetlist()` uses DFS union-find over `SchematicWire` connections only

## Read these files first
- `platform_app/modules/schematic/schematic_module.h` (full file)
- `platform_app/modules/schematic/schematic_module.cpp` — `generateNetlist()` at end of file

## Implementation plan

### 1. `SchematicNetLabel` class (add to schematic_module.h)

```cpp
class SchematicNetLabel : public QGraphicsItem {
public:
    enum { Type = QGraphicsItem::UserType + 10 };
    int type() const override { return Type; }

    SchematicNetLabel(const QString &netName, QGraphicsItem *parent = nullptr);
    QRectF  boundingRect() const override;
    void    paint(QPainter *, const QStyleOptionGraphicsItem *, QWidget *) override;

    QString netName() const { return m_netName; }
    void    setNetName(const QString &n) { m_netName = n; update(); }

    SchematicPin *attachedPin() const { return m_pin; }
    void attachToPin(SchematicPin *pin);

    QJsonObject serialize() const;
    static SchematicNetLabel *deserialize(const QJsonObject &obj);

private:
    QString       m_netName;
    SchematicPin *m_pin = nullptr;
};
```

Visual: short horizontal stub line (16px) + flag-shaped box with net name text.
Color: bright cyan `0x56d3e8` for power nets (VCC/GND), white for signal nets.

### 2. `SchematicScene::addNetLabel(name, pos)`

```cpp
SchematicNetLabel *SchematicScene::addNetLabel(const QString &name, QPointF pos);
```
- Places label at `pos`
- On mouse click near a pin, calls `label->attachToPin(pin)`
- Push undo command `AddNetLabelCmd` (same pattern as `AddComponentCmd`)

### 3. Toolbar button in `SchematicModule::widget()`

Add "Net Label" button to the toolbar. On click:
```cpp
QInputDialog::getText(…, "Net Name:", …) → addNetLabel(name, center)
```

### 4. Update `serialize()` / `deserialize()`

In `SchematicScene::serialize()`, add:
```cpp
QJsonArray labels;
for (auto *item : items())
    if (auto *lbl = dynamic_cast<SchematicNetLabel*>(item))
        labels.append(lbl->serialize());
obj["net_labels"] = labels;
```

In `deserialize()`, restore labels after components, then attach to pins by position proximity.

### 5. Update `NetlistModule::generateNetlist()` union-find

After DFS over wires, also merge pins that share the same net label name:
- Build a map `QHash<QString, QVector<SchematicPin*>> labelPins`
- For each label with an attached pin: merge all pins with the same net name into one net id
- Append these to the existing net table

### 6. Add integration test
`schematic_net_label_netlist`: place R1 + GND label both on the "−" net → verify netlist groups them.

## Acceptance criteria
- Net labels appear visually on schematic
- Two pins connected by the same label name produce the same net number in the netlist
- serialize/deserialize roundtrip preserves labels
- Tests pass

## After implementing
Mark `[ ] Net labels` done in `wiki/roadmap.md` v1.1 section.
