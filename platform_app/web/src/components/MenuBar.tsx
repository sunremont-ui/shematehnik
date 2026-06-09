import { useEffect, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_TREE, type ModuleDef } from "../data/modules.ts";

interface Item {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  sep?: boolean;
  checked?: boolean;
  disabled?: boolean;
}

function flat(list: ModuleDef[], acc: ModuleDef[] = []): ModuleDef[] {
  for (const m of list) { acc.push(m); if (m.children) flat(m.children, acc); }
  return acc;
}

export function MenuBar({ onAbout, onShortcuts, onHelp, onSave, onOpen }: {
  onAbout: () => void; onShortcuts: () => void; onHelp: () => void;
  onSave: () => void; onOpen: () => void;
}) {
  const ucp = useUcp();
  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const menus: Record<string, Item[]> = {
    File: [
      { label: "New Project", shortcut: "Ctrl+N", onClick: () => ucp.newProject() },
      { label: "Open…", shortcut: "Ctrl+O", onClick: onOpen },
      { label: "Import netlist (.net)…", onClick: onOpen },
      { label: "Save", shortcut: "Ctrl+S", onClick: onSave },
      { label: "", sep: true },
      { label: "Exit", shortcut: "Ctrl+Q", onClick: () => ucp.setStatus("Exit недоступен в браузере") },
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", onClick: ucp.undo, disabled: !ucp.canUndo },
      { label: "Redo", shortcut: "Ctrl+Y", onClick: ucp.redo, disabled: !ucp.canRedo },
    ],
    Modules: flat(MODULE_TREE).map((m) => ({
      label: `Add ${m.name}`,
      onClick: () => { ucp.select(m.id); ucp.setStatus(`Module added: ${m.name}`); },
    })),
    View: [
      { label: "Dark Theme", checked: ucp.theme === "dark", onClick: () => ucp.setTheme("dark") },
      { label: "Light Theme", checked: ucp.theme === "light", onClick: () => ucp.setTheme("light") },
      { label: "", sep: true },
      { label: "Toggle Module Tree", shortcut: "Ctrl+\\", onClick: () => ucp.toggleTree() },
    ],
    Help: [
      { label: "Documentation", shortcut: "F1", onClick: onHelp },
      { label: "Keyboard Shortcuts", shortcut: "Ctrl+/", onClick: onShortcuts },
      { label: "", sep: true },
      { label: "About UCP", onClick: onAbout },
    ],
  };

  return (
    <div className="menubar" ref={barRef} role="menubar">
      <span className="brand">⊞ UCP</span>
      {Object.entries(menus).map(([name, items]) => (
        <div key={name} className={`menu${open === name ? " open" : ""}`}>
          <button
            aria-haspopup="true" aria-expanded={open === name}
            onClick={() => setOpen(open === name ? null : name)}
            onMouseEnter={() => open && setOpen(name)}
          >
            {name}
          </button>
          {open === name && (
            <div className={`menu-pop${items.length > 12 ? " scroll" : ""}`}>
              {items.map((it, i) =>
                it.sep ? (
                  <div className="sep" key={i} />
                ) : (
                  <button
                    key={i}
                    disabled={it.disabled}
                    style={it.disabled ? { opacity: 0.4, cursor: "default" } : undefined}
                    onClick={() => { if (it.disabled) return; it.onClick?.(); setOpen(null); }}
                  >
                    <span>{it.checked ? "● " : ""}{it.label}</span>
                    {it.shortcut && <span className="sc">{it.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
