# Protocol Description

## Purpose

UCP represents embedded communication protocols at two levels:

- packet structure for bytes/fields;
- captured signal or UART bytes for analysis.

## Current Web Modules

| Module | Role |
|---|---|
| Packet Editor | Defines packet fields shared through `design.packet` |
| Protocol Code Gen | Generates C/Python parser code from packet fields |
| Protocol Analyzer | Decodes manual/UART capture bytes using Packet Editor schema |
| UART Monitor | Reads/writes serial bytes when Web Serial is available |
| Logic Analyzer | Imports VCD/CSV signal captures and decodes UART/I2C/SPI timing |

## Shared Store

`platform_app/web/src/design.ts` stores `packet` fields. The same schema is used by Packet Editor, Protocol Code Gen and Protocol Analyzer.

## Signal Captures

`platform_app/web/src/logic.ts` handles:

- CSV capture import (`time,ch0,ch1...`);
- compact VCD import (`$var`, timescale, scalar/vector changes);
- UART decode by baud/config;
- I2C start/address/data/ack decode;
- SPI sample decode.

## Boundaries

- Packet parsing is intentionally fixed-width and deterministic.
- Logic Analyzer VCD support is compact, not a full simulator database.
- Protocol assumptions should be exposed as settings and warnings, not hidden heuristics.

## Update Rules

When changing protocol behavior, update tests in:

- `platform_app/web/src/decode.test.ts`;
- `platform_app/web/src/logic.test.ts`;
- `platform_app/web/e2e/smoke.spec.ts` if UI workflow changes.
