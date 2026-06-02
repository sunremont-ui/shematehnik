# Schematic Editor Module

## Purpose

Визуальный редактор принципиальных электрических схем. Аналог Eeschema из KiCad.

## Module Tree

```
SchematicModule
 ├── SymbolEditor     ← рисование/редактирование символов компонентов
 ├── WireTool         ← соединение пинов проводниками
 ├── NetlistGenerator ← схема → SPICE-совместимый netlist
 └── SPICESimulator   ← запуск ngspice, отображение графиков
```

## Sub-modules

### SymbolEditor

- Рисование символов: линии, дуги, текст, пины
- Библиотека готовых символов (R, C, L, D, Q, U...)
- Сохранение в JSON-формате
- Pin-нумерация и привязка к footprin't'ам

### WireTool

- Рисование проводников между пинами
- Автоматическая трассировка (алгоритм maze router)
- Подсветка цепей (net highlighting)
- Метки цепей (net labels)
- ERC (Electrical Rule Check): неподключенные пины, короткие замыкания

### NetlistGenerator

Full DFS-based net tracing. Algorithm:

1. Collect all SchematicWires from scene
2. Build adjacency graph: pins are nodes, wires are edges
3. DFS to find connected components → assign net numbers (N001, N002...)
4. For each component, output SPICE line with mapped net numbers

```
* UCP Schematic Netlist
* Generated: 4 components, 3 nets
.GLOBAL 0
V1 N001 N002 5
R1 N002 N003 1k
D1 N003 N001 1N4148
.tran 1m 100m
.end
```

Supported component types: resistor, capacitor, diode, NPN/PNP BJT, voltage source, ground.

### SPICESimulator

- Запуск ngspice как subprocess: `ngspice -b netlist.cir`
- Парсинг SPICE3 raw format (raw-файл → QVector<SpicePoint>)
- WaveformWidget: QPainter-отрисовка波形 с сеткой, легендой, курсором
- Мультисигнальные графики (до 9 сигналов с разными цветами)
- Лог вывода ngspice в QTextEdit

## Data Flow

```
SymbolEditor ──→ Библиотека символов (JSON)
       │
WireTool ──→ Схема на QGraphicsScene
       │
       ▼
NetlistGenerator ──→ SPICE netlist (текст)
       │
       ▼
SPICESimulator ──→ ngspice ──→ CSV результатов
       │
       ▼
Virtual Scope ──→ QCustomPlot графики
```

## Сериализация проводников

Проводники сохраняются по ссылке `{refdes, pin}`, не по координатам:

```json
{
  "wires": [
    {"from": {"refdes": "R1", "pin": "2"}, "to": {"refdes": "C1", "pin": "+"}}
  ]
}
```

При десериализации: сначала восстанавливаются все компоненты в `QHash<refdes→comp>`, затем каждый провод ищет компоненты по refdes и пины по имени. Восстановленные провода НЕ помещаются в undo-стек.

## Счётчики refdes

`QHash<QString,int> m_counters` — отдельный счётчик на префикс (R, C, D, Q, U, V). Сохраняется как `{"counters": {"R":2,"C":1}}`. При итерации используется локальная копия (`const QJsonObject local = obj["counters"].toObject()`) — итераторы по временному объекту дают dangling pointer.

## Dependencies

- Qt6::Widgets (QGraphicsScene/View)
- ngspice (libngspice.so/.dll)
- QCustomPlot (графики)
