import { MODULE_COUNT } from "../data/modules.ts";

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <header>{title}</header>
        <div className="body">{children}</div>
        <footer><button className="btn primary" onClick={onClose}>OK</button></footer>
      </div>
    </div>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="About Universal Controller Platform" onClose={onClose}>
      <h2 style={{ color: "var(--accent-soft)", marginTop: 0 }}>Universal Controller Platform</h2>
      <p className="muted">Version 3.0 — web frontend</p>
      <hr style={{ borderColor: "var(--border)" }} />
      <p>Модульное приложение для сквозного проектирования электронных устройств.
        Заменяет KiCad + SquareLine Studio + Proteus в едином инструменте.</p>
      <p><b>{MODULE_COUNT} модулей:</b> Schematic, SPICE, PCB, 3D, PID, Programs, Protocol,
        CodeGen, UI Designer, AI Schematic, OTA Flash, Firmware Project, Agent Runner.</p>
      <hr style={{ borderColor: "var(--border)" }} />
      <p className="muted">React · TypeScript · Vite — порт Qt6/C++17 десктоп-версии.</p>
    </Dialog>
  );
}

const SHORTCUTS: [string, string][] = [
  ["New Project", "Ctrl+N"], ["Open Project", "Ctrl+O"], ["Save Project", "Ctrl+S"],
  ["Command Palette", "Ctrl+K"], ["Toggle Module Tree", "Ctrl+\\"], ["Show Shortcuts", "Ctrl+/"],
  ["Undo / Redo", "Ctrl+Z / Ctrl+Y"], ["Delete selected", "Del"], ["Cancel wire", "Esc"],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keyboard Shortcuts" onClose={onClose}>
      <table className="tbl">
        <thead><tr><th>Action</th><th>Shortcut</th></tr></thead>
        <tbody>
          {SHORTCUTS.map(([a, s]) => <tr key={a}><td>{a}</td><td><span className="kbd">{s}</span></td></tr>)}
        </tbody>
      </table>
    </Dialog>
  );
}
