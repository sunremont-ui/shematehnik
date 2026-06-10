// ============================================================
// Библиотека компонентов — именованные детали с типом/значением/футпринтом.
// kind задаёт геометрию символа/пинов (см. pinsOf/pinOffset).
// ============================================================
export interface LibPart {
  id: string;
  name: string;
  cat: string;       // категория для группировки
  kind: string;      // R | C | L | D | Q | U
  value: string;
  footprint: string;
  desc: string;
}

export const LIBRARY: LibPart[] = [
  // --- Passive ---
  { id: "R", name: "Resistor", cat: "Passive", kind: "R", value: "10k", footprint: "R_0805", desc: "Чип-резистор" },
  { id: "R_0603", name: "Resistor 0603", cat: "Passive", kind: "R", value: "1k", footprint: "R_0603", desc: "Чип-резистор 0603" },
  { id: "R_pot", name: "Potentiometer", cat: "Passive", kind: "R", value: "10k", footprint: "Pot_Trim", desc: "Подстроечник" },
  { id: "C_cer", name: "Capacitor (ceramic)", cat: "Passive", kind: "C", value: "100n", footprint: "C_0805", desc: "Керамика" },
  { id: "C_el", name: "Capacitor (electrolytic)", cat: "Passive", kind: "C", value: "10u", footprint: "CP_Radial_D5", desc: "Электролит" },
  { id: "L", name: "Inductor", cat: "Passive", kind: "L", value: "10u", footprint: "L_0805", desc: "Дроссель" },
  { id: "XTAL", name: "Crystal", cat: "Passive", kind: "L", value: "8MHz", footprint: "Crystal_HC49", desc: "Кварц" },
  // --- Diode ---
  { id: "D", name: "Diode 1N4148", cat: "Diode", kind: "D", value: "1N4148", footprint: "SOD-123", desc: "Сигнальный диод" },
  { id: "D_sch", name: "Schottky 1N5819", cat: "Diode", kind: "D", value: "1N5819", footprint: "DO-41", desc: "Шоттки" },
  { id: "LED", name: "LED", cat: "Diode", kind: "D", value: "LED", footprint: "LED_0805", desc: "Светодиод" },
  { id: "ZENER", name: "Zener 3V3", cat: "Diode", kind: "D", value: "BZX-3V3", footprint: "SOD-123", desc: "Стабилитрон" },
  // --- Transistor ---
  { id: "Q_npn", name: "NPN 2N2222", cat: "Transistor", kind: "Q", value: "2N2222", footprint: "TO-92", desc: "NPN" },
  { id: "Q_pnp", name: "PNP 2N2907", cat: "Transistor", kind: "Q", value: "2N2907", footprint: "TO-92", desc: "PNP" },
  { id: "Q_nmos", name: "N-MOSFET 2N7000", cat: "Transistor", kind: "Q", value: "2N7000", footprint: "TO-92", desc: "N-канал" },
  { id: "Q_pmos", name: "P-MOSFET IRF9540", cat: "Transistor", kind: "Q", value: "IRF9540", footprint: "TO-220", desc: "P-канал" },
  // --- IC ---
  { id: "U_555", name: "Timer NE555", cat: "IC", kind: "U", value: "NE555", footprint: "DIP-8", desc: "Таймер 555" },
  { id: "U_opamp", name: "Op-amp LM358", cat: "IC", kind: "U", value: "LM358", footprint: "SOIC-8", desc: "Сдвоенный ОУ" },
  { id: "U_reg", name: "LDO AMS1117-3.3", cat: "IC", kind: "U", value: "AMS1117-3.3", footprint: "SOT-223", desc: "Стабилизатор" },
  { id: "U_stm32", name: "MCU STM32F401", cat: "IC", kind: "U", value: "STM32F401", footprint: "LQFP-48", desc: "MCU ARM" },
  { id: "U_atmega", name: "MCU ATmega328P", cat: "IC", kind: "U", value: "ATmega328P", footprint: "TQFP-32", desc: "MCU AVR" },
  { id: "U_esp32", name: "MCU ESP32", cat: "IC", kind: "U", value: "ESP32-WROOM", footprint: "Module", desc: "MCU Wi-Fi" },
  // --- Connector ---
  { id: "J_hdr2", name: "Header 1x2", cat: "Connector", kind: "U", value: "Conn_1x2", footprint: "PinHeader_1x02", desc: "Разъём" },
  { id: "J_usb", name: "USB-C", cat: "Connector", kind: "U", value: "USB-C", footprint: "USB_C_Receptacle", desc: "USB-C" },
];
