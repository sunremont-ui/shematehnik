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
  emptyProject, serialize, deserialize, nextRef,
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
    file.text().then((text) => {
      try {
        const p = deserialize(text);
        setProject(p); setModified(false);
        setStatus(`Opened: ${file.name} (${p.components.length} components)`);
      } catch {
        setStatus(`Error: ${file.name} is not a valid .ucp file`);
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
    addComponent: (kind, value) => setProject((p) => {
      const ref = nextRef(p.components, kind);
      const comp: SchComponent = { id: `c${Date.now()}`, ref, kind, value, x: 120, y: 80 };
      setModified(true); setStatus(`Placed ${ref}`);
      return { ...p, components: [...p.components, comp] };
    }),
    updateComponent: (id, patch) => setProject((p) => ({
      ...p, components: p.components.map((c) => c.id === id ? { ...c, ...patch } : c),
    })),
    removeComponent: (id) => { setProject((p) => ({ ...p, components: p.components.filter((c) => c.id !== id) })); setModified(true); },
    loadProject: (p) => { setProject(p); setModified(false); },
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "n") { e.preventDefault(); newProject(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); saveProject(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); fileInput.current?.click(); }
      else if (e.ctrlKey && e.key === "\\") { e.preventDefault(); setTreeVisible((v) => !v); }
      else if (e.ctrlKey && e.key === "/") { e.preventDefault(); setDialog("shortcuts"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newProject, saveProject]);

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
        ref={fileInput} type="file" accept=".ucp,application/json" style={{ display: "none" }}
        aria-label="Open .ucp project file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }}
      />
      {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} />}
      {dialog === "shortcuts" && <ShortcutsDialog onClose={() => setDialog(null)} />}
    </UcpContext.Provider>
  );
}
