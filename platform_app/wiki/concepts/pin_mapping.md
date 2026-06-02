---
type: concept
created: 2026-05-16
related: [concepts/hal.md, modules/program_system.md]
---

# Pin Mapping UI

## Purpose

Экран, где пользователь назначает физические пины ESP32 под логические сигналы, которые требует выбранная программа.

## UI Layout

```
┌─────────────────────────────────────────┐
│  Pin Mapping — Greenhouse               │
│                                         │
│  Signal             GPIO   Type         │
│  ─────────────────────────────────────  │
│  Motor Pump PWM  → [GPIO5  ▾]  PWM     │
│  Motor Pump IN1  → [GPIO18 ▾]  GPIO    │
│  Motor Pump IN2  → [GPIO19 ▾]  GPIO    │
│  Fan PWM         → [GPIO4  ▾]  PWM     │
│  Heater Relay    → [GPIO21 ▾]  GPIO    │
│  Temp DS18B20    → [GPIO4  ▾]  OneWire │
│                                         │
│  [Auto-Assign] [Save & Start] [Cancel]  │
└─────────────────────────────────────────┘
```

## Validation

При сохранении проверяется:
- Нет конфликтов (один пин на двух сигналах)
- Пин поддерживает тип сигнала (PWM только на GPIO с ШИМ-каналом)
- Пин не занят системой (JTAG, PSRAM)

## Auto-Assign

Алгоритм:
1. Собрать список свободных пинов
2. Для каждого сигнала найти подходящий свободный пин
3. PWM-сигналы → пины с LEDC-каналами
4. ADC → пины с ADC1
5. GPIO → любой свободный
