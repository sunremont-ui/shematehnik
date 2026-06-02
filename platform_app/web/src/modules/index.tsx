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
import { ThreeDView, PartEditorView } from "./ThreeDView.tsx";
import { SequenceView, PacketView, UartView, AnalyzerView } from "./protocol_family.tsx";
import { LvglExportView, ArduinoExportView, ProtoCodeGenView } from "./codegen_exports.tsx";
import { FirmwareProjectView, AgentRunnerView } from "./firmware.tsx";

// Полное сопоставление вид ↔ модуль — все модули UCP реализованы.
export function ModuleView({ id }: { id: ModuleKind }) {
  switch (id) {
    // Schematic family
    case "schematic":   return <SchematicView />;
    case "symbol":      return <SymbolEditorView />;
    case "wire":        return <WireToolView />;
    case "netlist":     return <NetlistView />;
    case "spice":       return <SpiceView />;
    // PCB / 3D
    case "pcb":         return <PcbView />;
    case "threed":      return <ThreeDView />;
    case "part":        return <PartEditorView />;
    // Control / programs
    case "pid":         return <PidTunerView />;
    case "programs":    return <ProgramsView />;
    // Protocol family
    case "protocol":    return <SequenceView />;
    case "sequence":    return <SequenceView />;
    case "packet":      return <PacketView />;
    case "uart":        return <UartView />;
    case "analyzer":    return <AnalyzerView />;
    // CodeGen family
    case "codegen":     return <CrcView />;
    case "crc":         return <CrcView />;
    case "lvgl":        return <LvglExportView />;
    case "arduino":     return <ArduinoExportView />;
    case "protocodegen":return <ProtoCodeGenView />;
    // UI / AI / OTA / Firmware
    case "ui":          return <UiDesignerView />;
    case "ai":          return <AiView />;
    case "ota":         return <OtaView />;
    case "firmproj":    return <FirmwareProjectView />;
    case "agent":       return <AgentRunnerView />;
    default:            return <GenericPanel mod={MODULE_INDEX[id]} />;
  }
}
