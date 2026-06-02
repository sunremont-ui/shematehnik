import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

type State = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";
interface Prog { id: string; name: string; icon: string; desc: string; }

const PROGRAMS: Prog[] = [
  { id: "greenhouse", name: "Greenhouse", icon: "🌱", desc: "Контроль температуры/влажности, полив, вентиляция." },
  { id: "fan", name: "Fan Controller", icon: "🌀", desc: "ШИМ-управление вентилятором по датчику температуры." },
  { id: "washer", name: "Washing Machine", icon: "🧺", desc: "Циклы стирки: набор воды → стирка → отжим → слив." },
];

const NEXT: Record<State, State> = { IDLE: "RUNNING", RUNNING: "PAUSED", PAUSED: "RUNNING", COMPLETED: "IDLE" };
const COLOR: Record<State, string> = { IDLE: "var(--muted)", RUNNING: "#3fb950", PAUSED: "#d29922", COMPLETED: "var(--accent-soft)" };

export function ProgramsView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["programs"];
  const [states, setStates] = useState<Record<string, State>>({ greenhouse: "IDLE", fan: "RUNNING", washer: "IDLE" });

  function toggle(p: Prog) {
    setStates((s) => {
      const ns = NEXT[s[p.id]];
      ucp.setStatus(`${p.name}: ${ns}`);
      return { ...s, [p.id]: ns };
    });
  }

  return (
    <div>
      <PanelHead mod={mod} />
      <div className="grid cols3">
        {PROGRAMS.map((p) => {
          const st = states[p.id];
          return (
            <div key={p.id} className="card" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{p.icon}</span>
                <b>{p.name}</b>
                <span style={{ flex: 1 }} />
                <span className="chip"><span className="dot" style={{ background: COLOR[st] }} />{st}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12, minHeight: 48 }}>{p.desc}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" style={{ flex: 1 }} onClick={() => toggle(p)}>
                  {st === "RUNNING" ? "Pause" : st === "PAUSED" ? "Resume" : "Start"}
                </button>
                <button className="btn" onClick={() => { setStates((s) => ({ ...s, [p.id]: "IDLE" })); ucp.setStatus(`${p.name}: stopped`); }}>Stop</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
