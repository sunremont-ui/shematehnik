// ============================================================
// Общий стор артефактов дизайна (UI-виджеты, поля пакета) — расшарен
// между редакторами (UI Designer, Packet) и генераторами кода (CodeGen),
// чтобы экспорт отражал реально отредактированные данные, а не заглушки.
// Лёгкий внешний стор на useSyncExternalStore (как listeners в ucpCore).
// ============================================================
import { useSyncExternalStore } from "react";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeStore<T>(initial: T, onSet?: (v: T) => void) {
  let value = initial;
  const ls = new Set<() => void>();
  const get = () => value;
  const set = (v: T) => { value = v; onSet?.(value); ls.forEach((f) => f()); };
  const update = (fn: (v: T) => T) => set(fn(value));
  const snapshot = () => cloneJson(value);
  const restore = (v: T) => set(cloneJson(v));
  const subscribe = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, update, snapshot, restore, use };
}

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// --- UI Designer ---
export type UiEventCode = "clicked" | "value_changed";
export type UiEventActionKind = "screen_load";
export type UiLayoutKind = "flex_row" | "flex_column";
export type UiFlexAlign = "start" | "center" | "end" | "space_between" | "space_around" | "space_evenly";
export interface UiEventAction { kind: UiEventActionKind; targetScreenId: string; }
export interface UiEvent { code: UiEventCode; handler: string; action?: UiEventAction; }
export type UiTextAlign = "left" | "center" | "right";
export interface UiStyle { bgColor?: string; radius?: number; textColor?: string; textAlign?: UiTextAlign; borderWidth?: number; borderColor?: string; pad?: number; font?: number; pressedBgColor?: string; }
export interface UiLayout { kind: UiLayoutKind; gap?: number; align?: UiFlexAlign; crossAlign?: UiFlexAlign; trackAlign?: UiFlexAlign; }
export interface UiW { id: number; type: string; x: number; y: number; w: number; h: number; text: string; parentId?: number; assetId?: string; flexGrow?: number; hidden?: boolean; opa?: number; event?: UiEvent; style?: UiStyle; layout?: UiLayout; }
export type UiAssetFormat = "rgb565" | "rgb565a8";
export interface UiAsset { id: string; src?: string; w?: number; h?: number; format?: UiAssetFormat; data?: number[]; }
export interface UiScreenDesign { id: string; title?: string; widgets: UiW[]; }
export interface UiProjectDesign { screens: UiScreenDesign[]; initialScreenId?: string; assets?: UiAsset[]; }
export const UI_EVENT_CODES: UiEventCode[] = ["clicked", "value_changed"];
export const UI_EVENT_ACTION_KINDS: UiEventActionKind[] = ["screen_load"];
export const UI_LAYOUT_KINDS: UiLayoutKind[] = ["flex_row", "flex_column"];
export const UI_FLEX_ALIGNS: UiFlexAlign[] = ["start", "center", "end", "space_between", "space_around", "space_evenly"];
export const UI_TEXT_ALIGNS: UiTextAlign[] = ["left", "center", "right"];
export const UI_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
export const UI_STYLE_SWATCHES = ["#1f6feb", "#2ea043", "#d29922", "#da3633", "#8957e5", "#30363d"];

const DEFAULT_UI_WIDGETS: UiW[] = [
  { id: 1, type: "Label", x: 30, y: 20, w: 180, h: 28, text: "Dryer 60°C" },
  { id: 2, type: "Arc", x: 60, y: 70, w: 120, h: 120, text: "" },
  { id: 3, type: "Button", x: 40, y: 210, w: 160, h: 40, text: "START" },
];

function normalizeUiDesign(raw: unknown): UiW[] | null {
  if (!Array.isArray(raw)) return null;
  const widgets = raw.filter(obj).map((w, i) => ({
    id: finite(w.id, i + 1),
    type: typeof w.type === "string" && w.type ? w.type : "Label",
    x: finite(w.x, 0),
    y: finite(w.y, 0),
    w: Math.max(1, finite(w.w, 80)),
    h: Math.max(1, finite(w.h, 30)),
    text: typeof w.text === "string" ? w.text : "",
    ...normalizeUiParent(w.parentId),
    ...normalizeUiAsset(w.assetId),
    ...normalizeUiFlexGrow(w.flexGrow),
    ...(w.hidden === true ? { hidden: true } : {}),
    ...normalizeUiOpa(w.opa),
    ...normalizeUiEvent(w.event),
    ...normalizeUiStyle(w.style),
    ...normalizeUiLayout(w.layout),
  }));
  return sanitizeUiParents(widgets);
}

function normalizeUiParent(raw: unknown): { parentId?: number } {
  const parentId = Number(raw);
  if (!Number.isFinite(parentId)) return {};
  const id = Math.round(parentId);
  return id > 0 ? { parentId: id } : {};
}

function sanitizeUiParents(widgets: UiW[]): UiW[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  return widgets.map((w) => {
    const parentId = w.parentId;
    if (typeof parentId !== "number") return w;
    const parent = byId.get(parentId);
    if (w.type !== "Panel" && parent && parent.id !== w.id && parent.type === "Panel") return { ...w, parentId };
    const { parentId: _parentId, ...rest } = w;
    return rest;
  });
}

function normalizeUiAsset(raw: unknown): { assetId?: string } {
  const assetId = typeof raw === "string" ? raw.trim() : "";
  return assetId ? { assetId } : {};
}

function normalizeUiFlexGrow(raw: unknown): { flexGrow?: number } {
  const grow = Number(raw);
  return Number.isFinite(grow) && grow >= 1 ? { flexGrow: Math.round(grow) } : {};
}

function normalizeUiOpa(raw: unknown): { opa?: number } {
  const opa = Number(raw);
  // 255 — значение по умолчанию (непрозрачно); храним только осмысленную прозрачность.
  return Number.isFinite(opa) && opa >= 0 && opa < 255 ? { opa: Math.round(opa) } : {};
}

function normalizeUiAssets(raw: unknown): UiAsset[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const assets: UiAsset[] = [];
  for (const entry of raw.filter(obj)) {
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const src = typeof entry.src === "string" ? entry.src.replace(/[\r\n]+/g, " ").trim() : "";
    const asset: UiAsset = src ? { id, src } : { id };
    const w = Math.round(Number(entry.w)), h = Math.round(Number(entry.h));
    const data = Array.isArray(entry.data) ? entry.data.map((n) => Number(n) & 0xFF) : null;
    const bpp = entry.format === "rgb565a8" ? 3 : entry.format === "rgb565" ? 2 : 0;
    if (bpp && w >= 1 && h >= 1 && data && data.length === w * h * bpp) {
      asset.w = w; asset.h = h; asset.format = entry.format as UiAssetFormat; asset.data = data;
    }
    assets.push(asset);
  }
  return assets;
}

function normalizeUiEvent(raw: unknown): { event?: UiEvent } {
  if (!obj(raw)) return {};
  const code = raw.code === "value_changed" ? "value_changed" : raw.code === "clicked" ? "clicked" : null;
  const handler = typeof raw.handler === "string" ? raw.handler.trim() : "";
  const action = normalizeUiEventAction(raw.action).action;
  return code && handler ? { event: { code, handler, ...(action ? { action } : {}) } } : {};
}

function normalizeUiEventAction(raw: unknown): { action?: UiEventAction } {
  if (!obj(raw)) return {};
  const kind = raw.kind === "screen_load" ? "screen_load" : null;
  const targetScreenId = typeof raw.targetScreenId === "string" ? raw.targetScreenId.trim() : "";
  return kind && targetScreenId ? { action: { kind, targetScreenId } } : {};
}

const hexColor = (v: unknown): string | null =>
  typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v.trim()) ? v.trim() : null;

function normalizeUiStyle(raw: unknown): { style?: UiStyle } {
  if (!obj(raw)) return {};
  const style: UiStyle = {};
  const bg = hexColor(raw.bgColor); if (bg) style.bgColor = bg;
  const radius = Number(raw.radius);
  if (Number.isFinite(radius)) style.radius = Math.max(0, Math.round(radius));
  const textColor = hexColor(raw.textColor); if (textColor) style.textColor = textColor;
  if (raw.textAlign === "left" || raw.textAlign === "center" || raw.textAlign === "right") style.textAlign = raw.textAlign;
  const borderWidth = Number(raw.borderWidth);
  if (Number.isFinite(borderWidth) && borderWidth >= 1) style.borderWidth = Math.round(borderWidth);
  const borderColor = hexColor(raw.borderColor); if (borderColor) style.borderColor = borderColor;
  const pad = Number(raw.pad);
  if (Number.isFinite(pad) && pad >= 1) style.pad = Math.round(pad);
  const font = Number(raw.font);
  if (Number.isInteger(font) && UI_FONT_SIZES.includes(font)) style.font = font;
  const pressedBgColor = hexColor(raw.pressedBgColor); if (pressedBgColor) style.pressedBgColor = pressedBgColor;
  return Object.keys(style).length ? { style } : {};
}

function normalizeUiLayout(raw: unknown): { layout?: UiLayout } {
  if (!obj(raw)) return {};
  const kind = raw.kind === "flex_row" ? "flex_row" : raw.kind === "flex_column" ? "flex_column" : null;
  if (!kind) return {};
  const layout: UiLayout = { kind };
  const gap = Number(raw.gap);
  if (Number.isFinite(gap)) layout.gap = Math.max(0, Math.round(gap));
  const align = (k: unknown): UiFlexAlign | undefined =>
    typeof k === "string" && (UI_FLEX_ALIGNS as string[]).includes(k) ? k as UiFlexAlign : undefined;
  const main = align(raw.align), cross = align(raw.crossAlign), track = align(raw.trackAlign);
  if (main) layout.align = main;
  if (cross) layout.crossAlign = cross;
  if (track) layout.trackAlign = track;
  return { layout };
}

export function uiProjectFromWidgets(widgets: UiW[], screenId = "main"): UiProjectDesign {
  return {
    initialScreenId: screenId,
    screens: [{ id: screenId, title: screenId === "main" ? "Main" : screenId, widgets: cloneJson(widgets) }],
  };
}

function normalizeUiProject(raw: unknown, fallbackWidgets: UiW[] = DEFAULT_UI_WIDGETS): UiProjectDesign | null {
  if (!obj(raw) || !Array.isArray(raw.screens)) return null;
  const used = new Set<string>();
  const screens: UiScreenDesign[] = raw.screens.filter(obj).map((screen, i) => {
    const fallback = i === 0 ? "main" : `screen_${i + 1}`;
    let id = typeof screen.id === "string" && screen.id.trim() ? screen.id.trim() : fallback;
    const base = id;
    let k = 1;
    while (used.has(id)) id = `${base}_${k++}`;
    used.add(id);
    const widgets = normalizeUiDesign(screen.widgets) ?? [];
    return {
      id,
      ...(typeof screen.title === "string" && screen.title ? { title: screen.title } : {}),
      widgets,
    };
  });
  if (!screens.length) return uiProjectFromWidgets(fallbackWidgets);
  const ids = new Set(screens.map((s) => s.id));
  const initial = typeof raw.initialScreenId === "string" && ids.has(raw.initialScreenId)
    ? raw.initialScreenId
    : screens[0].id;
  const assets = normalizeUiAssets(raw.assets);
  return { screens, initialScreenId: initial, ...(assets.length ? { assets } : {}) };
}

function initialScreen(project: UiProjectDesign): UiScreenDesign {
  return project.screens.find((s) => s.id === project.initialScreenId) ?? project.screens[0] ?? { id: "main", widgets: [] };
}

let syncingUiStores = false;
let syncLegacyUiDesignToProject: ((widgets: UiW[]) => void) | null = null;

export const uiDesign = makeStore<UiW[]>(cloneJson(DEFAULT_UI_WIDGETS), (widgets) => {
  if (!syncingUiStores) syncLegacyUiDesignToProject?.(widgets);
});

export const uiProject = makeStore<UiProjectDesign>(uiProjectFromWidgets(DEFAULT_UI_WIDGETS), (project) => {
  if (syncingUiStores) return;
  syncingUiStores = true;
  uiDesign.restore(initialScreen(project).widgets);
  syncingUiStores = false;
});

syncLegacyUiDesignToProject = (widgets: UiW[]) => {
  const current = uiProject.get();
  const initialId = current.initialScreenId ?? current.screens[0]?.id ?? "main";
  const screens = current.screens.length ? current.screens : [{ id: initialId, widgets: [] }];
  const nextScreens = screens.some((s) => s.id === initialId)
    ? screens.map((s) => s.id === initialId ? { ...s, widgets: cloneJson(widgets) } : s)
    : [{ id: initialId, title: initialId, widgets: cloneJson(widgets) }, ...screens];
  syncingUiStores = true;
  uiProject.restore({ ...current, initialScreenId: initialId, screens: nextScreens });
  syncingUiStores = false;
};

// --- Packet Editor ---
export interface PacketField { id: number; name: string; bytes: number; value: number; }
export const packet = makeStore<PacketField[]>([
  { id: 1, name: "header", bytes: 1, value: 0xAA },
  { id: 2, name: "cmd", bytes: 1, value: 0x03 },
  { id: 3, name: "length", bytes: 2, value: 0x0004 },
  { id: 4, name: "crc", bytes: 2, value: 0x1A3F },
]);

export const capture = makeStore<number[]>([]);
export function appendCapture(bytes: ArrayLike<number>, max = 4096) {
  capture.update((old) => [...old, ...Array.from(bytes)].slice(-max));
}
export function clearCapture() {
  capture.set([]);
}

// --- Program System: FSM Editor ---
export interface FsmState { id: string; name: string; x: number; y: number; entry?: string; }
export interface FsmTransition { from: string; to: string; event: string; guard?: string; action?: string; }
export interface FsmDesign { name: string; states: FsmState[]; transitions: FsmTransition[]; initial: string; }

export const fsmPresets: Record<string, FsmDesign> = {
  dryer: {
    name: "FilamentDryer",
    initial: "idle",
    states: [
      { id: "idle", name: "IDLE", x: 120, y: 120, entry: "heater_off(); fan_off();" },
      { id: "preheat", name: "PREHEAT", x: 320, y: 90, entry: "heater_on(); fan_on();" },
      { id: "drying", name: "DRYING", x: 520, y: 160, entry: "control_temperature();" },
      { id: "cooldown", name: "COOLDOWN", x: 320, y: 260, entry: "heater_off(); fan_on();" },
      { id: "fault", name: "FAULT", x: 120, y: 280, entry: "heater_off(); alarm_on();" },
    ],
    transitions: [
      { from: "idle", to: "preheat", event: "START", action: "timer_reset();" },
      { from: "preheat", to: "drying", event: "TEMP_OK", guard: "temperature_c >= target_c" },
      { from: "drying", to: "cooldown", event: "TIMEOUT", action: "save_cycle_log();" },
      { from: "cooldown", to: "idle", event: "TEMP_OK", guard: "temperature_c < 35" },
      { from: "preheat", to: "fault", event: "FAULT", action: "fault_latch();" },
      { from: "drying", to: "fault", event: "FAULT", action: "fault_latch();" },
      { from: "fault", to: "idle", event: "RESET", action: "alarm_off();" },
    ],
  },
  fan: {
    name: "FanController",
    initial: "idle",
    states: [
      { id: "idle", name: "IDLE", x: 130, y: 170 },
      { id: "run", name: "RUN", x: 330, y: 110, entry: "fan_pwm_set(target_pwm);" },
      { id: "boost", name: "BOOST", x: 530, y: 170, entry: "fan_pwm_set(255);" },
      { id: "fault", name: "FAULT", x: 330, y: 280, entry: "fan_pwm_set(0);" },
    ],
    transitions: [
      { from: "idle", to: "run", event: "START" },
      { from: "run", to: "boost", event: "TEMP_HIGH", guard: "temperature_c > 70" },
      { from: "boost", to: "run", event: "TEMP_OK", guard: "temperature_c < 55" },
      { from: "run", to: "idle", event: "STOP", action: "fan_pwm_set(0);" },
      { from: "run", to: "fault", event: "FAULT" },
      { from: "boost", to: "fault", event: "FAULT" },
      { from: "fault", to: "idle", event: "RESET" },
    ],
  },
  washer: {
    name: "WasherCycle",
    initial: "fill",
    states: [
      { id: "fill", name: "FILL", x: 100, y: 130, entry: "valve_open();" },
      { id: "wash", name: "WASH", x: 280, y: 90, entry: "motor_wash();" },
      { id: "drain", name: "DRAIN", x: 470, y: 130, entry: "pump_on();" },
      { id: "spin", name: "SPIN", x: 360, y: 270, entry: "motor_spin();" },
      { id: "done", name: "DONE", x: 160, y: 280, entry: "all_off();" },
    ],
    transitions: [
      { from: "fill", to: "wash", event: "LEVEL_OK" },
      { from: "wash", to: "drain", event: "TIMEOUT" },
      { from: "drain", to: "spin", event: "EMPTY" },
      { from: "spin", to: "done", event: "TIMEOUT" },
      { from: "done", to: "fill", event: "RESET" },
    ],
  },
};

export const fsm = makeStore<FsmDesign>(fsmPresets.dryer);

// --- Register Map ---
export type RegisterAccess = "ro" | "rw" | "wo";
export interface RegField {
  id: number;
  name: string;
  lsb: number;
  width: number;
  desc?: string;
}
export interface RegisterDef {
  id: number;
  name: string;
  addr: number;
  access: RegisterAccess;
  reset: number;
  desc?: string;
  fields: RegField[];
}
export interface RegisterMapDesign {
  device: string;
  base: number;
  registers: RegisterDef[];
}

export const regMap = makeStore<RegisterMapDesign>({
  device: "UCP_PERIPH",
  base: 0x40000000,
  registers: [
    {
      id: 1,
      name: "CTRL",
      addr: 0x00,
      access: "rw",
      reset: 0,
      desc: "Control register",
      fields: [
        { id: 1, name: "ENABLE", lsb: 0, width: 1, desc: "Enable peripheral" },
        { id: 2, name: "MODE", lsb: 4, width: 2, desc: "Operating mode" },
      ],
    },
    {
      id: 2,
      name: "STATUS",
      addr: 0x04,
      access: "ro",
      reset: 0,
      desc: "Status register",
      fields: [
        { id: 3, name: "READY", lsb: 0, width: 1, desc: "Ready flag" },
      ],
    },
  ],
});

export interface DesignSnapshot {
  uiDesign?: UiW[];
  uiProject?: UiProjectDesign;
  packet?: PacketField[];
  fsm?: FsmDesign;
  regMap?: RegisterMapDesign;
  pid?: unknown;
}

function normalizePacket(raw: unknown): PacketField[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(obj).map((f, i) => {
    const bytes = [1, 2, 4].includes(finite(f.bytes, 1)) ? finite(f.bytes, 1) : 1;
    return {
      id: finite(f.id, i + 1),
      name: typeof f.name === "string" && f.name ? f.name : `field_${i + 1}`,
      bytes,
      value: Math.max(0, finite(f.value, 0)) >>> 0,
    };
  });
}

function normalizeFsm(raw: unknown): FsmDesign | null {
  if (!obj(raw) || !Array.isArray(raw.states) || !Array.isArray(raw.transitions)) return null;
  const states: FsmState[] = raw.states.filter(obj).map((s, i) => ({
    id: typeof s.id === "string" && s.id ? s.id : `s${i + 1}`,
    name: typeof s.name === "string" && s.name ? s.name : `STATE_${i + 1}`,
    x: finite(s.x, 120 + i * 90),
    y: finite(s.y, 140),
    ...(typeof s.entry === "string" && s.entry ? { entry: s.entry } : {}),
  }));
  const ids = new Set(states.map((s) => s.id));
  const transitions: FsmTransition[] = raw.transitions.filter(obj)
    .filter((t) => typeof t.from === "string" && typeof t.to === "string" && ids.has(t.from) && ids.has(t.to))
    .map((t) => ({
      from: t.from as string,
      to: t.to as string,
      event: typeof t.event === "string" && t.event ? t.event : "EV",
      ...(typeof t.guard === "string" && t.guard ? { guard: t.guard } : {}),
      ...(typeof t.action === "string" && t.action ? { action: t.action } : {}),
    }));
  const initial = typeof raw.initial === "string" && ids.has(raw.initial) ? raw.initial : states[0]?.id ?? "";
  return {
    name: typeof raw.name === "string" && raw.name ? raw.name : "FSM",
    states,
    transitions,
    initial,
  };
}

function normalizeRegMap(raw: unknown): RegisterMapDesign | null {
  if (!obj(raw) || !Array.isArray(raw.registers)) return null;
  const registers: RegisterDef[] = raw.registers.filter(obj).map((r, i) => ({
    id: finite(r.id, i + 1),
    name: typeof r.name === "string" && r.name ? r.name : `REG_${i + 1}`,
    addr: Math.max(0, finite(r.addr, i * 4)) >>> 0,
    access: r.access === "ro" || r.access === "wo" ? r.access : "rw",
    reset: Math.max(0, finite(r.reset, 0)) >>> 0,
    ...(typeof r.desc === "string" && r.desc ? { desc: r.desc } : {}),
    fields: Array.isArray(r.fields) ? r.fields.filter(obj).map((f, j) => ({
      id: finite(f.id, j + 1),
      name: typeof f.name === "string" && f.name ? f.name : `FIELD_${j + 1}`,
      lsb: Math.max(0, Math.min(31, finite(f.lsb, 0))) >>> 0,
      width: Math.max(1, Math.min(32, finite(f.width, 1))) >>> 0,
      ...(typeof f.desc === "string" && f.desc ? { desc: f.desc } : {}),
    })) : [],
  }));
  return {
    device: typeof raw.device === "string" && raw.device ? raw.device : "DEVICE",
    base: Math.max(0, finite(raw.base, 0)) >>> 0,
    registers,
  };
}

export function snapshotDesign(): DesignSnapshot {
  return {
    uiDesign: uiDesign.snapshot(),
    uiProject: uiProject.snapshot(),
    packet: packet.snapshot(),
    fsm: fsm.snapshot(),
    regMap: regMap.snapshot(),
  };
}

export function restoreDesign(raw: unknown): void {
  if (!obj(raw)) return;
  const project = normalizeUiProject(raw.uiProject, uiDesign.get());
  if (project) uiProject.restore(project);
  else {
    const ui = normalizeUiDesign(raw.uiDesign);
    if (ui) uiProject.restore(uiProjectFromWidgets(ui));
  }
  const pkt = normalizePacket(raw.packet);
  if (pkt) packet.restore(pkt);
  const f = normalizeFsm(raw.fsm);
  if (f) fsm.restore(f);
  const rm = normalizeRegMap(raw.regMap);
  if (rm) regMap.restore(rm);
}
