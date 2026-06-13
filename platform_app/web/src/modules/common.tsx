import type { ModuleDef } from "../data/modules.ts";

export function PanelHead({ mod, right }: { mod: ModuleDef; right?: React.ReactNode }) {
  return (
    <>
      <div className="panel-head">
        <span className="ico">{mod.icon}</span>
        <h1>{mod.title}</h1>
        <span className="tag">{mod.id}</span>
        <span style={{ flex: 1 }} />
        {right}
      </div>
      <p className="panel-sub">{mod.blurb}</p>
    </>
  );
}

// Универсальная панель-заглушка для модулей без отдельной реализации.
export function GenericPanel({ mod, features }: { mod: ModuleDef; features?: string[] }) {
  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn">Open in desktop ↗</button>} />
      <div className="grid cols2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Возможности</h3>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            {(features ?? defaultFeatures(mod.id)).map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Статус веб-порта</h3>
          <div className="chip"><span className="dot warn" /> Представление модуля</div>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Этот модуль перенесён в веб-оболочку как навигируемая панель.
            Интерактивная логика портируется итеративно из C++/Qt-реализации
            <code> modules/{mod.id}</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function defaultFeatures(id: string): string[] {
  const map: Record<string, string[]> = {
    symbol: ["Сетка и привязка", "Пины с типами", "Импорт/экспорт УГО"],
    wire: ["Ортогональная разводка", "Шины и метки цепей", "Авто-junction"],
    netlist: ["pin↔pin связи", "Экспорт в SPICE", "Экспорт в PCB"],
    spice: ["Транзиент/AC анализ", "Просмотр осциллограмм", "ngspice backend"],
    filter: ["RC/RLC/active topologies", "Bode magnitude/phase", "CSV export"],
    pcb: ["Слои F.Cu/B.Cu/Edge.Cuts", "Ratsnest", "DRC", "Экспорт Gerber"],
    threed: ["CSG (union/subtract/intersect)", "Экспорт STEP/STL", "Просмотр платы+корпуса"],
    part: ["Примитивы (box/cyl)", "Булевы операции", "Параметры детали"],
    sequence: ["Lifelines устройств", "Сообщения с задержками", "Экспорт PNG"],
    packet: ["Поля и битовые маски", "CRC-поля", "Предпросмотр байтов"],
    uart: ["Hex/ASCII", "Таймстампы", "Открытие COM-порта"],
    analyzer: ["Декодер по описанию", "Подсветка полей", "Фильтры"],
    logic: ["VCD/CSV import", "Timing cursors", "UART/I2C/SPI decode"],
    lvgl: ["Экспорт экранов в C", "Темы LVGL", "Навигация между экранами"],
    arduino: ["Скетч Arduino", "Проект ESP-IDF", "Пины и периферия"],
    protocodegen: ["Сериализаторы", "Парсеры", "Из описания протокола"],
    pinplanner: ["MCU pinouts", "Conflict checks", "Generated init code"],
    eecalc: ["Voltage divider", "LED resistor", "IPC-2221 trace width", "LDO thermal"],
    powerbudget: ["BOM current", "Power rail grouping", "Overload warnings"],
    regmap: ["Register editor", "Bit masks", "C header + Markdown"],
    firmproj: ["Дерево прошивок", "Статусы модулей", "Запрос к агенту"],
    agent: ["git worktree на задачу", "stream-json лог", "diff + apply"],
  };
  return map[id] ?? ["Просмотр", "Редактирование", "Экспорт"];
}
