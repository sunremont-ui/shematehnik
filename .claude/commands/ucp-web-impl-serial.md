# UCP Web Implement: Web Serial — UART Monitor + PID Live

Phase 10.1–10.3 (`wiki/roadmap-web.md`). Replace the UART Monitor RX simulation
with a real serial port via the Web Serial API, and add a live telemetry mode to
PID Tuner. Chrome/Edge only — feature-detect and keep the simulation as fallback.

## Target files

- `platform_app/web/src/serial.ts` — NEW: shared serial layer
- `platform_app/web/src/modules/protocol_family.tsx` — UART Monitor (строка ~134: «симуляция потока»)
- `platform_app/web/src/modules/PidTunerView.tsx` — live mode toggle

## Design — `src/serial.ts`

One port shared app-wide (modules must not fight over it). Same store pattern as
`src/design.ts` (`useSyncExternalStore`):

```ts
export interface SerialState {
  supported: boolean;          // "serial" in navigator
  status: "closed" | "open" | "error";
  info?: string;               // port label / error text
}
export function useSerial(): SerialState;
export async function serialOpen(baud: number): Promise<void>;  // navigator.serial.requestPort() + open
export async function serialClose(): Promise<void>;             // cancel reader, release lock, close
export function serialWrite(data: Uint8Array): Promise<void>;
export function onSerialData(cb: (chunk: Uint8Array) => void): () => void;  // subscribe, returns unsub
```

- Read loop: `port.readable.getReader()` in a detached async loop; on cancel/error → status update.
- `requestPort()` MUST be called from a user gesture (button click handler).
- Distribute chunks to all subscribers (UART Monitor + PID can listen at once).

## UART Monitor

- Add a Connect bar: baud select (9600…921600), Connect/Disconnect button, status chip.
- When `supported && open` → render real RX (keep existing hex/ascii + timestamps view, feed it real chunks).
- TX input: line + "Send" (append `\r\n` option) → `serialWrite`.
- When not supported / not connected → existing simulation, labelled «симуляция».

## PID Tuner live mode

- Toggle "Sim | Live". Live: parse telemetry lines from `onSerialData`
  (line-buffer chunks; format `T:<temp> S:<setpoint> O:<out>` — same as dryer/iron
  firmware debug prints) and append to the existing plot ring buffer instead of `pidStep()`.
- Send setpoint changes back: `serialWrite("S=<value>\n")`.

## Testing

- Vitest: line-buffer/parser pure functions (`parseTelemetry`, chunk reassembly across boundaries).
- e2e: UI renders Connect bar; without `navigator.serial` the sim fallback works (Playwright chromium has no Web Serial by default — assert the «симуляция» label path).
- Manual check with real hardware is the user's step — note it in the report, don't block on it.

## After implementing

Tick items 10.1–10.3 in `wiki/roadmap-web.md`, add a `wiki/log.md` entry, run `/ucp-web`, commit.
