# UCP Implement: EventBus Unsubscribe

> **STATUS: ✓ DONE** — Implemented 2026-05-17. `off(QObject*)` added to EventBus; `Module::destroy()` calls it. All 3 suites pass.

Add `off(QObject*)` to `EventBus` so modules can clean up listeners on destruction.

## Current state

`platform_app/core/event_bus.h` / `event_bus.cpp`:
- `on(event, receiver, slot)` uses Qt `connect()` internally
- No `off()` method — deleting a receiver leaves a dangling connection

## Implementation plan

### 1. Store connections keyed by receiver

In `event_bus.h`, add a private member:
```cpp
QMultiHash<QObject*, QMetaObject::Connection> m_connections;
```

### 2. Update `on()` to store the connection handle

```cpp
template<typename Receiver, typename Slot>
void on(const QString &event, Receiver *recv, Slot slot) {
    auto conn = connect(this, /* signal */, recv, slot);
    m_connections.insert(recv, conn);
    // also connect recv->destroyed to auto-cleanup
    connect(recv, &QObject::destroyed, this, [this, recv]() {
        off(recv);
    });
}
```

Actually: EventBus uses a custom signal-per-event approach. Read `event_bus.cpp` first to understand the exact dispatch mechanism before modifying.

### 3. Add `off(QObject *receiver)`

```cpp
void EventBus::off(QObject *receiver) {
    const auto conns = m_connections.values(receiver);
    for (const auto &conn : conns)
        disconnect(conn);
    m_connections.remove(receiver);
}
```

### 4. Call `off(this)` in `Module::destroy()`

`platform_app/core/module.cpp` — `Module::destroy()`:
```cpp
void Module::destroy() {
    EventBus::instance().off(this);
    // existing cleanup...
}
```

### 5. Add unit test in `tests/test_core.cpp`

```cpp
void eventbus_off_cleans_up();
```
- Register receiver, emit event, verify count=1
- Call `EventBus::instance().off(&receiver)`
- Emit again, verify count is still 1 (not 2)

## Acceptance criteria
- `eventbus_off_cleans_up` test passes
- No crash when module is destroyed and EventBus later emits on that event
- All 3 test suites still pass (`/ucp-test`)

## Read these files first
- `platform_app/core/event_bus.h`
- `platform_app/core/event_bus.cpp`
- `platform_app/core/module.cpp`

## After implementing
Mark `[ ] EventBus unsubscribe` done in `wiki/roadmap.md` v1.0 section.
