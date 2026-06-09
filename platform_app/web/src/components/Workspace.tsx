import { useEffect, useRef } from "react";
import { useUcp } from "../store.ts";
import { MODULE_COUNT, type ModuleKind } from "../data/modules.ts";
import { ModuleView } from "../modules/index.tsx";

// Keep-alive как QStackedWidget: однажды открытый модуль остаётся
// смонтированным (его локальное состояние переживает переключение вкладок),
// невыбранные просто скрыты через display:none.
export function Workspace() {
  const ucp = useUcp();
  const visited = useRef<Set<ModuleKind>>(new Set());
  if (ucp.selected) visited.current.add(ucp.selected);

  return (
    <div className="workspace">
      {ucp.selected == null && (
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
      {[...visited.current].map((id) => (
        <KeepAlive key={id} visible={id === ucp.selected}>
          <ModuleView id={id} />
        </KeepAlive>
      ))}
    </div>
  );
}

function KeepAlive({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  // canvas/SVG требуют ненулевого размера при первом рендере — поэтому
  // используем display:none, а не размонтирование.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.style.display = visible ? "block" : "none"; }, [visible]);
  return <div ref={ref} style={{ display: visible ? "block" : "none" }}>{children}</div>;
}
