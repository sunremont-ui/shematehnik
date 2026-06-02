import { useUcp } from "../store.ts";
import { MODULE_COUNT } from "../data/modules.ts";
import { ModuleView } from "../modules/index.tsx";

export function Workspace() {
  const ucp = useUcp();
  return (
    <div className="workspace">
      {ucp.selected ? (
        <ModuleView id={ucp.selected} />
      ) : (
        <div className="ws-empty">
          <div className="big">⊞</div>
          <h2 style={{ margin: 0 }}>Universal Controller Platform</h2>
          <p style={{ maxWidth: "48ch" }}>
            Модульный инструмент сквозного проектирования электронных устройств.
            Выберите модуль в дереве слева — доступно {MODULE_COUNT} модулей.
          </p>
          <p className="muted">Schematic · PCB · 3D · PID · Protocol · CodeGen · UI Designer · AI · OTA</p>
        </div>
      )}
    </div>
  );
}
