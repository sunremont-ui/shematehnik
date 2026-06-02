# Proteus Integration & Replacement

## What Proteus does well

- **MCU simulation with firmware**: загрузить .hex в виртуальный PIC/AVR/ARM и симулировать вместе с периферией
- **Virtual instruments**: осциллограф, логический анализатор
- **Mixed-signal**: SPICE + цифровые МК одновременно

## Where UCP replaces Proteus

| Proteus | UCP | Status |
|---------|-----|--------|
| ISIS (schematic) | SchematicModule | v0.2 |
| SPICE simulation | SPICESimulator (ngspice) | v0.3 |
| ARES (PCB) | PCBLayoutModule | v0.4 |
| Virtual scope | QCustomPlot graphs | v0.3 |

## Where Proteus still wins — MCU simulation

Единственная вещь, которую UCP (пока) не делает и которую Proteus делает уникально — **симуляция МК с реальной прошивкой**.

У UCP есть три пути решения:

### Path 1: Wokwi integration (рекомендован)

Запускать Wokwi (avr8js/rp2040js) внутри QWebEngine:

```cpp
class MCUSimulator : public Module {
    QWebEngineView *m_view;
    void loadFirmware(const QByteArray &hex) {
        m_view->page()->runJavaScript(
            QString("loadHex('%1')").arg(QString(hex.toHex()))
        );
    }
};
```

Плюсы: бесплатно, работает, поддерживает ESP32/AVR/RP2040
Минусы: нужен QWebEngine (тяжёлый)

### Path 2: avr8js port to C++

avr8js написан на TypeScript. Можно портировать ключевые части на C++ или запускать через QuickJS/duktape.

### Path 3: QEMU integration

Запускать QEMU как подпроцесс для симуляции ESP32/STM32. PICSimLab уже делает это.

## Verdict

- **Схемы, PCB, 3D, PID, протоколы** — UCP полностью заменяет
- **MCU simulation** — UCP дополняет Wokwi/QEMU, но не заменяет Proteus 1:1
- На первых порах: UCP для проектирования → Proteus/Wokwi для отладки прошивки
