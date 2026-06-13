# UCP Implement: Stable API — IModule Interface

Stabilize the public module API using pimpl idiom so third-party modules can link against ucp_core without depending on Qt internals.

## Target files

- `platform_app/core/imodule.h` — new pure-interface header (no Qt includes)
- `platform_app/core/module.h` — inherit from IModule, keep Qt implementation
- `platform_app/core/module_factory.h` — expose via IModule* only in public API

## Design

```cpp
// imodule.h — only stdlib headers
#pragma once
#include <string>

class IModule {
public:
    virtual ~IModule() = default;
    virtual std::string id() const = 0;
    virtual std::string name() const = 0;
    virtual void init() = 0;
    virtual void destroy() = 0;
    // widget() intentionally omitted — Qt dependency, internal only
};
```

Module continues to inherit QObject + IModule. ModuleFactory::create() returns IModule*.

## Implementation steps

1. Create `core/imodule.h` with pure interface above
2. Update `Module` class: add `virtual std::string id() const override`, etc. — delegate to existing QString methods via `.toStdString()`
3. Update `ModuleFactory::create()` signature to return `IModule*`
4. Add `core/imodule.h` to `ucp_core` target in CMakeLists
5. Verify existing tests still pass: `/ucp-test`

## After implementing

Mark `[ ] Stable API for third-party modules` done in `wiki/roadmap.md` v1.0 section.
