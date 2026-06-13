import { lazy, Suspense, type ReactNode } from "react";
import type { ModuleKind } from "../data/modules.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { GenericPanel } from "./common.tsx";
import { SchematicView } from "./SchematicView.tsx";
import { PidTunerView } from "./PidTunerView.tsx";
import { CrcView } from "./CrcView.tsx";
import { UiDesignerView } from "./UiDesignerView.tsx";
import { OtaView } from "./OtaView.tsx";
import { AiView } from "./AiView.tsx";
import { ProgramsView } from "./ProgramsView.tsx";
import { SymbolEditorView, WireToolView, NetlistView, SpiceView } from "./schematic_family.tsx";
import { PcbView } from "./PcbView.tsx";
import { SequenceView, PacketView, UartView, AnalyzerView } from "./protocol_family.tsx";
import { LvglExportView, ArduinoExportView, ProtoCodeGenView } from "./codegen_exports.tsx";
import { FirmwareProjectView, AgentRunnerView } from "./firmware.tsx";
import { FilterDesignerView } from "./FilterDesignerView.tsx";
import { PinPlannerView } from "./PinPlannerView.tsx";
import { EeCalculatorsView } from "./EeCalculatorsView.tsx";
import { LogicAnalyzerView } from "./LogicAnalyzerView.tsx";
import { PowerBudgetView } from "./PowerBudgetView.tsx";
import { RegisterMapView } from "./RegisterMapView.tsx";

const ThreeDView = lazy(() => import("./ThreeDView.tsx").then((m) => ({ default: m.ThreeDView })));
const PartEditorView = lazy(() => import("./ThreeDView.tsx").then((m) => ({ default: m.PartEditorView })));

// Полное сопоставление вид ↔ модуль — все модули UCP реализованы.
export function ModuleView({ id }: { id: ModuleKind }) {
  switch (id) {
    // Schematic family
    case "schematic":   return <SchematicView />;
    case "symbol":      return <SymbolEditorView />;
    case "wire":        return <WireToolView />;
    case "netlist":     return <NetlistView />;
    case "spice":       return <SpiceView />;
    case "filter":      return <FilterDesignerView />;
    // PCB / 3D
    case "pcb":         return <PcbView />;
    case "threed":      return <Lazy3D id="threed"><ThreeDView /></Lazy3D>;
    case "part":        return <Lazy3D id="part"><PartEditorView /></Lazy3D>;
    // Control / programs
    case "pid":         return <PidTunerView />;
    case "programs":    return <ProgramsView />;
    // Protocol family
    case "protocol":    return <SequenceView />;
    case "sequence":    return <SequenceView />;
    case "packet":      return <PacketView />;
    case "uart":        return <UartView />;
    case "analyzer":    return <AnalyzerView />;
    case "logic":       return <LogicAnalyzerView />;
    // CodeGen family
    case "codegen":     return <CrcView />;
    case "crc":         return <CrcView />;
    case "lvgl":        return <LvglExportView />;
    case "arduino":     return <ArduinoExportView />;
    case "protocodegen":return <ProtoCodeGenView />;
    case "pinplanner":  return <PinPlannerView />;
    case "eecalc":      return <EeCalculatorsView />;
    case "powerbudget": return <PowerBudgetView />;
    case "regmap":      return <RegisterMapView />;
    // UI / AI / OTA / Firmware
    case "ui":          return <UiDesignerView />;
    case "ai":          return <AiView />;
    case "ota":         return <OtaView />;
    case "firmproj":    return <FirmwareProjectView />;
    case "agent":       return <AgentRunnerView />;
    default:            return <GenericPanel mod={MODULE_INDEX[id]} />;
  }
}

function Lazy3D({ id, children }: { id: ModuleKind; children: ReactNode }) {
  const mod = MODULE_INDEX[id];
  return (
    <Suspense fallback={
      <div>
        <h2 style={{ marginTop: 0 }}>{mod.title}</h2>
        <div className="card">
          <span className="chip"><span className="dot warn" />Loading 3D engine</span>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  );
}
