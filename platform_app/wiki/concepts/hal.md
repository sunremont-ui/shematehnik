---
type: concept
created: 2026-05-16
related: [concepts/pin_mapping.md, modules/program_system.md]
---

# HAL — Hardware Abstraction Layer

## Problem

Программа (теплица, вентилятор, стиралка) не должна знать, на каком физическом пине висит датчик. Пользователь должен иметь возможность переназначить пины под свою распайку без изменения кода.

## Solution — Signal↔GPIO table

Каждому логическому сигналу (Motor_1_PWM, Sensor_Temp, Relay_1) сопоставлен физический GPIO:

```c
typedef struct {
    hal_signal_t signal;    // HAL_SIGNAL_MOTOR_1_PWM
    char         name[24];  // "Motor 1 PWM"
    uint8_t      gpio;      // 5
    hal_dir_t    dir;       // HAL_DIR_OUTPUT
    hal_type_t   type;      // HAL_TYPE_PWM
    bool         inverted;  // false
} hal_pin_cfg_t;
```

## API

```cpp
// В программе:
uint8_t pin = hal_get_gpio(HAL_SIGNAL_MOTOR_1_PWM);
ledc_channel_config(..., pin, ...);

// В UI:
hal_set_pin(HAL_SIGNAL_MOTOR_1_PWM, 18);  // переназначили
hal_save_config();                         // сохранили в NVS
```

## Persistence

Таблица хранится в NVS (ESP32) или JSON-файле (десктоп). При загрузке — `hal_load_config()` читает сохранённую таблицу. Если нет — используются умолчания.

## Signals (30+)

Motor_1_PWM, Motor_1_IN1/IN2, Motor_2_PWM, Servo_1, Stepper_STEP/DIR, Sensor_Temp, Sensor_Humidity, Sensor_Soil, Sensor_Distance_TRIG/ECHO, Relay_1/2/3, I2C_SCL/SDA, UART_TX/RX, LED_WS2812, ADC_1/2...
