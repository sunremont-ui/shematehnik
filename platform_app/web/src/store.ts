// ============================================================
// Глобальное состояние оболочки — лёгкая замена EventBus + Project.
// ============================================================
import { createContext, useContext } from "react";
import type { ModuleKind } from "./data/modules.ts";
import type { UserPart } from "./data/library.ts";
import type { NetLabel, PcbTrack, PinRef, SchComponent, SchWire, UcpProject } from "./project.ts";

export interface UcpState {
  projectName: string;
  modified: boolean;
  selected: ModuleKind | null;
  theme: "dark" | "light";
  treeVisible: boolean;
  status: string;
  setStatus: (msg: string) => void;        // mirrors EventBus "status.message"
  select: (id: ModuleKind) => void;
  setTheme: (t: "dark" | "light") => void;
  toggleTree: () => void;
  newProject: () => void;
  setProjectName: (name: string) => void;
  markModified: () => void;

  // --- Общая модель проекта (единый источник правды) ---
  project: UcpProject;
  userParts: UserPart[];
  addUserPart: (part: UserPart) => void;
  importUserParts: (parts: UserPart[]) => void;
  addComponent: (kind: string, value: string, footprint?: string) => void;
  updateComponent: (id: string, patch: Partial<SchComponent>) => void;
  removeComponent: (id: string) => void;
  removeComponents: (ids: string[]) => void;  // групповое удаление (+провода/метки/дорожки)
  addItems: (items: { components: SchComponent[]; wires: SchWire[]; labels: NetLabel[] }) => void; // вставка из клипборда
  addWire: (from: PinRef, to: PinRef) => void;
  removeWire: (index: number) => void;
  setLabel: (ref: string, pin: string, net: string) => void;  // net="" → снять
  setTracks: (tracks: PcbTrack[]) => void;  // PCB: разводка/правка/удаление дорожек
  setBoard: (w: number, h: number) => void; // PCB: размер платы, мм
  loadProject: (p: UcpProject) => void;     // File → Open

  // --- История (undo/redo, с коалесингом перетаскивания) ---
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const UcpContext = createContext<UcpState | null>(null);

export function useUcp(): UcpState {
  const ctx = useContext(UcpContext);
  if (!ctx) throw new Error("useUcp must be used within <App>");
  return ctx;
}
