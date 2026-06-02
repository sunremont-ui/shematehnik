# Event Bus

## Проблема

Если модули вызывают методы друг друга напрямую, получается жёсткая связь:

```cpp
// Плохо: SchematicModule знает о SPICEModule
schematic->netlist()->onNetlistReady([&](auto data) {
    spice->runSimulation(data);  // прямая зависимость
});
```

Добавление нового модуля (например, логического анализатора) требует правки существующего кода.

## Решение — EventBus

`EventBus` — глобальная шина событий (singleton). Модули не знают друг о друге — они шлют и слушают события.

```cpp
// Отправитель (NetlistGenerator):
EventBus::instance().emitEvent("netlist.generated", netlistJson);

// Получатель (SPICESimulator):
EventBus::instance().on("netlist.generated", this, [this](const QVariant &data) {
    runSimulation(data.toString());
});

// Второй получатель (PCBEditor):
EventBus::instance().on("netlist.generated", this, [this](const QVariant &data) {
    importNetlist(data.toString());
});
```

Никто не знает, кто слушает событие. Можно добавить 10 слушателей, не меняя отправителя.

## Стандартные события

| Событие | Данные | Когда |
|---------|--------|-------|
| `project.opened` | path (QString) | Проект загружен |
| `project.saved` | path (QString) | Проект сохранён |
| `module.selected` | moduleId (QString) | Пользователь кликнул модуль в дереве |
| `module.modified` | moduleId (QString) | Модуль изменён |
| `netlist.generated` | netlist (QString) | Сгенерирован SPICE-совместимый netlist |
| `simulation.started` | — | SPICE-симуляция запущена |
| `simulation.finished` | results (QJsonObject) | Симуляция завершена |
| `hal.pin.changed` | signal, gpio (QJsonObject) | Пользователь переназначил пин |
| `program.started` | programId (QString) | Готовая программа запущена |
| `program.stopped` | programId (QString) | Программа остановлена |

## Отписка

```cpp
// Явная отписка — удаляет все подписки объекта
EventBus::instance().off(this);

// Автоматически вызывается из Module::destroy()
// Автоматически срабатывает при уничтожении объекта (QObject::destroyed)
```

Без `off()` после удаления объекта его лямбда-обработчики оставались в очереди — use-after-free при следующем `emitEvent`.

## Реализация

EventBus — QObject с сигналом `eventTriggered(QString, QVariant)`. Подписка через `QObject::connect` с фильтрацией по строке события.

`on()` хранит `QMetaObject::Connection` в `QMultiHash<QObject*, Connection> m_connections`, ключ — указатель на получателя. `off(receiver)` вызывает `QObject::disconnect(conn)` для каждого соединения и удаляет запись из хэша.
