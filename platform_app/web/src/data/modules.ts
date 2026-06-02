// ============================================================
// Реестр модулей UCP — повторяет дерево модулей десктоп-приложения
// (см. core/module_factory + карту модулей проекта).
// Каждый узел = модуль с виджетом-вкладкой в рабочей области.
// ============================================================

export type ModuleKind =
  | "schematic" | "symbol" | "wire" | "netlist" | "spice"
  | "pcb" | "threed" | "part"
  | "pid" | "programs"
  | "protocol" | "sequence" | "packet" | "uart" | "analyzer"
  | "codegen" | "crc" | "lvgl" | "arduino" | "protocodegen"
  | "ui" | "ai" | "ota" | "firmproj" | "agent";

export interface ModuleDef {
  id: ModuleKind;
  name: string;          // имя в дереве
  title: string;         // widgetTitle()
  icon: string;          // эмодзи-иконка
  blurb: string;         // краткое описание модуля
  children?: ModuleDef[];
}

export const MODULE_TREE: ModuleDef[] = [
  {
    id: "schematic", name: "Schematic", title: "Schematic Editor", icon: "📐",
    blurb: "Рисование принципиальных схем: размещение компонентов, авто-разводка проводов, нетлист.",
    children: [
      { id: "symbol",  name: "Symbol Editor", title: "Symbol Editor", icon: "✏️", blurb: "Редактор условных графических обозначений (УГО) компонентов." },
      { id: "wire",    name: "Wire Tool",     title: "Wire Tool",     icon: "〰️", blurb: "Инструмент ортогональной разводки проводов и шин." },
      { id: "netlist", name: "Netlist",       title: "Netlist",       icon: "🕸️", blurb: "Список цепей: связи pin↔pin, экспорт для SPICE и PCB." },
      { id: "spice",   name: "SPICE",         title: "SPICE Simulator", icon: "📈", blurb: "Запуск ngspice-симуляции, просмотр осциллограмм." },
    ],
  },
  {
    id: "pcb", name: "PCB Layout", title: "PCB Layout", icon: "🟩",
    blurb: "Трассировка дорожек, размещение посадочных мест, ratsnest, DRC, экспорт Gerber.",
  },
  {
    id: "threed", name: "3D Editor", title: "3D Editor", icon: "🧊",
    blurb: "3D-визуализация платы и корпуса, CSG-операции, экспорт STEP/STL.",
    children: [
      { id: "part", name: "Part Editor", title: "Part Editor", icon: "🔩", blurb: "Параметрическое моделирование деталей (примитивы + булевы операции)." },
    ],
  },
  {
    id: "pid", name: "PID Tuner", title: "PID Tuner", icon: "🎛️",
    blurb: "Проектирование и симуляция многоканальных ПИД-регуляторов с графиком в реальном времени.",
  },
  {
    id: "programs", name: "Program System", title: "Program System", icon: "⚙️",
    blurb: "Готовые встраиваемые программы: теплица, вентилятор, стиральная машина — конечные автоматы.",
  },
  {
    id: "protocol", name: "Protocol", title: "Protocol Designer", icon: "🔌",
    blurb: "Проектирование протоколов UART/I2C/SPI: диаграммы, редактор пакетов, анализатор.",
    children: [
      { id: "sequence", name: "Sequence Diagram", title: "Sequence Diagram", icon: "↔️", blurb: "Диаграммы последовательностей обмена между устройствами." },
      { id: "packet",   name: "Packet Editor",    title: "Packet Editor",    icon: "📦", blurb: "Конструктор бинарных пакетов: поля, длины, CRC." },
      { id: "uart",     name: "UART Monitor",     title: "UART Monitor",     icon: "🖥️", blurb: "Монитор последовательного порта: hex/ascii, таймстампы." },
      { id: "analyzer", name: "Protocol Analyzer",title: "Protocol Analyzer",icon: "🔬", blurb: "Декодирование захваченного трафика по описанию протокола." },
    ],
  },
  {
    id: "codegen", name: "Code Generator", title: "Code Generator", icon: "💻",
    blurb: "Генерация кода: CRC-таблицы, LVGL UI, Arduino/ESP-IDF, парсеры протоколов.",
    children: [
      { id: "crc",          name: "CRC Calculator", title: "CRC Calculator",         icon: "#️⃣", blurb: "Расчёт CRC и генерация таблиц/функций под выбранный полином." },
      { id: "lvgl",         name: "LVGL Export",    title: "LVGL Export",            icon: "🖼️", blurb: "Экспорт UI-дизайна в C-код LVGL." },
      { id: "arduino",      name: "Arduino Export", title: "Arduino/ESP-IDF Export", icon: "🟦", blurb: "Генерация скетча/проекта под Arduino или ESP-IDF." },
      { id: "protocodegen", name: "Protocol Code Gen", title: "Protocol Code Gen",   icon: "⚡", blurb: "Кодогенерация сериализаторов/парсеров из описания протокола." },
    ],
  },
  {
    id: "ui", name: "UI Designer", title: "UI Designer", icon: "🎨",
    blurb: "Визуальный дизайнер экранов LVGL: 15 типов виджетов, темы, навигация, экспорт C.",
  },
  {
    id: "ai", name: "AI Schematic", title: "AI Schematic", icon: "🤖",
    blurb: "Генерация схемы из текстового описания через Claude API.",
  },
  {
    id: "ota", name: "OTA Flash", title: "OTA Flash", icon: "📡",
    blurb: "Прошивка ESP32 по COM-порту через esptool с прогрессом.",
  },
  {
    id: "firmproj", name: "Firmware Project", title: "Firmware Project", icon: "📁",
    blurb: "Визуальное ведение прошивок (сушилка/паяльник): дерево модулей и статусов, запрос к агенту.",
  },
  {
    id: "agent", name: "Agent Runner", title: "Agent Runner", icon: "🦾",
    blurb: "Запуск Claude-агента в git-worktree на задачу из Firmware Project: лог, diff, кнопки apply.",
  },
];

// Плоский индекс по id
export const MODULE_INDEX: Record<string, ModuleDef> = {};
(function flatten(list: ModuleDef[]) {
  for (const m of list) {
    MODULE_INDEX[m.id] = m;
    if (m.children) flatten(m.children);
  }
})(MODULE_TREE);

export const MODULE_COUNT = Object.keys(MODULE_INDEX).length;
