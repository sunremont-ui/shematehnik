# UCP Web

Build, run and verify the UCP web frontend (React + TypeScript + Vite) in `platform_app/web/`.

## Steps

```bash
cd D:/shemaTehnik/platform_app/web
npm install 2>&1 | tail -3          # only first time / after deps change
npm run build 2>&1 | tail -15       # tsc -b (strict) + vite build → dist/
```

Dev server (background) + smoke check:

```bash
cd D:/shemaTehnik/platform_app/web
(npm run dev > /tmp/vite.log 2>&1 &) ; sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
```

## Browser verification (optional)

Use `browser-harness` to open `http://localhost:5173`, click through `.tree-row`
nodes, and capture `window.__err` (install onerror/unhandledrejection/console.error
collectors first). Expect 0 JS errors and CRC-32("123456789")=0xCBF43926.

Stop dev server when done: `taskkill //F //IM node.exe`.

## Report

- TypeScript errors (file:line)
- Whether `dist/` was produced and bundle size
- Per-module render status + total JS error count if browser-tested

## Notes

- Architecture: оболочка повторяет `app/main_window.cpp` 1:1 — see wiki [Web Frontend](../../platform_app/wiki/modules/web_frontend.md).
- Adding a module: запись в `src/data/modules.ts` (`MODULE_TREE`) + ветка в `src/modules/index.tsx` (`ModuleView`) + `*View.tsx`.
- Views use mock data; porting real logic = translate from `platform_app/modules/<id>/`.
- Do NOT commit `node_modules/`, `dist/`, `*.tsbuildinfo` (already in `.gitignore`).
