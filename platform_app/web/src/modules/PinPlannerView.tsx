import { useMemo, useState } from "react";
import { MODULE_INDEX } from "../data/modules.ts";
import { useUcp } from "../store.ts";
import {
  MCU_DEFS,
  capabilityFor,
  defaultPinPlan,
  generatePinInit,
  getMcu,
  pinPlanSummary,
  validatePinPlan,
  type McuDef,
  type McuPin,
  type PinAssignment,
  type PinPlanIssue,
} from "../pinplanner.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

export function PinPlannerView() {
  const mod = MODULE_INDEX["pinplanner"];
  const ucp = useUcp();
  const [mcuId, setMcuId] = useState(MCU_DEFS[0]!.id);
  const [selectedPinId, setSelectedPinId] = useState("pa9");
  const [assignments, setAssignments] = useState<PinAssignment[]>(() => defaultPinPlan(MCU_DEFS[0]!));
  const mcu = useMemo(() => getMcu(mcuId), [mcuId]);
  const issues = useMemo(() => validatePinPlan(mcu, assignments), [mcu, assignments]);
  const summary = useMemo(() => pinPlanSummary(mcu, assignments), [mcu, assignments]);
  const code = useMemo(() => generatePinInit(mcu, assignments), [mcu, assignments]);
  const selectedPin = mcu.pins.find((p) => p.id === selectedPinId) ?? mcu.pins.find((p) => p.capabilities.length) ?? mcu.pins[0]!;
  const selectedAssignment = assignments.find((a) => a.pinId === selectedPin.id);

  function switchMcu(id: string) {
    const next = getMcu(id);
    setMcuId(next.id);
    setAssignments(defaultPinPlan(next));
    setSelectedPinId(next.pins.find((p) => p.capabilities.length)?.id ?? next.pins[0]!.id);
  }

  function setFunction(functionId: string) {
    setAssignments((prev) => {
      const rest = prev.filter((a) => a.pinId !== selectedPin.id);
      if (!functionId) return rest;
      return [...rest, { pinId: selectedPin.id, functionId, label: selectedAssignment?.label ?? selectedPin.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") }];
    });
  }

  function setLabel(label: string) {
    setAssignments((prev) => prev.map((a) => a.pinId === selectedPin.id ? { ...a, label } : a));
  }

  function exportCode() {
    const filename = mcu.target === "arduino" ? "pin-planner-init.ino" : "pin-planner-init.c";
    downloadText(filename, code, "text/x-c");
    ucp.setStatus(`Exported ${filename}`);
  }

  function copyCode() {
    void navigator.clipboard?.writeText(code);
    ucp.setStatus("Copied pin init code");
  }

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <span className="chip"><span className={`dot ${summary.errors ? "warn" : "ok"}`} />{summary.assigned} assigned</span>
          <span className="chip">{summary.errors} errors</span>
          <span className="chip">{summary.warnings} warnings</span>
          <button className="btn" onClick={copyCode}>Copy code</button>
          <button className="btn primary" onClick={exportCode}>Download init.c</button>
        </>
      } />

      <div className="grid cols2" style={{ alignItems: "start" }}>
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div className="toolbar" style={{ margin: 0 }}>
            <select value={mcu.id} onChange={(e) => switchMcu(e.target.value)}>
              {MCU_DEFS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <span className="chip">{mcu.packageName}</span>
            <span className="chip">{mcu.target}</span>
          </div>
          <PackageSvg
            mcu={mcu}
            selectedPinId={selectedPin.id}
            assignments={assignments}
            issues={issues}
            onSelect={setSelectedPinId}
          />
          <AssignmentTable mcu={mcu} assignments={assignments} onSelect={setSelectedPinId} />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <div className="muted" style={{ fontSize: 11 }}>SELECTED PIN</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 18 }}>{selectedPin.name}</strong>
              <span className="tag">{selectedPin.role}</span>
              {selectedPin.port && <span className="chip">GPIO{selectedPin.port}{selectedPin.bit}</span>}
              {selectedPin.arduinoPin && <span className="chip">Arduino {selectedPin.arduinoPin}</span>}
              {selectedPin.espGpio != null && <span className="chip">GPIO{selectedPin.espGpio}</span>}
            </div>
            <label className="field">Function
              <select value={selectedAssignment?.functionId ?? ""} disabled={!selectedPin.capabilities.length} onChange={(e) => setFunction(e.target.value)}>
                <option value="">Unassigned</option>
                {selectedPin.capabilities.map((pinCap) => <option key={pinCap.id} value={pinCap.id}>{pinCap.label}</option>)}
              </select>
            </label>
            <label className="field">Signal label
              <input value={selectedAssignment?.label ?? ""} disabled={!selectedAssignment} onChange={(e) => setLabel(e.target.value)} />
            </label>
          </div>

          <div className="card">
            <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>ISSUES</div>
            {issues.length ? (
              <table className="tbl">
                <tbody>
                  {issues.map((issue, i) => (
                    <tr key={`${issue.message}-${i}`}>
                      <td><span className="tag">{issue.severity}</span></td>
                      <td>{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <span className="chip"><span className="dot ok" />No conflicts</span>}
          </div>

          <div className="card" style={{ display: "grid", gap: 10 }}>
            <div className="muted" style={{ fontSize: 11 }}>GENERATED INIT</div>
            <pre className="code" style={{ maxHeight: 360 }}>{code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignmentTable({ mcu, assignments, onSelect }: { mcu: McuDef; assignments: PinAssignment[]; onSelect: (id: string) => void }) {
  return (
    <table className="tbl">
      <thead>
        <tr><th>Pin</th><th>Function</th><th>Label</th></tr>
      </thead>
      <tbody>
        {assignments.map((assignment) => {
          const pinDef = mcu.pins.find((p) => p.id === assignment.pinId);
          const capDef = pinDef ? capabilityFor(pinDef, assignment.functionId) : undefined;
          return (
            <tr key={assignment.pinId} onClick={() => onSelect(assignment.pinId)} style={{ cursor: "pointer" }}>
              <td><code>{pinDef?.name ?? assignment.pinId}</code></td>
              <td>{capDef?.label ?? assignment.functionId}</td>
              <td>{assignment.label ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PackageSvg({ mcu, selectedPinId, assignments, issues, onSelect }: {
  mcu: McuDef;
  selectedPinId: string;
  assignments: PinAssignment[];
  issues: PinPlanIssue[];
  onSelect: (id: string) => void;
}) {
  const assigned = new Set(assignments.map((a) => a.pinId));
  const issuePins = new Set(issues.flatMap((issue) => issue.severity === "error" ? issue.pinIds : []));
  const left = mcu.pins.filter((p) => p.side === "left").sort((a, b) => a.order - b.order);
  const right = mcu.pins.filter((p) => p.side === "right").sort((a, b) => a.order - b.order);
  const rows = Math.max(left.length, right.length, 1);
  const height = Math.max(340, 70 + rows * 30);
  const yFor = (pinDef: McuPin, sidePins: McuPin[]) => 48 + (sidePins.findIndex((p) => p.id === pinDef.id) + 0.5) * ((height - 96) / sidePins.length);
  const fillFor = (pinDef: McuPin) => {
    if (issuePins.has(pinDef.id)) return "var(--danger)";
    if (assigned.has(pinDef.id)) return "var(--accent)";
    if (pinDef.role === "power") return "#d29922";
    if (pinDef.role === "ground") return "var(--muted)";
    if (pinDef.role === "reset" || pinDef.role === "boot") return "#a371f7";
    return "var(--raised)";
  };

  return (
    <svg viewBox={`0 0 520 ${height}`} role="img" aria-label="MCU pin package" style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={152} y={36} width={216} height={height - 72} rx={6} fill="var(--base)" stroke="var(--border)" />
      <text x={260} y={height / 2 - 8} textAnchor="middle" fill="var(--text)" fontSize={16}>{mcu.name}</text>
      <text x={260} y={height / 2 + 14} textAnchor="middle" fill="var(--muted)" fontSize={11}>{mcu.packageName}</text>
      {[...left, ...right].map((pinDef) => {
        const isLeft = pinDef.side === "left";
        const y = yFor(pinDef, isLeft ? left : right);
        const rectX = isLeft ? 100 : 370;
        const labelX = isLeft ? 92 : 428;
        const anchor = isLeft ? "end" : "start";
        return (
          <g key={pinDef.id} onClick={() => onSelect(pinDef.id)} style={{ cursor: "pointer" }}>
            <line x1={isLeft ? 128 : 370} x2={isLeft ? 152 : 368} y1={y} y2={y} stroke="var(--border)" />
            <rect
              x={rectX}
              y={y - 9}
              width={28}
              height={18}
              rx={3}
              fill={fillFor(pinDef)}
              stroke={selectedPinId === pinDef.id ? "var(--accent-soft)" : "var(--border)"}
              strokeWidth={selectedPinId === pinDef.id ? 2 : 1}
            />
            <text x={labelX} y={y + 4} textAnchor={anchor} fill="var(--text)" fontSize={11} fontFamily="var(--mono)">{pinDef.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
