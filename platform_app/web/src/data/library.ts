// ============================================================
// Библиотека компонентов — именованные детали с типом/значением/футпринтом.
// kind задаёт геометрию символа/пинов (см. pinsOf/pinOffset).
// ============================================================

// ---------- Типы выводов для ERC ----------
export type PinType = "passive" | "in" | "out" | "power_in" | "power_out";

// Конвенция обобщённой модели (наши выводы — не реальная распиновка корпуса):
//  • R/C/L/D и разъёмы — passive; Q: 1 (база/затвор) = in, 2/3 — passive.
//  • U-микросхемы: 1 = VCC (power_in), 6 = GND (power_in), 2-3 = in, 4-5 = out.
//  • LDO-стабилизаторы (1117/78xx): 1 = вход питания, 4 = выход (power_out).
export function pinTypesOf(kind: string, value: string): Record<string, PinType> {
  const custom = runtimeUserParts.find((p) => p.kind === kind);
  if (custom) return Object.fromEntries(custom.pins.map((p) => [p.num, p.type ?? "passive"]));
  if (kind === "Q") return { "1": "in" };
  if (baseKindOf(kind) !== "U") return {};
  const v = value.toLowerCase();
  if (v.includes("conn") || v.includes("usb") || v.includes("header")) return {};
  if (v.includes("1117") || v.includes("ldo") || /78\d\d/.test(v))
    return { "1": "power_in", "4": "power_out", "6": "power_in" };
  return { "1": "power_in", "2": "in", "3": "in", "4": "out", "5": "out", "6": "power_in" };
}
export interface LibPart {
  id: string;
  name: string;
  cat: string;       // категория для группировки
  kind: string;      // R | C | L | D | Q | U
  value: string;
  footprint: string;
  desc: string;
}

export interface UserPin {
  num: string;
  name: string;
  side: "L" | "R";
  offset?: number;   // px relative to symbol center; if omitted, auto-spaced
  type?: PinType;
}

export interface UserPart extends LibPart {
  user: true;
  baseKind: "R" | "C" | "L" | "D" | "Q" | "U";
  pins: UserPin[];
}

const LS_USER_PARTS = "ucp.userParts";
let runtimeUserParts: UserPart[] = [];

const BUILTIN_KINDS = new Set(["R", "C", "L", "D", "Q", "U"]);

function slug(s: string): string {
  return (s || "part").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "part";
}

export function baseKindOf(kind: string): "R" | "C" | "L" | "D" | "Q" | "U" {
  const m = /^USER_([RCLDQU])_/.exec(kind);
  const k = (m?.[1] ?? kind[0]?.toUpperCase()) as "R" | "C" | "L" | "D" | "Q" | "U";
  return BUILTIN_KINDS.has(k) ? k : "U";
}

export function refPrefixOfKind(kind: string): string {
  return baseKindOf(kind);
}

export function normalizeUserParts(parts: unknown): UserPart[] {
  if (!Array.isArray(parts)) return [];
  return parts.map((p, i) => {
    const raw = p as Partial<UserPart>;
    const baseKind = baseKindOf(String(raw.baseKind ?? raw.kind ?? "U"));
    const name = String(raw.name || `User Part ${i + 1}`);
    const kind = String(raw.kind || `USER_${baseKind}_${slug(name)}`);
    const pins = (Array.isArray(raw.pins) ? raw.pins : []).map((pin, j) => {
      const r = pin as Partial<UserPin>;
      const side = r.side === "R" ? "R" : "L";
      const type = r.type && ["passive", "in", "out", "power_in", "power_out"].includes(r.type) ? r.type : "passive";
      return {
        num: String(r.num || j + 1),
        name: String(r.name || r.num || j + 1),
        side,
        ...(Number.isFinite(Number(r.offset)) ? { offset: Number(r.offset) } : {}),
        type,
      } satisfies UserPin;
    });
    return {
      id: String(raw.id || kind),
      name,
      cat: String(raw.cat || "User"),
      kind,
      value: String(raw.value || name),
      footprint: String(raw.footprint || "Custom"),
      desc: String(raw.desc || "Пользовательская деталь"),
      user: true,
      baseKind,
      pins: pins.length ? pins : defaultPinsForBase(baseKind),
    } satisfies UserPart;
  });
}

export function makeUserPart(input: {
  name: string; cat?: string; baseKind: "R" | "C" | "L" | "D" | "Q" | "U";
  value?: string; footprint?: string; desc?: string; pins: UserPin[];
}, existing: UserPart[] = runtimeUserParts): UserPart {
  const base = input.baseKind;
  const used = new Set([...LIBRARY.map((p) => p.id), ...existing.map((p) => p.id), ...existing.map((p) => p.kind)]);
  let id = `USER_${base}_${slug(input.name)}`;
  let n = 2;
  while (used.has(id)) id = `USER_${base}_${slug(input.name)}_${n++}`;
  return normalizeUserParts([{
    id, kind: id, name: input.name, cat: input.cat || "User", baseKind: base,
    value: input.value || input.name, footprint: input.footprint || "Custom",
    desc: input.desc || "Пользовательская деталь", user: true, pins: input.pins,
  }])[0];
}

export function mergeUserParts(...lists: UserPart[][]): UserPart[] {
  const byId = new Map<string, UserPart>();
  for (const part of normalizeUserParts(lists.flat())) byId.set(part.id, part);
  return [...byId.values()];
}

export function setRuntimeUserParts(parts: UserPart[]) {
  runtimeUserParts = normalizeUserParts(parts);
}

export function getRuntimeUserParts(): UserPart[] {
  return runtimeUserParts;
}

export function getLibraryParts(userParts = runtimeUserParts): LibPart[] {
  return [...LIBRARY, ...normalizeUserParts(userParts)];
}

export function loadStoredUserParts(): UserPart[] {
  try {
    if (typeof localStorage === "undefined") return [];
    return normalizeUserParts(JSON.parse(localStorage.getItem(LS_USER_PARTS) || "[]"));
  } catch { return []; }
}

export function saveStoredUserParts(parts: UserPart[]) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(LS_USER_PARTS, JSON.stringify(normalizeUserParts(parts)));
  } catch { /* quota */ }
}

export function customPinsOf(kind: string): string[] | null {
  const p = runtimeUserParts.find((x) => x.kind === kind);
  return p ? p.pins.map((pin) => pin.num) : null;
}

export function customPinOffset(kind: string, pin: string, rot = 0): { dx: number; dy: number } | null {
  const part = runtimeUserParts.find((x) => x.kind === kind);
  if (!part) return null;
  const sidePins = part.pins.filter((p) => p.side === part.pins.find((x) => x.num === pin)?.side);
  const p = part.pins.find((x) => x.num === pin);
  if (!p) return null;
  const idx = sidePins.findIndex((x) => x.num === pin);
  const dy = Number.isFinite(p.offset) ? Number(p.offset) : (idx - (sidePins.length - 1) / 2) * 18;
  const base = { dx: p.side === "L" ? -30 : 30, dy };
  if (!rot) return base;
  const r = rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return { dx: base.dx * c - base.dy * s, dy: base.dx * s + base.dy * c };
}

function defaultPinsForBase(base: "R" | "C" | "L" | "D" | "Q" | "U"): UserPin[] {
  if (base === "Q") return [
    { num: "1", name: "B/G", side: "L", type: "in" },
    { num: "2", name: "C/D", side: "R", type: "passive", offset: -14 },
    { num: "3", name: "E/S", side: "R", type: "passive", offset: 14 },
  ];
  if (base === "U") return [
    { num: "1", name: "VCC", side: "L", type: "power_in" },
    { num: "2", name: "IN1", side: "L", type: "in" },
    { num: "3", name: "IN2", side: "L", type: "in" },
    { num: "4", name: "OUT1", side: "R", type: "out" },
    { num: "5", name: "OUT2", side: "R", type: "out" },
    { num: "6", name: "GND", side: "R", type: "power_in" },
  ];
  return [
    { num: "1", name: "1", side: "L", type: "passive" },
    { num: "2", name: "2", side: "R", type: "passive" },
  ];
}

// ---------- KiCad .kicad_sym import ----------
type Sexpr = string | Sexpr[];

function parseSexpr(s: string): Sexpr {
  let i = 0;
  const skip = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function parse(): Sexpr {
    skip();
    if (s[i] === "(") {
      i++; const list: Sexpr[] = [];
      while (i < s.length && s[i] !== ")") { list.push(parse()); skip(); }
      i++; return list;
    }
    if (s[i] === '"') {
      i++; let str = "";
      while (i < s.length && s[i] !== '"') { if (s[i] === "\\") i++; str += s[i++] ?? ""; }
      i++; return str;
    }
    let a = ""; while (i < s.length && !/[\s()]/.test(s[i])) a += s[i++];
    return a;
  }
  skip(); return parse();
}

const sFind = (n: Sexpr | undefined, tag: string): Sexpr[] | undefined =>
  Array.isArray(n) ? (n.find((c) => Array.isArray(c) && c[0] === tag) as Sexpr[] | undefined) : undefined;
const sAll = (n: Sexpr | undefined, tag: string): Sexpr[][] =>
  Array.isArray(n) ? (n.filter((c) => Array.isArray(c) && c[0] === tag) as Sexpr[][]) : [];

function propOf(sym: Sexpr[], name: string): string {
  const p = sAll(sym, "property").find((x) => x[1] === name);
  return p && typeof p[2] === "string" ? p[2] : "";
}

function pinTypeFromKiCad(t: unknown): PinType {
  return t === "input" ? "in" : t === "output" ? "out"
    : t === "power_in" ? "power_in" : t === "power_out" ? "power_out" : "passive";
}

function collectKiCadPins(sym: Sexpr): UserPin[] {
  const out: UserPin[] = [];
  if (!Array.isArray(sym)) return out;
  for (const child of sym) {
    if (!Array.isArray(child)) continue;
    if (child[0] === "pin") {
      const at = sFind(child, "at");
      const name = sFind(child, "name");
      const num = sFind(child, "number");
      const x = at ? Number(at[1]) || 0 : 0;
      const y = at ? Number(at[2]) || 0 : out.length;
      out.push({
        num: typeof num?.[1] === "string" ? num[1] : String(out.length + 1),
        name: typeof name?.[1] === "string" ? name[1] : String(out.length + 1),
        side: x <= 0 ? "L" : "R",
        offset: Math.round(y * 7),
        type: pinTypeFromKiCad(child[1]),
      });
    } else if (child[0] === "symbol") {
      out.push(...collectKiCadPins(child));
    }
  }
  return out;
}

export function importKicadSymLib(text: string, existing: UserPart[] = runtimeUserParts): UserPart[] {
  const root = parseSexpr(text);
  const symbols = sAll(root, "symbol").filter((s) => typeof s[1] === "string" && collectKiCadPins(s).length);
  const out: UserPart[] = [];
  for (const sym of symbols) {
    const rawName = String(sym[1]).split(":").pop() || String(sym[1]);
    const reference = propOf(sym, "Reference") || rawName[0] || "U";
    const base = baseKindOf(reference);
    const pins = collectKiCadPins(sym);
    out.push(makeUserPart({
      name: rawName,
      cat: "User",
      baseKind: base,
      value: propOf(sym, "Value") || rawName,
      footprint: propOf(sym, "Footprint") || "Custom",
      desc: `Imported from .kicad_sym (${rawName})`,
      pins,
    }, [...existing, ...out]));
  }
  return out;
}

export const LIBRARY: LibPart[] = [
  // --- Passive ---
  { id: "R", name: "Resistor", cat: "Passive", kind: "R", value: "10k", footprint: "R_0805", desc: "Чип-резистор" },
  { id: "R_0402", name: "Resistor 0402", cat: "Passive", kind: "R", value: "10k", footprint: "R_0402", desc: "Чип-резистор 0402" },
  { id: "R_0603", name: "Resistor 0603", cat: "Passive", kind: "R", value: "1k", footprint: "R_0603", desc: "Чип-резистор 0603" },
  { id: "R_1206", name: "Resistor 1206", cat: "Passive", kind: "R", value: "100", footprint: "R_1206", desc: "Чип-резистор 1206" },
  { id: "R_pot", name: "Potentiometer", cat: "Passive", kind: "R", value: "10k", footprint: "Pot_Trim", desc: "Подстроечник" },
  { id: "C_cer", name: "Capacitor (ceramic)", cat: "Passive", kind: "C", value: "100n", footprint: "C_0805", desc: "Керамика" },
  { id: "C_0402", name: "Capacitor 0402", cat: "Passive", kind: "C", value: "100n", footprint: "C_0402", desc: "Керамика 0402" },
  { id: "C_0603", name: "Capacitor 0603", cat: "Passive", kind: "C", value: "1u", footprint: "C_0603", desc: "Керамика 0603" },
  { id: "C_1206", name: "Capacitor 1206", cat: "Passive", kind: "C", value: "10u", footprint: "C_1206", desc: "Керамика 1206" },
  { id: "C_el", name: "Capacitor (electrolytic)", cat: "Passive", kind: "C", value: "10u", footprint: "CP_Radial_D5", desc: "Электролит" },
  { id: "L", name: "Inductor", cat: "Passive", kind: "L", value: "10u", footprint: "L_0805", desc: "Дроссель" },
  { id: "L_power", name: "Power Inductor", cat: "Passive", kind: "L", value: "47u", footprint: "L_6x6", desc: "Силовой дроссель" },
  { id: "XTAL", name: "Crystal", cat: "Passive", kind: "L", value: "8MHz", footprint: "Crystal_HC49", desc: "Кварц" },
  // --- Diode ---
  { id: "D", name: "Diode 1N4148", cat: "Diode", kind: "D", value: "1N4148", footprint: "SOD-123", desc: "Сигнальный диод" },
  { id: "D_1n4007", name: "Rectifier 1N4007", cat: "Diode", kind: "D", value: "1N4007", footprint: "DO-41", desc: "Выпрямительный диод" },
  { id: "D_sch", name: "Schottky 1N5819", cat: "Diode", kind: "D", value: "1N5819", footprint: "DO-41", desc: "Шоттки" },
  { id: "LED", name: "LED", cat: "Diode", kind: "D", value: "LED", footprint: "LED_0805", desc: "Светодиод" },
  { id: "ZENER", name: "Zener 3V3", cat: "Diode", kind: "D", value: "BZX-3V3", footprint: "SOD-123", desc: "Стабилитрон" },
  { id: "TVS_smbj", name: "TVS SMBJ", cat: "Diode", kind: "D", value: "SMBJ5.0A", footprint: "SMB", desc: "TVS защита" },
  // --- Transistor ---
  { id: "Q_npn", name: "NPN 2N2222", cat: "Transistor", kind: "Q", value: "2N2222", footprint: "TO-92", desc: "NPN" },
  { id: "Q_bc547", name: "NPN BC547", cat: "Transistor", kind: "Q", value: "BC547", footprint: "TO-92", desc: "NPN малосигнальный" },
  { id: "Q_pnp", name: "PNP 2N2907", cat: "Transistor", kind: "Q", value: "2N2907", footprint: "TO-92", desc: "PNP" },
  { id: "Q_nmos", name: "N-MOSFET 2N7000", cat: "Transistor", kind: "Q", value: "2N7000", footprint: "TO-92", desc: "N-канал" },
  { id: "Q_ao3400", name: "N-MOSFET AO3400", cat: "Transistor", kind: "Q", value: "AO3400", footprint: "SOT-23", desc: "N-MOS логического уровня" },
  { id: "Q_irlz44n", name: "N-MOSFET IRLZ44N", cat: "Transistor", kind: "Q", value: "IRLZ44N", footprint: "TO-220", desc: "Силовой N-MOS" },
  { id: "Q_pmos", name: "P-MOSFET IRF9540", cat: "Transistor", kind: "Q", value: "IRF9540", footprint: "TO-220", desc: "P-канал" },
  // --- IC ---
  { id: "U_555", name: "Timer NE555", cat: "IC", kind: "U", value: "NE555", footprint: "DIP-8", desc: "Таймер 555" },
  { id: "U_opamp", name: "Op-amp LM358", cat: "IC", kind: "U", value: "LM358", footprint: "SOIC-8", desc: "Сдвоенный ОУ" },
  { id: "U_reg", name: "LDO AMS1117-3.3", cat: "IC", kind: "U", value: "AMS1117-3.3", footprint: "SOT-223", desc: "Стабилизатор" },
  { id: "U_lm317", name: "Regulator LM317", cat: "IC", kind: "U", value: "LM317", footprint: "TO-220", desc: "Регулируемый стабилизатор" },
  { id: "U_tl431", name: "Reference TL431", cat: "IC", kind: "U", value: "TL431", footprint: "SOT-23", desc: "Шунтирующий стабилизатор" },
  { id: "U_74hc595", name: "Shift register 74HC595", cat: "IC", kind: "U", value: "74HC595", footprint: "SOIC-16", desc: "Сдвиговый регистр" },
  { id: "U_ch340", name: "USB UART CH340", cat: "IC", kind: "U", value: "CH340C", footprint: "SOIC-16", desc: "USB-UART" },
  { id: "U_max485", name: "RS-485 MAX485", cat: "IC", kind: "U", value: "MAX485", footprint: "SOIC-8", desc: "RS-485 transceiver" },
  { id: "U_ds18b20", name: "Temperature DS18B20", cat: "IC", kind: "U", value: "DS18B20", footprint: "TO-92", desc: "1-Wire термометр" },
  { id: "U_pc817", name: "Optocoupler PC817", cat: "IC", kind: "U", value: "PC817", footprint: "DIP-4", desc: "Оптопара" },
  { id: "U_stm32", name: "MCU STM32F401", cat: "IC", kind: "U", value: "STM32F401", footprint: "LQFP-48", desc: "MCU ARM" },
  { id: "U_atmega", name: "MCU ATmega328P", cat: "IC", kind: "U", value: "ATmega328P", footprint: "TQFP-32", desc: "MCU AVR" },
  { id: "U_esp32", name: "MCU ESP32", cat: "IC", kind: "U", value: "ESP32-WROOM", footprint: "Module", desc: "MCU Wi-Fi" },
  // --- Connector ---
  { id: "J_hdr2", name: "Header 1x2", cat: "Connector", kind: "U", value: "Conn_1x2", footprint: "PinHeader_1x02", desc: "Разъём" },
  { id: "J_hdr3", name: "Header 1x3", cat: "Connector", kind: "U", value: "Conn_1x3", footprint: "PinHeader_1x03", desc: "Разъём" },
  { id: "J_hdr4", name: "Header 1x4", cat: "Connector", kind: "U", value: "Conn_1x4", footprint: "PinHeader_1x04", desc: "Разъём" },
  { id: "J_hdr5", name: "Header 1x5", cat: "Connector", kind: "U", value: "Conn_1x5", footprint: "PinHeader_1x05", desc: "Разъём" },
  { id: "J_hdr6", name: "Header 1x6", cat: "Connector", kind: "U", value: "Conn_1x6", footprint: "PinHeader_1x06", desc: "Разъём" },
  { id: "J_hdr8", name: "Header 1x8", cat: "Connector", kind: "U", value: "Conn_1x8", footprint: "PinHeader_1x08", desc: "Разъём" },
  { id: "J_jst", name: "JST-XH 1x2", cat: "Connector", kind: "U", value: "JST-XH-2", footprint: "JST_XH_B2B", desc: "Питание/датчик" },
  { id: "J_usb", name: "USB-C", cat: "Connector", kind: "U", value: "USB-C", footprint: "USB_C_Receptacle", desc: "USB-C" },
  { id: "J_microusb", name: "Micro USB", cat: "Connector", kind: "U", value: "MicroUSB", footprint: "USB_Micro-B", desc: "Micro USB" },
  { id: "J_barrel", name: "DC Jack", cat: "Connector", kind: "U", value: "DC_Jack", footprint: "BarrelJack", desc: "Разъём питания" },
];
