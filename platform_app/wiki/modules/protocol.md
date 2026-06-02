# Protocol Designer Module

## Purpose

Набор инструментов для проектирования и отладки коммуникационных протоколов: редактор sequence-диаграмм, редактор пакетов, UART-монитор и декодер протоколов.

## Module Tree

```
ProtocolModule
├── SequenceDiagramModule   ← текстовый DSL → визуальная диаграмма
├── PacketEditorModule      ← битовые поля пакета + C-структура
├── UartMonitorModule       ← отладочный терминал (Qt6::SerialPort)
└── ProtocolAnalyzerModule  ← декодер I2C / SPI
```

Зарегистрированные типы: `ProtocolModule`, `SequenceDiagramModule`, `PacketEditorModule`, `UartMonitorModule`, `ProtocolAnalyzerModule`

---

## SequenceDiagramModule

Редактор sequence-диаграмм в стиле PlantUML/Mermaid.

### DSL-синтаксис

```
title: Handshake

A -> B: SYN
B -> A: SYN-ACK
A -> B: ACK
note over A: connection established
B --> A: data (async)
```

- `A -> B: label` — синхронное сообщение
- `A --> B: label` — асинхронное (пунктирная стрелка)
- `B ->: label` — reply (обратная стрелка)
- `note over X: text` — заметка над участником

### Рендерер

`SequenceDiagramWidget` — QWidget с QPainter:

| Константа | Значение |
|-----------|---------|
| `COL_W` | 160 px (ширина колонки) |
| `ROW_H` | 50 px (высота строки сообщения) |
| `HEAD_H` | 60 px (высота заголовка участника) |

Предпросмотр обновляется в реальном времени при редактировании текста.

---

## PacketEditorModule

Редактор битовых полей протокольного пакета.

### Таблица полей

| Столбец | Тип |
|---------|-----|
| Имя | строка |
| Bit Offset | число |
| Bit Width | число |
| Тип данных | uint8 / int16 / float / bits |
| Описание | строка |

### Bit Map Widget

`PacketBitMapWidget` отображает поля пакета как цветные сегменты битовой карты (один байт = один сегмент). До 8 цветов для чередования полей.

### C-структура

Кнопка **Export C Struct** генерирует:

```c
typedef struct __attribute__((packed)) {
    uint8_t  sync;        // bits 0..7
    uint16_t address;     // bits 8..23
    float    value;       // bits 24..55
    uint8_t  crc;         // bits 56..63
} MyPacket_t;
```

---

## UartMonitorModule

Отладочный UART-терминал.

### Режимы работы

| Режим | Описание |
|-------|---------|
| ASCII | Стандартный текстовый вывод |
| HEX | Побайтовый hex-дамп (ToggleBox) |

### Подключение

1. Нажмите **Scan** для обновления списка портов
2. Выберите порт и baudrate (9600 / 115200 / 230400 / 1M)
3. Нажмите **Connect**
4. Введите текст в поле отправки → **Send** или `Enter`

Входящие данные отображаются зелёным, исходящие — белым.

> **Требование:** Qt6::SerialPort. Если собрано без SerialPort — кнопка Connect недоступна, но интерфейс отображается.

---

## ProtocolAnalyzerModule

Программный декодер шинных протоколов из hex-строк.

### Поддерживаемые протоколы

#### I2C

Формат входа: hex-строка вида `A0 45 FF` (байты через пробел).

Декодирование:
1. Первый байт: `addr[7:1]` + `R/W bit`
2. Второй байт: регистр (если запись) или данные (если чтение)
3. Остальные байты: данные

#### SPI

Два поля: **MOSI** и **MISO** (hex-строки).  
Декодируются побайтово; каждый байт: MOSI-значение ↔ MISO-ответ.

### Пресеты

Готовые образцы для быстрого тестирования:

| Пресет | Описание |
|--------|---------|
| I2C Write | Запись в регистр 0x45 значения 0xFF |
| I2C Read | Чтение с адреса 0x50 |
| SPI Loopback | MOSI=AA BB CC, MISO=11 22 33 |

Результат выводится в таблицу: тип операции, значение, примечание.

---

## Keyboard Shortcuts

| Контекст | Клавиша | Действие |
|----------|---------|---------|
| UART Monitor | `Enter` | Отправить |
| PacketEditor | `+` / `-` | Добавить / удалить поле |
| SequenceDiagram | (редактор) | Live preview |

## Dependencies

- Qt6::Widgets
- Qt6::SerialPort (опционально, для UART Monitor)
