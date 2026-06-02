# SPICE Simulator Module

## Purpose

Запуск ngspice-симуляции по нетлисту из SchematicModule, парсинг результатов и отображение графиков.

## Module Tree

```
SchematicModule
└── SPICEModule   ← симулятор (отдельный модуль, дочерний к SchematicModule)
```

Зарегистрированный тип: `SPICEModule`  
Файлы: `modules/schematic/spice_module.h`, `spice_module.cpp`

## Data Flow

```
SchematicModule
    │  (emitEvent "netlist.ready", QVariant = SPICE-строка)
    ▼
SPICEModule.onNetlistReady()
    │
    ├─ write → temp .cir file
    ├─ start QProcess: ngspice -b circuit.cir
    │         stdout → парсинг SPICE3 raw формата
    ▼
WaveformWidget (QPainter граф)
```

## SPICE Netlist Format

Нетлист генерируется `NetlistModule` в формате SPICE3:

```spice
* UCP Schematic Netlist
* Generated: 4 components, 3 nets
.GLOBAL 0
V1 N001 0 DC 5
R1 N001 N002 1k
C1 N002 0 100n
.tran 1u 10m
.end
```

## Supported Component Types

| Компонент | SPICE-строка |
|-----------|-------------|
| Резистор R | `R1 N001 N002 1k` |
| Конденсатор C | `C1 N002 0 100n` |
| Катушка L | `L1 N001 N002 1m` |
| Диод D | `D1 N003 N001 1N4148` |
| NPN BJT | `Q1 Nc Nb Ne BC547` |
| Источник напряжения | `V1 N001 0 DC 5` / `AC 1` |
| Источник тока | `I1 0 N001 1m` |
| GND | net-узел 0 |

## ngspice Integration

`SPICEModule` запускает ngspice как QProcess:

```cpp
QProcess ngspice;
ngspice.start("ngspice", {"-b", "-r", rawFile, netlistFile});
```

> **Требование:** ngspice должен быть в PATH. Установка на Windows: `pacman -S mingw-w64-x86_64-ngspice` (MSYS2).

Если ngspice не найден, кнопка **Run** показывает предупреждение; модуль продолжает работать без симуляции.

## Raw File Parser

SPICE3 `.raw` формат парсится построчно:

```
Title: transient analysis
Date: ...
Plotname: Transient Analysis
Flags: real
No. Variables: 3
No. Points: 1000
Variables:
    0 time     time
    1 V(n002)  voltage
    2 I(V1)    current
Values:
    0  0.000e+00  0.000e+00  -5.000e-03
    ...
```

Результат: `QVector<QVector<double>>` (столбцы по переменным).

## WaveformWidget

`WaveformWidget` — QPainter-график:

| Характеристика | Значение |
|---------------|---------|
| Оси | X = время, Y = значение (автомасштаб) |
| Сигналы | До 9, цвета по индексу |
| Курсор | ЛКМ → вертикальная линия + координаты |
| Сетка | Адаптивная (1/2/5 × 10^n) |
| Легенда | Имена переменных + цвет |

## Usage

1. В SchematicModule нарисуйте схему и подключите все пины
2. Откройте **Tools → Generate Netlist** — нетлист появится в NetlistModule
3. Переключитесь во вкладку **SPICE Simulator**
4. Нажмите **Run Simulation**
5. Результаты появятся в WaveformWidget

### Типичные SPICE-директивы

| Директива | Описание |
|-----------|---------|
| `.tran 1u 10m` | Transient: шаг 1 мкс, до 10 мс |
| `.ac dec 100 1 1Meg` | AC sweep: 100 точек/декада, 1 Гц — 1 МГц |
| `.dc V1 0 5 0.1` | DC sweep: V1 от 0 до 5 В, шаг 0.1 В |
| `.op` | Рабочая точка |

Вставьте директиву как текстовый компонент на схему или в поле редактора.

## Dependencies

- Qt6::Widgets
- Qt6::Core (QProcess для запуска ngspice)
- ngspice (внешняя программа, опционально)
