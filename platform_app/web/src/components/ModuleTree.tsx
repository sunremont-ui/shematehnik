import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_TREE, type ModuleDef } from "../data/modules.ts";

function TreeNode({ mod, depth }: { mod: ModuleDef; depth: number }) {
  const ucp = useUcp();
  const [expanded, setExpanded] = useState(true);
  const hasKids = !!mod.children?.length;
  const active = ucp.selected === mod.id;

  return (
    <div className="tree-node">
      <div
        className={`tree-row${active ? " active" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => ucp.select(mod.id)}
      >
        <span
          className="twisty"
          onClick={(e) => { e.stopPropagation(); if (hasKids) setExpanded(!expanded); }}
        >
          {hasKids ? (expanded ? "▾" : "▸") : ""}
        </span>
        <span className="ico">{mod.icon}</span>
        <span className="lbl">{mod.name}</span>
      </div>
      {hasKids && expanded &&
        mod.children!.map((c) => <TreeNode key={c.id} mod={c} depth={depth + 1} />)}
    </div>
  );
}

export function ModuleTree() {
  const ucp = useUcp();
  return (
    <div className="tree">
      <div className="tree-head">📦 {ucp.projectName}{ucp.modified ? " *" : ""}</div>
      {MODULE_TREE.map((m) => <TreeNode key={m.id} mod={m} depth={0} />)}
    </div>
  );
}
