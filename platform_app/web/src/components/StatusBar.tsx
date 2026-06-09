import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";

export function StatusBar() {
  const ucp = useUcp();
  const mod = ucp.selected ? MODULE_INDEX[ucp.selected] : null;
  return (
    <div className="statusbar">
      <span className="msg" role="status" aria-live="polite">{ucp.status || "Ready"}</span>
      <span className="perm">{mod ? mod.name : "—"}</span>
      <span className="perm">UCP v3.0 · web</span>
    </div>
  );
}
