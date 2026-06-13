import { useEffect, useMemo, useRef, useState } from "react";
import { MODULE_TREE, type ModuleDef } from "../data/modules.ts";
import { useUcp } from "../store.ts";

function flatModules(list: ModuleDef[], out: ModuleDef[] = []): ModuleDef[] {
  for (const mod of list) {
    out.push(mod);
    if (mod.children) flatModules(mod.children, out);
  }
  return out;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ucp = useUcp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const modules = useMemo(() => flatModules(MODULE_TREE), []);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const moduleItems = modules.map((mod) => ({
      id: `module:${mod.id}`,
      title: mod.name,
      subtitle: mod.title,
      run: () => {
        ucp.select(mod.id);
        ucp.setStatus(`Module added: ${mod.name}`);
      },
      haystack: `${mod.name} ${mod.title} ${mod.blurb}`.toLowerCase(),
    }));
    const actionItems = [
      { id: "action:new", title: "New Project", subtitle: "File", run: ucp.newProject, haystack: "new project file" },
      { id: "action:tree", title: "Toggle Module Tree", subtitle: "View", run: ucp.toggleTree, haystack: "toggle module tree view" },
      { id: "action:dark", title: "Dark Theme", subtitle: "View", run: () => ucp.setTheme("dark"), haystack: "dark theme view" },
      { id: "action:light", title: "Light Theme", subtitle: "View", run: () => ucp.setTheme("light"), haystack: "light theme view" },
    ];
    const all = [...moduleItems, ...actionItems];
    return q ? all.filter((item) => item.haystack.includes(q)) : all;
  }, [modules, query, ucp]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(Math.max(0, items.length - 1), i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[active];
        if (item) { item.run(); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items, onClose, open]);

  if (!open) return null;
  const shown = items.slice(0, 12);
  return (
    <div role="dialog" aria-modal="true" aria-label="Command palette"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(1,4,9,0.62)", display: "grid", placeItems: "start center", paddingTop: "12vh" }}>
      <div className="card" style={{ width: "min(680px, calc(100vw - 32px))", padding: 0, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          placeholder="Search modules or commands"
          aria-label="Search commands"
          style={{ width: "100%", border: 0, borderBottom: "1px solid var(--border)", borderRadius: 0, padding: "14px 16px", fontSize: 15 }}
        />
        <div style={{ maxHeight: 420, overflow: "auto", padding: 6 }}>
          {shown.map((item, i) => (
            <button key={item.id}
              className={`btn${i === active ? " primary" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => { item.run(); onClose(); }}
              style={{ width: "100%", justifyContent: "space-between", marginBottom: 4, padding: "9px 10px" }}>
              <span>{item.title}</span>
              <span className="muted" style={{ fontSize: 12 }}>{item.subtitle}</span>
            </button>
          ))}
          {!shown.length && <div className="muted" style={{ padding: 14 }}>No commands</div>}
        </div>
      </div>
    </div>
  );
}
