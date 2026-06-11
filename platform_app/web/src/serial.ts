// ============================================================
// Web Serial — общий слой последовательного порта: один порт на всё
// приложение, UART Monitor и PID Tuner подписываются одновременно.
// Работает в Chrome/Edge (navigator.serial); модули держат свою
// симуляцию как фолбэк, этот слой её не знает.
// ============================================================
import { useSyncExternalStore } from "react";

// --- Минимальные типы Web Serial (нет в lib.dom.d.ts) ---
interface WebSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}
interface WebSerial { requestPort(): Promise<WebSerialPort>; }

const serialApi = (): WebSerial | undefined =>
  (navigator as Navigator & { serial?: WebSerial }).serial;

// --- Состояние (внешний стор, как в design.ts) ---
export interface SerialState {
  supported: boolean;
  status: "closed" | "open" | "error";
  info: string;          // подпись порта или текст ошибки
  baud: number;
}

let state: SerialState = {
  supported: typeof navigator !== "undefined" && !!serialApi(),
  status: "closed", info: "", baud: 115200,
};
const stateLs = new Set<() => void>();
const getState = () => state;
function setState(p: Partial<SerialState>) { state = { ...state, ...p }; stateLs.forEach((f) => f()); }
const subscribeState = (f: () => void) => { stateLs.add(f); return () => { stateLs.delete(f); }; };
export function useSerial(): SerialState { return useSyncExternalStore(subscribeState, getState, getState); }

// --- Порт и подписчики на данные ---
let port: WebSerialPort | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
const dataLs = new Set<(chunk: Uint8Array) => void>();

/** Подписка на входящие байты; возвращает отписку. */
export function onSerialData(cb: (chunk: Uint8Array) => void): () => void {
  dataLs.add(cb);
  return () => { dataLs.delete(cb); };
}

/** Открыть порт (вызывать из обработчика клика — requestPort требует жеста). */
export async function serialOpen(baud: number): Promise<void> {
  const api = serialApi();
  if (!api) throw new Error("Web Serial не поддерживается этим браузером");
  if (port) await serialClose();
  const p = await api.requestPort();
  await p.open({ baudRate: baud });
  port = p;
  const inf = p.getInfo();
  setState({
    status: "open", baud,
    info: inf.usbVendorId != null
      ? `usb ${inf.usbVendorId.toString(16).padStart(4, "0")}:${(inf.usbProductId ?? 0).toString(16).padStart(4, "0")}`
      : "serial port",
  });
  void readLoop(p);
}

// Стандартный паттерн чтения: после восстановимой ошибки (framing/overrun)
// readable остаётся — берём reader заново; при отключении устройства
// readable становится null и цикл завершается.
async function readLoop(p: WebSerialPort) {
  while (port === p && p.readable) {
    const r = p.readable.getReader();
    reader = r;
    try {
      for (;;) {
        const { value, done } = await r.read();
        if (done) break;
        if (value) dataLs.forEach((f) => f(value));
      }
    } catch (e) {
      if (port === p) setState({ status: "error", info: String(e) });
    } finally {
      r.releaseLock();
      if (reader === r) reader = null;
    }
  }
  if (port === p) { port = null; setState({ status: "closed", info: "устройство отключено" }); }
}

export async function serialClose(): Promise<void> {
  const p = port;
  port = null;
  if (!p) return;
  try { await reader?.cancel(); } catch { /* уже закрыт */ }
  try { writer?.releaseLock(); } catch { /* не залочен */ }
  writer = null;
  try { await p.close(); } catch { /* уже закрыт */ }
  setState({ status: "closed", info: "" });
}

export async function serialWrite(data: Uint8Array): Promise<void> {
  if (!port?.writable) throw new Error("порт не открыт");
  if (!writer) writer = port.writable.getWriter();
  await writer.write(data);
}

// ============================================================
// Чистые помощники (покрыты Vitest) — сборка строк и телеметрия.
// ============================================================

/** Собирает байтовые чанки в строки: чанк может рвать строку и UTF-8 где угодно. */
export class LineBuffer {
  private buf = "";
  private dec = new TextDecoder();
  push(chunk: Uint8Array): string[] {
    this.buf += this.dec.decode(chunk, { stream: true });
    const parts = this.buf.split(/\r\n|\n|\r/);
    this.buf = parts.pop() ?? "";
    return parts.filter((s) => s.length > 0);
  }
}

/** Телеметрия прошивок (сушилка/паяльник): "T:26.1 S:60 O:128" → {t,s,o}. */
export interface Telemetry { t?: number; s?: number; o?: number; }
export function parseTelemetry(line: string): Telemetry | null {
  const out: Telemetry = {};
  let found = false;
  for (const m of line.matchAll(/\b([TSO]):\s*(-?\d+(?:\.\d+)?)/g)) {
    found = true;
    const v = parseFloat(m[2]);
    if (m[1] === "T") out.t = v; else if (m[1] === "S") out.s = v; else out.o = v;
  }
  return found ? out : null;
}

/** Форматирование чанка для лога монитора. */
export function formatBytes(bytes: ArrayLike<number>, mode: "hex" | "ascii"): string {
  const arr = Array.from(bytes);
  return mode === "hex"
    ? arr.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")
    : arr.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
}
