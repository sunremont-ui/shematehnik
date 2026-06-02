# Soldering Iron Firmware (STM32F401CCU6)

Firmware паяльника на Black Pill STM32F401CCU6. Разбит на самостоятельные модули — каждый модуль имеет свой driver (HAL-уровень) и module (логика/API). Управление нагревателем — симистор с фазовым сдвигом. Меню на SSD1306 OLED с энкодером.

**Расположение:** `d:/shemaTehnik/soldering_iron/firmware/`

---

## Архитектура

```
firmware/
├── config/board_config.h        ← пины, параметры
├── core/
│   ├── event_bus.h/.c           ← pub/sub таблица коллбэков
│   └── app.h/.c                 ← главная логика + FSM меню
├── modules/
│   ├── display/                 ← DisplayModule
│   ├── encoder/                 ← EncoderModule
│   ├── temp_sensor/             ← TempSensorModule
│   ├── heater/                  ← HeaterModule
│   └── regulator/               ← RegulatorModule
└── main.c                       ← периферия, ISR handlers
```

---

## Модули

### DisplayModule

`modules/display/display_module.h/.c`

Хранит состояние экрана: текущая температура, целевая, мощность, режим редактирования. `display_module_update()` → очистить буфер → рендерить → флашить в дисплей.

**Driver — SSD1306** (`driver/ssd1306.h/.c`):
- I2C 400кГц, адрес 0x3C (0x78 в 8-бит)
- Фреймбуфер 1024 байта в ОЗУ, весь отправляется одной I2C транзакцией
- Встроенный шрифт 5×7 (ASCII 32–126), масштабирование ×1/×2/×3
- Примитивы: пиксель, горизонтальная линия, прямоугольник (контур/заливка)

**MenuRenderer** (`menu/menu_renderer.h/.c`) — два экрана:

| Экран | Содержимое |
|-------|------------|
| `DISPLAY_SCREEN_MAIN` | Текущая температура scale×2, целевая scale×2 с рамкой при редактировании, полоска мощности внизу |
| `DISPLAY_SCREEN_SETTING` | Целевая температура по центру scale×3, подтверждение кнопкой |

---

### EncoderModule

`modules/encoder/encoder_module.h/.c`

**Driver** (`driver/encoder_driver.h/.c`):
- TIM2 в режиме encoder mode, PA0=CH1 / PA1=CH2 / AF1
- Счётчик читается каждые 5мс, дельта делится на 4 (TIM2 4x mode = 4 тика на щелчок)
- Кнопка PA2 — EXTI2 falling, pull-up, флаг выставляется в ISR и сбрасывается при чтении

```c
int8_t encoder_module_get_delta(EncoderModule_t *m);   // дельта с последнего poll
uint8_t encoder_module_get_button(EncoderModule_t *m); // 1 = нажата, сбрасывает флаг
```

---

### TempSensorModule

`modules/temp_sensor/temp_module.h/.c`

**Driver — ADC** (`driver/adc_driver.h/.c`):
- ADC1, канал IN3, PA3 (аналог)
- Программный oversampling ×8: накапливает 8 измерений, усредняет → подавляет шум

**NTC таблица** (`ntc_table/ntc_table.h/.c`):
- NTC 10кОм, B=3950K, делитель с R_pull=10кОм к 3.3В
- 43 точки от −10°C до +200°C с шагом 5°C, рассчитаны по формуле Стейнхарта–Харта
- Между точками — линейная интерполяция

```c
int16_t ntc_adc_to_celsius(uint16_t adc); // 12-бит ADC → °C
```

---

### HeaterModule

`modules/heater/heater_module.h/.c`

Фазовое управление симистором BTA16 через оптопару MOC3021.

**Driver** (`driver/heater_driver.h/.c`):

| Пин | Назначение |
|-----|------------|
| PB0 | Zero-cross детектор, EXTI0 falling |
| PA8 | Управление симистором, GPIO output |
| TIM3 | One-shot таймер задержки, тик 1мкс (PSC=83 при PCLK1×2=84МГц) |

**Алгоритм фазового управления:**
1. Zero-cross ISR: перезапустить TIM3 с периодом `phase_delay_us`
2. TIM3 ISR: подать импульс 100мкс на PA8 (через DWT busy-wait), затем сбросить

**Перевод мощности в задержку:**
```
power 0%   → delay = 9500мкс  (симистор не открывается за полпериод 10мс)
power 100% → delay =  500мкс  (открывается почти сразу после нуля)
```

```c
void heater_module_set_power(HeaterModule_t *m, uint8_t power_pct); // 0..100
void heater_module_zero_cross_irq(HeaterModule_t *m); // из HAL_GPIO_EXTI_Callback
void heater_module_tim_irq(HeaterModule_t *m);         // из HAL_TIM_PeriodElapsedCallback
```

---

### RegulatorModule

`modules/regulator/regulator_module.h/.c`

Пропорциональный регулятор:

```
power = Kp × error      Kp = 3 %/°C
```

| Параметр | Значение |
|----------|----------|
| Kp | 3 %/°C |
| Deadband | ±1°C — не изменять мощность |
| Clamp | 0..100% |
| Диапазон target | 20..150°C |

При ошибке 10°C → 30% мощности. При ошибке 33°C → 100%.

---

## Core

### EventBus

`core/event_bus.h/.c`

Статическая таблица подписчиков, 5 событий, до 16 подписчиков на каждое.

```c
typedef enum {
    EVT_TEMP_UPDATED, EVT_TARGET_CHANGED,
    EVT_ENCODER_DELTA, EVT_BUTTON_PRESS, EVT_POWER_UPDATED
} EventId;

void eb_subscribe(EventId id, EbCallback cb, void *ctx);
void eb_publish(EventId id, const void *data);
```

### App (главная логика)

`core/app.h/.c` — тикает из SysTick каждые 1мс:

| Интервал | Действие |
|----------|----------|
| 5мс | Опрос энкодера + FSM меню |
| 100мс | ADC → температура → регулятор → мощность нагревателя + обновление дисплея |

**FSM меню:**
```
IDLE ──[кнопка]──→ EDITING (рамка вокруг числа, энкодер меняет target ±1°C)
EDITING ──[кнопка]──→ IDLE (подтвердить → передать в регулятор)
```

---

## Назначение пинов (board_config.h)

| Пин | Функция | Интерфейс |
|-----|---------|-----------|
| PB6 | SCL (SSD1306) | I2C1 AF4 |
| PB7 | SDA (SSD1306) | I2C1 AF4 |
| PA0 | Энкодер CLK | TIM2 CH1 AF1 |
| PA1 | Энкодер DT | TIM2 CH2 AF1 |
| PA2 | Кнопка SW | EXTI2 falling |
| PA3 | NTC 10k | ADC1 IN3 |
| PA8 | Симистор | GPIO output |
| PB0 | Zero-cross | EXTI0 falling |

---

## Сборка

Требует `arm-none-eabi-gcc` и STM32CubeF4 Drivers/:

```bash
cmake -B build -DHAL_DIR=/path/to/STM32CubeF4/Drivers \
      -DCMAKE_TOOLCHAIN_FILE=cmake/arm-none-eabi.cmake
cmake --build build
```

Выходные файлы: `soldering_iron.elf`, `soldering_iron.bin`, `soldering_iron.map`.

---

## Связанные страницы

- [[concepts/hal]] — HAL abstraction, пины и GPIO
- [[concepts/pid]] — PID/P-регуляторы, принципы управления
- [[modules/codegen]] — генерация кода для embedded (Arduino, ESP-IDF)
