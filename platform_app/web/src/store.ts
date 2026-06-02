// ============================================================
// Глобальное состояние оболочки — лёгкая замена EventBus + Project.
// ============================================================
import { createContext, useContext } from "react";
import type { ModuleKind } from "./data/modules.ts";

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
}

export const UcpContext = createContext<UcpState | null>(null);

export function useUcp(): UcpState {
  const ctx = useContext(UcpContext);
  if (!ctx) throw new Error("useUcp must be used within <App>");
  return ctx;
}
