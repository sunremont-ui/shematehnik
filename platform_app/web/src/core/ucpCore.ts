// ============================================================
// ucpCore — единая точка доступа к вычислительному ядру UCP.
// Пытается загрузить WASM-сборку (wasm/ → public/wasm/),
// иначе использует идентичный JS-фолбэк. Алгоритмы 1:1 с десктопом.
// ============================================================
import { useEffect, useState } from "react";

export type Backend = "wasm" | "js" | "loading";

export interface CrcParams {
  poly: number; init: number; xorOut: number;
  refIn: boolean; refOut: boolean; bits: number;
}

// --- WASM-модуль (embind), если собран ---
interface WasmCore {
  crc(bytes: Uint8Array, poly: number, init: number,
      refIn: boolean, refOut: boolean, xorOut: number, bits: number): number;
  pidStep(kp: number, ki: number, kd: number, setpoint: number, steps: number): {
    size(): number; get(i: number): number;
  };
}

let wasm: WasmCore | null = null;
let backend: Backend = "loading";
const listeners = new Set<(b: Backend) => void>();

function setBackend(b: Backend) {
  backend = b;
  listeners.forEach((fn) => fn(b));
}

export function getBackend(): Backend { return backend; }

// Идемпотентная инициализация. Динамический импорт скрыт от Vite,
// чтобы сборка не падала, пока generated/ пуст.
let initPromise: Promise<void> | null = null;
export function initCore(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // Артефакт лежит в public/wasm/ → копируется в dist/ дословно.
      // Абсолютный путь с BASE_URL работает и в dev, и в проде.
      const path = `${import.meta.env.BASE_URL}wasm/ucp_core.js`;
      const mod = await import(/* @vite-ignore */ path);
      const factory = mod.default ?? mod.createUcpCore;
      wasm = await factory();
      setBackend("wasm");
    } catch {
      wasm = null;
      setBackend("js");   // фолбэк — приложение работает уже сейчас
    }
  })();
  return initPromise;
}

// --- JS-фолбэк (зеркало ucp_core.cpp) ---
function reflect(v: number, bits: number): number {
  let r = 0;
  for (let i = 0; i < bits; i++) { r = (r << 1) | (v & 1); v >>>= 1; }
  return r >>> 0;
}

function crcJs(bytes: Uint8Array, p: CrcParams): number {
  const topbit = 1 << (p.bits - 1);
  const mask = p.bits === 32 ? 0xFFFFFFFF : (1 << p.bits) - 1;
  let reg = p.init >>> 0;
  for (let b of bytes) {
    if (p.refIn) b = reflect(b, 8);
    reg = (reg ^ (b << (p.bits - 8))) >>> 0;
    for (let i = 0; i < 8; i++) {
      reg = (reg & topbit ? ((reg << 1) ^ p.poly) : (reg << 1)) >>> 0;
      reg &= mask;
    }
  }
  if (p.refOut) reg = reflect(reg, p.bits);
  return ((reg ^ p.xorOut) & mask) >>> 0;
}

function pidJs(kp: number, ki: number, kd: number, setpoint: number, steps: number): number[] {
  const dt = 0.1, tau = 2.0, gain = 1.0;
  let y = 0, integral = 0, prevErr = 0;
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const err = setpoint - y;
    integral += err * dt;
    const deriv = (err - prevErr) / dt;
    let u = kp * err + ki * integral + kd * deriv;
    u = Math.max(-200, Math.min(200, u));
    prevErr = err;
    y += (dt / tau) * (gain * u - y);
    out.push(y);
  }
  return out;
}

// --- Публичное API (выбирает бэкенд автоматически) ---
export function crc(bytes: Uint8Array, p: CrcParams): number {
  if (wasm) return wasm.crc(bytes, p.poly, p.init, p.refIn, p.refOut, p.xorOut, p.bits) >>> 0;
  return crcJs(bytes, p);
}

export function pidStep(kp: number, ki: number, kd: number, setpoint: number, steps: number): number[] {
  if (wasm) {
    const v = wasm.pidStep(kp, ki, kd, setpoint, steps);
    const out: number[] = [];
    for (let i = 0; i < v.size(); i++) out.push(v.get(i));
    return out;
  }
  return pidJs(kp, ki, kd, setpoint, steps);
}

// --- React-хук для бейджа бэкенда ---
export function useCoreBackend(): Backend {
  const [b, setB] = useState<Backend>(backend);
  useEffect(() => {
    listeners.add(setB);
    setB(backend);
    void initCore();
    return () => { listeners.delete(setB); };
  }, []);
  return b;
}
