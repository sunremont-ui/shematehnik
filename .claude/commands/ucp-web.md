# UCP Web

Build, run, test and verify the UCP web frontend (React + TypeScript + Vite + WASM core) in `platform_app/web/`.

## Steps

```bash
cd D:/shemaTehnik/platform_app/web
npm install 2>&1 | tail -3          # only first time / after deps change (incl. three)
npm test 2>&1 | tail -6             # Vitest (50) — core, model, router, SPICE, codegen, STL/STEP
npm run build 2>&1 | tail -15       # tsc -b (strict) + vite build → dist/  (~767 КБ, three не code-split)
```

WASM compute core (rebuild after editing `wasm/*.cpp`):

```bash
# Linux / git-bash with extensionless emcc:
source ~/emsdk/emsdk_env.sh && npm run build:wasm
# Windows git-bash: emcc is .bat only → build via cmd (see wasm/README.md):
#   EM_CONFIG + PATH(upstream\emscripten;upstream\bin;msys64\mingw64\bin)
#   emcmake cmake -B build -G Ninja && cmake --build build   (outputs to public/wasm/)
```

Dev / e2e:

```bash
# свой dev-сервер на отдельном порту (не на 5173 пользователя), strictPort:
(npx vite --port 5199 --strictPort > /tmp/vite.log 2>&1 &) ; sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/
npm run test:e2e 2>&1 | tail -6     # Playwright (6) — собирает + preview сам
```

## Browser verification (optional)

Use `browser-harness` to open the app (requires Chrome remote-debug enabled by the
user once: chrome://inspect/#remote-debugging → "Allow…"). Open `.tree-row` nodes,
collect `window.__errs`. Expect 0 JS errors, badge `engine: wasm`.
Gotchas: `js()` runs in global scope → wrap snippets in `(()=>{…})()` (avoid `const`
redeclare); tree rows have emoji prefixes → match with `.endsWith(name)`; keep-alive
keeps modules mounted (display:none) → `querySelector` may hit a hidden module's
node, filter by `offsetParent !== null` for the visible one.
Stop ONLY your own server (never blanket-kill node — it kills the user's dev server):
`PID=$(netstat -ano | grep ':5199' | grep LISTENING | awk '{print $5}' | head -1); taskkill //PID $PID //F`.

## Report

- TypeScript / Vitest / Playwright failures (file:line)
- Whether `dist/wasm/ucp_core.wasm` was produced; bundle size
- Per-module render status + total JS error count if browser-tested

## Notes

- Architecture & data flow: wiki [Web Frontend](../../platform_app/wiki/modules/web_frontend.md).
- **Roadmap cycle 2** (phases 10–17): `wiki/roadmap-web.md`; dashboard `/ucp-web-roadmap`;
  per-item implementation skills `/ucp-web-impl-*` (serial, ota, spice-nonlinear, pcb-drc,
  pcb-edit, sch-ux, library, fsm, analyzer, ai, project-v2, system, new-modules).
  After each item: tick roadmap + entry in `wiki/log.md` + commit.
- Shared model is `src/project.ts` (`UcpProject{components,wires}`, `.ucp`); Schematic edits it, Netlist/PCB/3D/SPICE read it.
- Real math goes in `wasm/ucp_core.cpp` (or `ucp_csg.cpp`) + an identical JS fallback in `ucpCore.ts` + a Vitest vector.
- **SPICE** engine is `src/spice.ts` (pure TS): `buildNodes`/`buildElements` from the project, `dcSolve`/`transient` (BE companion C/L)/`acSweep` (complex MNA). Add a vector to `spice.test.ts`.
- **3D** uses three.js: `src/three/board.ts` (mesh + `groupTriangles`), `ThreeStage.tsx` (WebGL+OrbitControls), `exporters.ts` (STL/STEP). `three` is a runtime dep.
- **Code generators** are pure fns in `src/codegen.ts`; cross-module design artifacts (UI widgets, packet fields) live in the shared store `src/design.ts` (`useSyncExternalStore`) so editors and CodeGen share one source.
- Adding a module: `MODULE_TREE` (data/modules.ts) + a branch in `ModuleView` (modules/index.tsx) + a `*View.tsx`.
- Do NOT commit `node_modules/`, `dist/`, `public/wasm/`, `*.tsbuildinfo`, `playwright-report/` (all gitignored).
