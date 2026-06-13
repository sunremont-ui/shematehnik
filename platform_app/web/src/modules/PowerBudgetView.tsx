import { useMemo, useState } from "react";
import { MODULE_INDEX } from "../data/modules.ts";
import { useUcp } from "../store.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";
import { buildPowerBudget, exportPowerBudgetCsv, formatCurrent } from "../power.ts";

export function PowerBudgetView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["powerbudget"];
  const [currents, setCurrents] = useState<Record<string, number>>({});
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const budget = useMemo(() => buildPowerBudget(ucp.project, currents, budgets), [ucp.project, currents, budgets]);
  const maxRail = Math.max(1e-6, ...budget.rails.map((r) => Math.max(r.currentA, r.budgetA)));

  function setLoad(ref: string, mA: number) {
    setCurrents((old) => ({ ...old, [ref]: Math.max(0, mA / 1000) }));
  }

  function setRail(name: string, mA: number) {
    setBudgets((old) => ({ ...old, [name]: Math.max(0, mA / 1000) }));
  }

  function exportCsv() {
    downloadText(`${ucp.projectName}-power-budget.csv`, exportPowerBudgetCsv(budget), "text/csv");
    ucp.setStatus(`Exported ${ucp.projectName}-power-budget.csv`);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className={`dot ${budget.warnings.length ? "warn" : "ok"}`} />{budget.warnings.length} warnings</span>
        <span className="chip"><span className="dot ok" />Total {formatCurrent(budget.totalA)}</span>
        <button className="btn primary" onClick={exportCsv}>Download budget.csv</button>
      </>} />

      <div className="grid cols2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Loads</h3>
          <table className="tbl">
            <thead><tr><th>Ref</th><th>Value</th><th>Rail</th><th>Current</th><th>Source</th></tr></thead>
            <tbody>
              {budget.loads.map((load) => (
                <tr key={load.ref}>
                  <td><code>{load.ref}</code></td>
                  <td>{load.value}</td>
                  <td><span className="tag">{load.rail}</span></td>
                  <td>
                    <input
                      aria-label={`${load.ref} current mA`}
                      type="number"
                      min={0}
                      step={0.1}
                      value={(load.currentA * 1000).toFixed(load.currentA < 0.001 ? 3 : 1)}
                      onChange={(e) => setLoad(load.ref, Number(e.target.value) || 0)}
                      style={{ width: 88 }}
                    /> mA
                  </td>
                  <td title={load.note}>{load.source}</td>
                </tr>
              ))}
              {!budget.loads.length && <tr><td colSpan={5} className="muted">No components in project.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Rails</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {budget.rails.map((rail) => {
              const currentW = Math.min(100, (rail.currentA / maxRail) * 100);
              const budgetW = Math.min(100, (rail.budgetA / maxRail) * 100);
              return (
                <div key={rail.name} style={{ display: "grid", gap: 6 }}>
                  <div className="toolbar" style={{ margin: 0 }}>
                    <span className="tag">{rail.name}</span>
                    <span className="muted">{formatCurrent(rail.currentA)} /</span>
                    <input
                      aria-label={`${rail.name} budget mA`}
                      type="number"
                      min={0}
                      step={10}
                      value={(rail.budgetA * 1000).toFixed(0)}
                      onChange={(e) => setRail(rail.name, Number(e.target.value) || 0)}
                      style={{ width: 88 }}
                    />
                    <span className="muted">mA</span>
                    <span className={`chip`}><span className={`dot ${rail.overload ? "warn" : "ok"}`} />{rail.overload ? "OVERLOAD" : "OK"}</span>
                  </div>
                  <svg aria-label={`${rail.name} power budget bar`} width="100%" height="24" viewBox="0 0 420 24" style={{ display: "block" }}>
                    <rect x="0" y="6" width="420" height="12" rx="3" fill="var(--raised)" stroke="var(--border)" />
                    <rect x="0" y="6" width={4.2 * budgetW} height="12" rx="3" fill="var(--border)" />
                    <rect x="0" y="6" width={4.2 * currentW} height="12" rx="3" fill={rail.overload ? "var(--danger)" : "var(--accent-soft)"} />
                  </svg>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {rail.loads.map((l) => l.ref).join(", ") || "—"} · margin {formatCurrent(rail.marginA)}
                  </div>
                </div>
              );
            })}
            {!budget.rails.length && <span className="muted">No rails.</span>}
          </div>
        </div>
      </div>

      {budget.warnings.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Warnings</h3>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            {budget.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
