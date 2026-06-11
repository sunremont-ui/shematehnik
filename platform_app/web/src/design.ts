// ============================================================
// Общий стор артефактов дизайна (UI-виджеты, поля пакета) — расшарен
// между редакторами (UI Designer, Packet) и генераторами кода (CodeGen),
// чтобы экспорт отражал реально отредактированные данные, а не заглушки.
// Лёгкий внешний стор на useSyncExternalStore (как listeners в ucpCore).
// ============================================================
import { useSyncExternalStore } from "react";

function makeStore<T>(initial: T) {
  let value = initial;
  const ls = new Set<() => void>();
  const get = () => value;
  const set = (v: T) => { value = v; ls.forEach((f) => f()); };
  const update = (fn: (v: T) => T) => set(fn(value));
  const subscribe = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, update, use };
}

// --- UI Designer ---
export interface UiW { id: number; type: string; x: number; y: number; w: number; h: number; text: string; }
export const uiDesign = makeStore<UiW[]>([
  { id: 1, type: "Label", x: 30, y: 20, w: 180, h: 28, text: "Dryer 60°C" },
  { id: 2, type: "Arc", x: 60, y: 70, w: 120, h: 120, text: "" },
  { id: 3, type: "Button", x: 40, y: 210, w: 160, h: 40, text: "START" },
]);

// --- Packet Editor ---
export interface PacketField { id: number; name: string; bytes: number; value: number; }
export const packet = makeStore<PacketField[]>([
  { id: 1, name: "header", bytes: 1, value: 0xAA },
  { id: 2, name: "cmd", bytes: 1, value: 0x03 },
  { id: 3, name: "length", bytes: 2, value: 0x0004 },
  { id: 4, name: "crc", bytes: 2, value: 0x1A3F },
]);
