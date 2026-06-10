# UCP Web

Build, run, test and verify the UCP web frontend (React + TypeScript + Vite + WASM core) in `platform_app/web/`.

## Steps

```bash
cd D:/shemaTehnik/platform_app/web
npm install 2>&1 | tail -3          # only first time / after deps change
npm test 2>&1 | tail -6             # Vitest (32) — core algos, model, router, import/export
npm run build 2>&1 | tail -15       # tsc -b (strict) + vite build → dist/
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
(npm run dev > /tmp/vite.log 2>&1 &) ; sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
npm run test:e2e 2>&1 | tail -6     # Playwright (builds + previews automatically)
```

## Browser verification (optional)

Use `browser-harness` to open the app, click `.tree-row` nodes, capture `window.__err`.
Expect 0 JS errors, badge `engine: wasm`, CRC-32("123456789")=0xCBF43926.
Stop servers: `taskkill //F //IM node.exe`.

## Report

- TypeScript / Vitest / Playwright failures (file:line)
- Whether `dist/wasm/ucp_core.wasm` was produced; bundle size
- Per-module render status + total JS error count if browser-tested

## Notes

- Architecture & data flow: wiki [Web Frontend](../../platform_app/wiki/modules/web_frontend.md).
- Shared model is `src/project.ts` (`UcpProject{components,wires}`, `.ucp`); Schematic edits it, Netlist/PCB/3D read it.
- Real math goes in `wasm/ucp_core.cpp` (or `ucp_csg.cpp`) + an identical JS fallback in `ucpCore.ts` + a Vitest vector.
- Adding a module: `MODULE_TREE` (data/modules.ts) + a branch in `ModuleView` (modules/index.tsx) + a `*View.tsx`.
- Do NOT commit `node_modules/`, `dist/`, `public/wasm/`, `*.tsbuildinfo`, `playwright-report/` (all gitignored).
