# UCP Implement: Real-time PID via SerialPort

Pipe PidChannel output values into UartMonitorModule TX queue so PID setpoints/outputs appear on serial monitor.

## Target files

- `platform_app/modules/pid/pid_tuner_module.cpp` — emit EventBus event on each tick
- `platform_app/modules/protocol/protocol_module.cpp` — subscribe in UartMonitorModule

## Design

On each PID simulation timer tick, emit:

```cpp
EventBus::instance().emit("pid.tick", QVariantMap{
    {"channel", ch.name},
    {"setpoint", ch.setpoint},
    {"input",    ch.input},
    {"output",   ch.output}
});
```

`UartMonitorModule` subscribes to `"pid.tick"`:

```cpp
bus.on("pid.tick", this, [this](const QVariant& v){
    auto m = v.toMap();
    QString line = QString("%1 SP=%.2f IN=%.2f OUT=%.2f\n")
        .arg(m["channel"].toString())
        .arg(m["setpoint"].toDouble())
        .arg(m["input"].toDouble())
        .arg(m["output"].toDouble());
    appendToRxLog(line);  // existing UartMonitor method
});
```

Guard with `#ifdef HAS_QT_SERIALPORT` only if using real port; EventBus path is always available.

## Implementation steps

1. In `PidTunerModule` timer tick: emit `"pid.tick"` with QVariantMap payload
2. In `UartMonitorModule::init()`: subscribe to `"pid.tick"`, format string, call `appendRxLine()`
3. Verify EventBus unsubscribe is called in `UartMonitorModule::destroy()` (already in place via `off(this)`)
4. Manual test: open PID Tuner + UART Monitor, start simulation, confirm output streams
5. Run `/ucp-test`

## After implementing

Mark `[ ] Real-time PID via SerialPort` done in `wiki/roadmap.md` v1.2 section.
