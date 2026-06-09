# UCP Web — Add / extend a module

How to add or extend a module view in the web frontend (`platform_app/web/`).

## Add a new module

1. **Register** it in `src/data/modules.ts` — add a `ModuleDef` to
   `MODULE_TREE` (id, name, title, icon, blurb; nest under a parent via
   `children` if needed). 25 modules today; keep the tree mirroring the
   desktop `core/module_factory`.
2. **Dispatch** it in `src/modules/index.tsx` — add a `case` in `ModuleView`
   returning your component (fallback is `GenericPanel`).
3. **Build the view** as `src/modules/<Name>View.tsx` (or add to a family
   file: `schematic_family.tsx`, `protocol_family.tsx`, `codegen_exports.tsx`,
   `firmware.tsx`). Start with `<PanelHead mod={MODULE_INDEX["id"]} … />`.

## Use the shared project model

`src/project.ts` `UcpProject { components, wires }` is the single source of
truth, held in the store (`src/store.ts` `useUcp()`):

- Read: `ucp.project.components` / `ucp.project.wires`.
- Mutate: `addComponent` / `updateComponent` / `removeComponent` /
  `addWire` / `removeWire` / `loadProject`. These feed undo/redo + autosave
  automatically — do NOT keep a parallel copy in local state.
- Pins: `pinsOf(kind)` (U=6, else 2) + `pinOffset(kind, pin)`.
- Nets/DRC/export/import: `computeNets`, `runDrc`, `exportNetlist`,
  `importNetlist` (.net), `importKicadSch` (.kicad_sch — components + nets
  traced from wire geometry). Orthogonal routing: `routeOrthogonal`
  (`src/routing.ts`, `/ucp-web-route`).

A module that derives from the model (Netlist, PCB, 3D, DRC) should
`useMemo` over `ucp.project` so it updates live as the schematic changes.

## Real computation → WASM core

Put real math in `wasm/ucp_core.cpp` (or `ucp_csg.cpp`), expose via embind
in `bindings.cpp`, add a JS fallback + wrapper in `src/core/ucpCore.ts`,
and a Vitest vector. Show the `engine: wasm|js` badge via `useCoreBackend()`.
Rebuild: `npm run build:wasm` (see `/ucp-web`).

## Checklist

- [ ] `MODULE_TREE` entry + `ModuleView` case + `*View.tsx`
- [ ] reads/writes the shared model (no duplicate state)
- [ ] `npm run build` clean, `npm test` green, e2e still passes
- [ ] if it adds a pure helper to `project.ts`/`routing.ts`/`ucpCore.ts`, add a Vitest

See wiki [Web Frontend](../../platform_app/wiki/modules/web_frontend.md),
`/ucp-web`, `/ucp-web-route`.
