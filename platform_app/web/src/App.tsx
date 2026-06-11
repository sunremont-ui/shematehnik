import { useCallback, useEffect, useRef, useState } from "react";
import { UcpContext, type UcpState } from "./store.ts";
import type { ModuleKind } from "./data/modules.ts";
import { MenuBar } from "./components/MenuBar.tsx";
import { ModuleTree } from "./components/ModuleTree.tsx";
import { Workspace } from "./components/Workspace.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { AboutDialog, ShortcutsDialog } from "./components/Dialogs.tsx";
import { initCore } from "./core/ucpCore.ts";
import {
  emptyProject, serialize, deserialize, importNetlist, importKicadSch, nextRef,
  type SchComponent, type UcpProject,
} from "./project.ts";

const LS_PROJECT = "ucp.project";
const LS_THEME = "ucp.theme";

function loadStoredProject(): UcpProject {
  try {
    const raw = localStorage.getItem(LS_PROJECT);
    if (raw) return deserialize(raw);
  } catch { /* ignore corrupt storage */ }
  return emptyProject();
}

export function App() {
  const [project, setProject] = useState<UcpProject>(loadStoredProject);
  const [modified, setModified] = useState(false);
  const [selected, setSelected] = useState<ModuleKind | null>(null);
  const [theme, setThemeState] = useState<"dark" | "light">(
    () => (localStorage.getItem(LS_THEME) === "light" ? "light" : "dark"));
  const [treeVisible, setTreeVisible] = useState(true);
  const [status, setStatusState] = useState("New project created");
  const [dialog, setDialog] = useState<"about" | "shortcuts" | null>(null);
  const clearTimer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem(LS_THEME, theme); }, [theme]);
  useEffect(() => { void initCore(); }, []);

  // Автосохранение проекта в localStorage (debounced) — переживает перезагрузку.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = window.setTimeout(() => {
      try { localStorage.setItem(LS_PROJECT, serialize(project)); } catch { /* quota */ }
    }, 800);
    return () => window.clearTimeout(t);
  }, [project]);

  const setStatus = useCallback((msg: string) => {
    setStatusState(msg);
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setStatusState("Ready"), 5000);
  }, []);

  // История undo/redo. Чекпоинт ставится с debounce → быстрые drag-обновления
  // схлопываются в один шаг отмены.
  const past = useRef<UcpProject[]>([]);
  const future = useRef<UcpProject[]>([]);
  const prevProject = useRef<UcpProject>(project);
  const skipHistory = useRef(false);
  const [histVer, setHistVer] = useState(0);

  useEffect(() => {
    if (skipHistory.current) { skipHistory.current = false; prevProject.current = project; return; }
    const t = window.setTimeout(() => {
      if (prevProject.current !== project) {
        past.current.push(prevProject.current);
        if (past.current.length > 50) past.current.shift();
        future.current = [];
        prevProject.current = project;
        setHistVer((v) => v + 1);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [project]);

  const undo = useCallback(() => {
    // дозафиксировать незакоммиченное изменение, затем откатить
    if (prevProject.current !== project) { past.current.push(prevProject.current); prevProject.current = project; }
    const p = past.current.pop();
    if (!p) return;
    future.current.push(project);
    skipHistory.current = true; prevProject.current = p;
    setProject(p); setModified(true); setStatus("Undo"); setHistVer((v) => v + 1);
  }, [project, setStatus]);

  const redo = useCallback(() => {
    const p = future.current.pop();
    if (!p) return;
    past.current.push(project);
    skipHistory.current = true; prevProject.current = p;
    setProject(p); setModified(true); setStatus("Redo"); setHistVer((v) => v + 1);
  }, [project, setStatus]);

  const newProject = useCallback(() => {
    setProject(emptyProject()); setModified(false); setSelected(null);
    setStatus("New project created");
  }, [setStatus]);

  const saveProject = useCallback(() => {
    const blob = new Blob([serialize(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.name}.ucp`;
    a.click();
    URL.revokeObjectURL(url);
    setModified(false);
    setStatus(`Saved: ${project.name}.ucp`);
  }, [project, setStatus]);

  const openFile = useCallback((file: File) => {
    const base = file.name.replace(/\.[^.]+$/, "");
    const kind = /\.net$/i.test(file.name) ? "net" : /\.kicad_sch$/i.test(file.name) ? "sch" : "ucp";
    file.text().then((text) => {
      try {
        const p = kind === "net" ? importNetlist(text, base)
          : kind === "sch" ? importKicadSch(text, base)
          : deserialize(text);
        setProject(p); setModified(false);
        const verb = kind === "ucp" ? "Opened" : "Imported";
        setStatus(`${verb}: ${file.name} (${p.components.length} comp, ${p.wires.length} wires)`);
      } catch {
        setStatus(`Error: ${file.name} — invalid ${kind === "ucp" ? ".ucp" : kind === "net" ? "netlist" : ".kicad_sch"}`);
      }
    });
  }, [setStatus]);

  const state: UcpState = {
    projectName: project.name,
    modified, selected, theme, treeVisible, status,
    setStatus,
    select: (id) => setSelected(id),
    setTheme: setThemeState,
    toggleTree: () => setTreeVisible((v) => !v),
    newProject,
    setProjectName: (name) => { setProject((p) => ({ ...p, name })); setModified(true); },
    markModified: () => setModified(true),

    project,
    addComponent: (kind, value, footprint) => setProject((p) => {
      const ref = nextRef(p.components, kind);
      const comp: SchComponent = { id: `c${Date.now()}`, ref, kind, value, x: 120, y: 80, ...(footprint ? { footprint } : {}) };
      setModified(true); setStatus(`Placed ${ref}`);
      return { ...p, components: [...p.components, comp] };
    }),
    updateComponent: (id, patch) => setProject((p) => ({
      ...p, components: p.components.map((c) => c.id === id ? { ...c, ...patch } : c),
    })),
    removeComponent: (id) => setProject((p) => {
      const comp = p.components.find((c) => c.id === id);
      setModified(true);
      return {
        ...p,
        components: p.components.filter((c) => c.id !== id),
        wires: comp ? p.wires.filter((w) => w.from.ref !== comp.ref && w.to.ref !== comp.ref) : p.wires,
      };
    }),
    addWire: (from, to) => setProject((p) => {
      if (from.ref === to.ref && from.pin === to.pin) return p;
      const dup = p.wires.some((w) =>
        (w.from.ref === from.ref && w.from.pin === from.pin && w.to.ref === to.ref && w.to.pin === to.pin) ||
        (w.from.ref === to.ref && w.from.pin === to.pin && w.to.ref === from.ref && w.to.pin === from.pin));
      if (dup) return p;
      setModified(true); setStatus(`Wire ${from.ref}.${from.pin} → ${to.ref}.${to.pin}`);
      return { ...p, wires: [...p.wires, { from, to }] };
    }),
    removeWire: (index) => { setProject((p) => ({ ...p, wires: p.wires.filter((_, i) => i !== index) })); setModified(true); },
    setLabel: (ref, pin, net) => setProject((p) => {
      const others = p.labels.filter((l) => !(l.ref === ref && l.pin === pin));
      setModified(true); setStatus(net ? `Net "${net}" on ${ref}.${pin}` : `Label removed ${ref}.${pin}`);
      return { ...p, labels: net ? [...others, { ref, pin, net }] : others };
    }),
    setTracks: (tracks) => { setProject((p) => ({ ...p, tracks })); setModified(true); },
    setBoard: (w, h) => { setProject((p) => ({ ...p, board: { w, h } })); setModified(true); },
    loadProject: (p) => { setProject(p); setModified(false); },

    undo, redo,
    canUndo: (void histVer, past.current.length > 0),
    canRedo: future.current.length > 0,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "n") { e.preventDefault(); newProject(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); saveProject(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); fileInput.current?.click(); }
      else if (e.ctrlKey && (e.key === "z" || e.key === "Z") && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      else if (e.ctrlKey && e.key === "\\") { e.preventDefault(); setTreeVisible((v) => !v); }
      else if (e.ctrlKey && e.key === "/") { e.preventDefault(); setDialog("shortcuts"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newProject, saveProject, undo, redo]);

  return (
    <UcpContext.Provider value={state}>
      <div className="app">
        <MenuBar
          onAbout={() => setDialog("about")}
          onShortcuts={() => setDialog("shortcuts")}
          onHelp={() => setStatus("Documentation: см. wiki/ в репозитории")}
          onSave={saveProject}
          onOpen={() => fileInput.current?.click()}
        />
        <div className={`app-body${treeVisible ? "" : " tree-hidden"}`}>
          {treeVisible && <ModuleTree />}
          <Workspace />
        </div>
        <StatusBar />
      </div>
      <input
        ref={fileInput} type="file" accept=".ucp,.net,.kicad_sch,application/json" style={{ display: "none" }}
        aria-label="Open .ucp project file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }}
      />
      {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} />}
      {dialog === "shortcuts" && <ShortcutsDialog onClose={() => setDialog(null)} />}
    </UcpContext.Provider>
  );
}
