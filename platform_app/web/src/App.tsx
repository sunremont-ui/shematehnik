import { useCallback, useEffect, useRef, useState } from "react";
import { UcpContext, type UcpState } from "./store.ts";
import { MODULE_INDEX, type ModuleKind } from "./data/modules.ts";
import { MenuBar } from "./components/MenuBar.tsx";
import { ModuleTree } from "./components/ModuleTree.tsx";
import { Workspace } from "./components/Workspace.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { AboutDialog, ShortcutsDialog } from "./components/Dialogs.tsx";
import { CommandPalette } from "./components/CommandPalette.tsx";
import { initCore } from "./core/ucpCore.ts";
import {
  emptyProject, serialize, deserialize, importNetlist, importKicadSch, nextRef,
  type SchComponent, type UcpProject,
} from "./project.ts";
import {
  importKicadSymLib, loadStoredUserParts, mergeUserParts, saveStoredUserParts,
  setRuntimeUserParts, type UserPart,
} from "./data/library.ts";
import { fsm, packet, uiProject } from "./design.ts";
import {
  ensureHandlePermission, getRecentFileHandle, hasFileSystemAccess, listRecentFiles,
  pickOpenHandle, pickSaveHandle, rememberRecentFile, writeHandle,
  type FsFileHandle, type RecentFileMeta,
} from "./fsAccess.ts";

const LS_PROJECT = "ucp.project";
const LS_THEME = "ucp.theme";

const projectFileName = (name: string) =>
  `${(name || "project").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")}.ucp`;

function moduleFromUrl(): ModuleKind | null {
  const id = new URLSearchParams(window.location.search).get("module");
  return id && id in MODULE_INDEX ? id as ModuleKind : null;
}

function loadStoredProject(): UcpProject {
  try {
    const raw = localStorage.getItem(LS_PROJECT);
    if (raw) return deserialize(raw);
  } catch { /* ignore corrupt storage */ }
  return emptyProject();
}

export function App() {
  const initial = useRef<{ project: UcpProject; userParts: UserPart[] } | null>(null);
  if (!initial.current) {
    const project = loadStoredProject();
    const userParts = mergeUserParts(loadStoredUserParts(), project.userParts ?? []);
    setRuntimeUserParts(userParts);
    initial.current = { project: { ...project, ...(userParts.length ? { userParts } : {}) }, userParts };
  }
  const [project, setProject] = useState<UcpProject>(initial.current.project);
  const [userParts, setUserParts] = useState<UserPart[]>(initial.current.userParts);
  const [modified, setModified] = useState(false);
  const [selected, setSelected] = useState<ModuleKind | null>(() => moduleFromUrl());
  const [theme, setThemeState] = useState<"dark" | "light">(
    () => (localStorage.getItem(LS_THEME) === "light" ? "light" : "dark"));
  const [treeVisible, setTreeVisible] = useState(true);
  const [recentFiles, setRecentFiles] = useState<RecentFileMeta[]>([]);
  const [status, setStatusState] = useState("New project created");
  const [dialog, setDialog] = useState<"about" | "shortcuts" | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const uiAutosave = uiProject.use();
  const packetAutosave = packet.use();
  const fsmAutosave = fsm.use();
  const clearTimer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileHandle = useRef<FsFileHandle | null>(null);
  const firstRender = useRef(true);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem(LS_THEME, theme); }, [theme]);
  useEffect(() => { void initCore(); }, []);
  useEffect(() => { void listRecentFiles().then(setRecentFiles); }, []);
  useEffect(() => {
    setRuntimeUserParts(userParts);
    saveStoredUserParts(userParts);
  }, [userParts]);

  // Автосохранение проекта в localStorage (debounced) — переживает перезагрузку.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = window.setTimeout(() => {
      try { localStorage.setItem(LS_PROJECT, serialize(project)); } catch { /* quota */ }
    }, 800);
    return () => window.clearTimeout(t);
  }, [project, uiAutosave, packetAutosave, fsmAutosave]);

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
    fileHandle.current = null;
    setProject({ ...emptyProject(), ...(userParts.length ? { userParts } : {}) }); setModified(false); setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("module");
    window.history.replaceState(null, "", url);
    setStatus("New project created");
  }, [setStatus, userParts]);

  const downloadProject = useCallback((text: string) => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = projectFileName(project.name);
    a.click();
    URL.revokeObjectURL(url);
    setModified(false);
    setStatus(`Saved: ${project.name}.ucp`);
  }, [project, setStatus]);

  const saveProject = useCallback(async (saveAs = false) => {
    const text = serialize(project);
    if (!hasFileSystemAccess()) { downloadProject(text); return; }
    try {
      let handle = saveAs ? null : fileHandle.current;
      if (!handle) handle = await pickSaveHandle(projectFileName(project.name));
      if (!handle) return;
      if (!await ensureHandlePermission(handle, "readwrite")) {
        setStatus(`Save denied: ${handle.name}`);
        return;
      }
      await writeHandle(handle, text);
      fileHandle.current = handle;
      setRecentFiles(await rememberRecentFile(handle));
      setModified(false);
      setStatus(`Saved: ${handle.name}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setStatus(`Save error: ${e instanceof Error ? e.message : e}`);
    }
  }, [downloadProject, project, setStatus]);

  const openFile = useCallback((file: File, handle?: FsFileHandle | null) => {
    const base = file.name.replace(/\.[^.]+$/, "");
    const kind = /\.net$/i.test(file.name) ? "net" : /\.kicad_sch$/i.test(file.name) ? "sch" : /\.kicad_sym$/i.test(file.name) ? "sym" : "ucp";
    file.text().then(async (text) => {
      try {
        if (kind === "sym") {
          const imported = importKicadSymLib(text, userParts);
          const merged = mergeUserParts(userParts, imported);
          setUserParts(merged);
          setProject((p) => ({ ...p, ...(merged.length ? { userParts: merged } : {}) }));
          setModified(true);
          setStatus(`Imported ${imported.length} symbols from ${file.name}`);
          return;
        }
        const p = kind === "net" ? importNetlist(text, base)
          : kind === "sch" ? importKicadSch(text, base)
          : deserialize(text);
        const merged = mergeUserParts(userParts, p.userParts ?? []);
        setUserParts(merged);
        setRuntimeUserParts(merged);
        fileHandle.current = kind === "ucp" ? handle ?? null : null;
        if (kind === "ucp" && handle) setRecentFiles(await rememberRecentFile(handle));
        setProject({ ...p, ...(merged.length ? { userParts: merged } : {}) }); setModified(false);
        const verb = kind === "ucp" ? "Opened" : "Imported";
        setStatus(`${verb}: ${file.name} (${p.components.length} comp, ${p.wires.length} wires)`);
      } catch {
        setStatus(`Error: ${file.name} — invalid ${kind === "ucp" ? ".ucp" : kind === "net" ? "netlist" : kind === "sym" ? ".kicad_sym" : ".kicad_sch"}`);
      }
    });
  }, [setStatus, userParts]);

  const openProject = useCallback(async () => {
    if (!hasFileSystemAccess()) { fileInput.current?.click(); return; }
    try {
      const handle = await pickOpenHandle();
      if (!handle) return;
      if (!await ensureHandlePermission(handle, "read")) {
        setStatus(`Open denied: ${handle.name}`);
        return;
      }
      openFile(await handle.getFile(), handle);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setStatus(`Open error: ${e instanceof Error ? e.message : e}`);
    }
  }, [openFile, setStatus]);

  const openRecentFile = useCallback(async (id: string) => {
    const handle = await getRecentFileHandle(id);
    if (!handle) { setStatus("Recent file is unavailable"); return; }
    try {
      if (!await ensureHandlePermission(handle, "read")) {
        setStatus(`Open denied: ${handle.name}`);
        return;
      }
      openFile(await handle.getFile(), handle);
    } catch (e) {
      setStatus(`Recent error: ${e instanceof Error ? e.message : e}`);
    }
  }, [openFile, setStatus]);

  const state: UcpState = {
    projectName: project.name,
    modified, selected, theme, treeVisible, status,
    setStatus,
    select: (id) => {
      setSelected(id);
      const url = new URL(window.location.href);
      url.searchParams.set("module", id);
      window.history.replaceState(null, "", url);
    },
    setTheme: setThemeState,
    toggleTree: () => setTreeVisible((v) => !v),
    newProject,
    setProjectName: (name) => { setProject((p) => ({ ...p, name })); setModified(true); },
    markModified: () => setModified(true),

    project,
    userParts,
    addUserPart: (part) => {
      const merged = mergeUserParts(userParts, [part]);
      setUserParts(merged);
      setProject((p) => ({ ...p, userParts: merged }));
      setModified(true);
      setStatus(`Library: added ${part.name}`);
    },
    importUserParts: (parts) => {
      const merged = mergeUserParts(userParts, parts);
      setUserParts(merged);
      setProject((p) => ({ ...p, userParts: merged }));
      setModified(true);
      setStatus(`Library: imported ${parts.length} parts`);
    },
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
    removeComponents: (ids) => setProject((p) => {
      const idSet = new Set(ids);
      const refs = new Set(p.components.filter((c) => idSet.has(c.id)).map((c) => c.ref));
      const refOfSig = (s: string) => s.split(".")[0];
      setModified(true); setStatus(`Deleted ${refs.size} components`);
      return {
        ...p,
        components: p.components.filter((c) => !idSet.has(c.id)),
        wires: p.wires.filter((w) => !refs.has(w.from.ref) && !refs.has(w.to.ref)),
        labels: p.labels.filter((l) => !refs.has(l.ref)),
        tracks: p.tracks.filter((t) => {
          const [a, b] = t.sig.split("-");
          return !refs.has(refOfSig(a)) && !refs.has(refOfSig(b));
        }),
      };
    }),
    addItems: ({ components, wires, labels }) => setProject((p) => {
      setModified(true); setStatus(`Pasted ${components.length} components`);
      return {
        ...p,
        components: [...p.components, ...components],
        wires: [...p.wires, ...wires],
        labels: [...p.labels, ...labels],
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
      else if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveProject(e.shiftKey); }
      else if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); void openProject(); }
      else if (e.ctrlKey && (e.key === "z" || e.key === "Z") && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(true); }
      else if (e.ctrlKey && e.key === "\\") { e.preventDefault(); setTreeVisible((v) => !v); }
      else if (e.ctrlKey && e.key === "/") { e.preventDefault(); setDialog("shortcuts"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newProject, openProject, saveProject, undo, redo]);

  return (
    <UcpContext.Provider value={state}>
      <div className="app">
        <MenuBar
          onAbout={() => setDialog("about")}
          onShortcuts={() => setDialog("shortcuts")}
          onHelp={() => setStatus("Documentation: см. wiki/ в репозитории")}
          onSave={() => void saveProject(false)}
          onSaveAs={() => void saveProject(true)}
          onOpen={() => void openProject()}
          recentFiles={recentFiles}
          onRecentFile={(id) => void openRecentFile(id)}
        />
        <div className={`app-body${treeVisible ? "" : " tree-hidden"}`}>
          {treeVisible && <ModuleTree />}
          <Workspace />
        </div>
        <StatusBar />
      </div>
      <input
        ref={fileInput} type="file" accept=".ucp,.net,.kicad_sch,.kicad_sym,application/json" style={{ display: "none" }}
        aria-label="Open .ucp project file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ""; }}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} />}
      {dialog === "shortcuts" && <ShortcutsDialog onClose={() => setDialog(null)} />}
    </UcpContext.Provider>
  );
}
