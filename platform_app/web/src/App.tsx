import { useCallback, useEffect, useRef, useState } from "react";
import { UcpContext, type UcpState } from "./store.ts";
import type { ModuleKind } from "./data/modules.ts";
import { MenuBar } from "./components/MenuBar.tsx";
import { ModuleTree } from "./components/ModuleTree.tsx";
import { Workspace } from "./components/Workspace.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { AboutDialog, ShortcutsDialog } from "./components/Dialogs.tsx";
import { initCore } from "./core/ucpCore.ts";

export function App() {
  const [projectName, setProjectName] = useState("Untitled Project");
  const [modified, setModified] = useState(false);
  const [selected, setSelected] = useState<ModuleKind | null>(null);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [treeVisible, setTreeVisible] = useState(true);
  const [status, setStatusState] = useState("New project created");
  const [dialog, setDialog] = useState<"about" | "shortcuts" | null>(null);
  const clearTimer = useRef<number | null>(null);

  // тема → data-attribute на <html>
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  // загрузка вычислительного ядра (WASM, иначе JS-фолбэк)
  useEffect(() => { void initCore(); }, []);

  // статус с авто-очисткой через 5с (как onStatusMessage в Qt)
  const setStatus = useCallback((msg: string) => {
    setStatusState(msg);
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setStatusState("Ready"), 5000);
  }, []);

  const newProject = useCallback(() => {
    setProjectName("Untitled Project"); setModified(false); setSelected(null);
    setStatus("New project created");
  }, [setStatus]);

  const select = useCallback((id: ModuleKind) => {
    setSelected(id);
  }, []);

  const state: UcpState = {
    projectName, modified, selected, theme, treeVisible, status,
    setStatus, select,
    setTheme: setThemeState,
    toggleTree: () => setTreeVisible((v) => !v),
    newProject,
    setProjectName,
    markModified: () => setModified(true),
  };

  // горячие клавиши главного окна
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "n") { e.preventDefault(); newProject(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); setStatus(`Saved: ${projectName}.ucp`); }
      else if (e.ctrlKey && e.key === "\\") { e.preventDefault(); setTreeVisible((v) => !v); }
      else if (e.ctrlKey && e.key === "/") { e.preventDefault(); setDialog("shortcuts"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newProject, setStatus, projectName]);

  return (
    <UcpContext.Provider value={state}>
      <div className="app">
        <MenuBar
          onAbout={() => setDialog("about")}
          onShortcuts={() => setDialog("shortcuts")}
          onHelp={() => setStatus("Documentation: см. wiki/ в репозитории")}
        />
        <div className={`app-body${treeVisible ? "" : " tree-hidden"}`}>
          {treeVisible && <ModuleTree />}
          <Workspace />
        </div>
        <StatusBar />
      </div>
      {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} />}
      {dialog === "shortcuts" && <ShortcutsDialog onClose={() => setDialog(null)} />}
    </UcpContext.Provider>
  );
}
