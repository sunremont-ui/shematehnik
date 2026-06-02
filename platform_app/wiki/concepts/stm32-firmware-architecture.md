---
type: concept
created: 2026-05-17
updated: 2026-05-17
related: [concepts/hal.md, modules/soldering_iron_firmware.md, concepts/pid.md]
---

# STM32 Firmware — Модульная архитектура устройств

Шаблон проектирования firmware для embedded-устройств на STM32 (проверен на F401CCU6). Применять для любого нового устройства с дисплеем, датчиком, исполнительным элементом.

---

## Принцип: каждый модуль = полный стек

```
modules/<имя>/
├── driver/         ← HAL-уровень: периферия, регистры, прерывания
│   ├── <name>_driver.h
│   └── <name>_driver.c
├── <name>_module.h ← публичный API модуля (не зависит от HAL)
└── <name>_module.c ← логика, использует driver внутри
```

**Driver** знает про STM32 HAL. **Module** знает только про свои данные и API соседних модулей. Это позволяет тестировать и переиспользовать module без железа.

---

## Стандартная структура проекта

```
firmware/
├── config/
│   └── board_config.h       ← ВСЕ пины, частоты, параметры — в одном месте
├── core/
│   ├── event_bus.h/.c       ← pub/sub без RTOS и Qt
│   └── app.h/.c             ← главный цикл, FSM, связка модулей
├── modules/
│   ├── display/             ← вывод информации
│   ├── input/               ← ввод (энкодер, кнопки, touch)
│   ├── sensor/              ← измерение (ADC, I2C-сенсор, UART-сенсор)
│   ├── actuator/            ← управление (ШИМ, реле, симистор, мотор)
│   └── regulator/           ← алгоритм управления (P/PI/PID/bang-bang)
├── startup/
│   ├── startup_stm32f4xx.s  ← из CubeMX/STM32CubeF4
│   └── STM32F4xx_FLASH.ld   ← из CubeMX/STM32CubeF4
├── main.c                   ← инициализация периферии, ISR handlers
├── CMakeLists.txt
└── DEVLOG.md                ← хронология разработки (обязательно вести)
```

---

## EventBus (C-версия для embedded)

```c
// event_bus.h
typedef void (*EbCallback)(void *ctx, const void *data);
void eb_subscribe(EventId id, EbCallback cb, void *ctx);
void eb_publish(EventId id, const void *data);
```

- Статическая таблица, нет malloc
- Добавить новое событие: +1 строка в enum `EventId`
- До 16 подписчиков на событие (константа `EB_MAX_SUBSCRIBERS`)

---

## App tick — главная логика

```c
// Вызывается из HAL_SYSTICK_Callback каждые 1мс
void app_tick_1ms(void) {
    tick_input++;
    tick_sensor++;
    tick_display++;

    if (tick_input >= INPUT_POLL_MS) {      // 5мс
        tick_input = 0;
        input_module_poll(&s_input);
        // FSM реакция на ввод
    }
    if (tick_sensor >= SENSOR_POLL_MS) {    // 100мс
        tick_sensor = 0;
        sensor_module_poll(&s_sensor);
        regulator_module_update(&s_reg, sensor_module_get(&s_sensor));
        actuator_module_set_power(&s_act, regulator_module_get_power(&s_reg));
    }
    if (tick_display >= DISPLAY_MS) {       // 100мс
        tick_display = 0;
        display_module_update(&s_display);
    }
}
```

---

## FSM меню (шаблон)

```
IDLE ──[кнопка]──→ EDITING
  ↑                  │ энкодер меняет параметр
  └──[кнопка]────────┘ подтвердить → записать в регулятор
```

Расширяется добавлением состояний: `MENU_SELECT`, `STANDBY`, `ERROR`.

---

## Типовые модули и их периферия (STM32F4)

### DisplayModule — SSD1306 OLED 128×64

| Параметр | Значение |
|----------|----------|
| Интерфейс | I2C1, 400кГц, PB6=SCL / PB7=SDA |
| Адрес | 0x3C (0x78 в 8-бит) |
| Фреймбуфер | 1024 байта ОЗУ, одна транзакция на flush |
| Шрифт | 5×7, масштаб ×1/2/3 |
| Обновление | 100мс (не чаще — I2C занимает ~1.4мс) |

### EncoderModule — KY-040

| Параметр | Значение |
|----------|----------|
| Интерфейс | TIM2 encoder mode, PA0=CH1 / PA1=CH2 / AF1 |
| Тик на щелчок | 4 (TIM2 4x mode) → делить delta на 4 |
| Кнопка | PA2, EXTI falling, pull-up |
| Poll | 5мс |
| Debounce | 3 подряд LOW = подтверждение (15мс) |

### TempSensorModule — NTC 10кОм

| Параметр | Значение |
|----------|----------|
| Интерфейс | ADC1, IN3, PA3 |
| Схема | 3.3В → R_pull(10k) → PA3 → NTC(10k) → GND |
| Oversampling | ×8 программный (100мс цикл = 8 замеров) |
| Фильтр | EMA α=0.2 (Q8: 51/256) |
| Таблица | 43 точки −10..+200°C, интерполяция |

### HeaterModule — Симистор (фазовый сдвиг)

| Параметр | Значение |
|----------|----------|
| Симистор | BTA16 через MOC3021 |
| Zero-cross | PB0, EXTI0 falling |
| Управление | PA8, GPIO output |
| TIM3 | Phase delay 1мкс тик (PSC=83 при PCLK1=84МГц) |
| TIM4 | Pulse timer 100мкс (убирает DWT busy-wait из ISR) |
| Диапазон | 500..9500мкс (50Гц, полупериод 10мс) |
| Коррекция | Таблица sin² для линеаризации мощности |

**Двухступенчатый ISR (обязательно):**
```
zero_cross ISR → TIM3 start(phase_delay)
TIM3 ISR       → PA8=HIGH + TIM4 start(100мкс)
TIM4 ISR       → PA8=LOW
```
Не использовать DWT busy-wait — блокирует все прерывания.

### RegulatorModule — алгоритм управления

| Тип | Когда применять |
|-----|----------------|
| P (Kp × error) | Медленный процесс, нет интегральной ошибки (нагрев, свет) |
| PI | Нужен нулевой установившийся error (давление, скорость) |
| PID | Быстрый процесс с инерцией (мотор, инвертор) |
| Bang-bang | Гистерезисное управление (термостат, помпа) |

**Для паяльника (≤150°C, NTC):** P-регулятор Kp=3%/°C, deadband ±1°C.

---

## Flash Storage (сохранение параметров)

STM32F401: последний сектор = сектор 7, адрес `0x08060000`, размер 128кБ.

```c
#define FLASH_SECTOR      FLASH_SECTOR_7
#define FLASH_ADDR        0x08060000UL
#define FLASH_MAGIC       0xDEADBEEF

typedef struct {
    uint32_t magic;
    int16_t  target_temp;
    uint16_t crc16;        // опционально
} FlashData_t;
```

Запись: `HAL_FLASH_Unlock → HAL_FLASHEx_Erase → HAL_FLASH_Program → HAL_FLASH_Lock`.  
Чтение: проверить magic, если не совпадает — использовать defaults.

---

## Standby-режим (шаблон)

```c
#define STANDBY_TIMEOUT_MS  600000   // 10 минут

static uint32_t s_idle_ms = 0;

// в app_tick_1ms при poll энкодера:
if (delta != 0 || btn) s_idle_ms = 0;
else s_idle_ms += ENCODER_POLL_MS;

if (s_idle_ms >= STANDBY_TIMEOUT_MS && state != STANDBY) {
    actuator_stop();
    display_set_screen(SCREEN_STANDBY);
    state = STANDBY;
}
```

---

## CMakeLists.txt шаблон (STM32F4, arm-none-eabi)

```cmake
cmake_minimum_required(VERSION 3.20)
project(<name> C ASM)

set(MCU_FLAGS -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${MCU_FLAGS} -Wall -Os -ffunction-sections -fdata-sections")
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${MCU_FLAGS} -Wl,--gc-sections -specs=nano.specs -specs=nosys.specs")

set(HAL_DIR "" CACHE PATH "Path to STM32CubeF4/Drivers")

# Добавить HAL-источники + APP_SOURCES
add_executable(${PROJECT_NAME}.elf ${APP_SOURCES} ${HAL_SOURCES})
target_compile_definitions(${PROJECT_NAME}.elf PRIVATE STM32F401xC USE_HAL_DRIVER)
set_target_properties(${PROJECT_NAME}.elf PROPERTIES
    LINK_FLAGS "-T${CMAKE_SOURCE_DIR}/startup/STM32F401CCUx_FLASH.ld")

add_custom_command(TARGET ${PROJECT_NAME}.elf POST_BUILD
    COMMAND arm-none-eabi-objcopy -O binary ${PROJECT_NAME}.elf ${PROJECT_NAME}.bin
    COMMAND arm-none-eabi-size ${PROJECT_NAME}.elf)
```

---

## Чеклист для нового устройства

- [ ] Заполнить `config/board_config.h` — все пины, частоты, параметры
- [ ] Создать `DEVLOG.md` — зафиксировать задачу и принятые решения
- [ ] Для каждого модуля: сначала `driver/`, потом `_module.h/.c`
- [ ] `app.c`: тики и FSM — не смешивать логику с драйверами
- [ ] Проверить: нет блокирующих delay в ISR (кроме <1мкс)
- [ ] Flash storage: magic word + defaults при первом запуске
- [ ] Standby: таймер бездействия для любого устройства с нагревом
- [ ] Добавить startup-файлы из CubeMX до первой сборки
- [ ] Внести устройство в `platform_app/wiki/index.md`

---

## Связанные страницы

- [[concepts/hal]] — HAL abstraction, GPIO, пины
- [[concepts/pid]] — PID/P-регуляторы
- [[modules/soldering_iron_firmware]] — первый реализованный пример
- [[modules/codegen]] — генерация кода через UCP
