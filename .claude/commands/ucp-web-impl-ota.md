# UCP Web Implement: OTA Flash via esptool-js

Phase 10.4 (`wiki/roadmap-web.md`). Replace the esptool simulation in OtaView
with real ESP32 flashing over Web Serial using Espressif's official
`esptool-js` library.

## Target files

- `platform_app/web/src/modules/OtaView.tsx` — replace simulation
- `platform_app/web/package.json` — add `esptool-js` (lazy import! don't grow the main bundle)

## Design

- `import("esptool-js")` lazily on first Connect click; while loading show spinner.
- Flow: file input (`.bin`, read as binary string) → Connect (its own `requestPort`;
  note esptool-js wraps the port itself — do NOT share `src/serial.ts` port, close it first
  if open) → `ESPLoader.main()` (chip detect → show chip name/MAC) →
  `writeFlash({ fileArray: [{ data, address: 0x10000 }], reportProgress })` → progress bar → `after("hard_reset")`.
- Address field (default `0x10000`, hex input). Baud select (115200/460800/921600).
- Terminal pane: pipe esptool-js `terminal` callbacks into the existing log view.
- No Web Serial (Firefox/Safari) → keep current simulation, labelled «симуляция (нет Web Serial)».

## Gotchas

- esptool-js API moved around between versions — check the installed version's README in
  `node_modules/esptool-js` before wiring up (`ESPLoader`/`Transport` import names).
- Flashing needs the device in bootloader; esptool-js toggles DTR/RTS itself, but boards
  with weird auto-reset circuits may need manual BOOT — put a hint in the UI.
- Big `.bin` → read via `FileReader.readAsBinaryString` (esptool-js expects binary string, not ArrayBuffer — verify against installed version).

## Testing

- Vitest: hex-address parser, progress percent calc (pure helpers).
- e2e: module renders, file input + fallback path without Web Serial, no console errors.
- Real flash = user's manual step; report what to test (ESP32 + cable).

## After implementing

Tick 10.4 in `wiki/roadmap-web.md`, log entry in `wiki/log.md`, `/ucp-web`, commit.
