# UCP Web Implement: EE Calculators

Phase 17.3 (`platform_app/wiki/roadmap-web.md`): maintain the EE Calculators module.

## Scope

- `platform_app/web/src/eecalc.ts` — pure electronics calculator formulas.
- `platform_app/web/src/modules/EeCalculatorsView.tsx` — React UI for divider, LED resistor, trace width, LDO thermal, SVG indicators, and report export.
- `platform_app/web/src/eecalc.test.ts` — Vitest vectors for formulas.
- `platform_app/web/e2e/smoke.spec.ts` — module count/open-all list and EE Calculators smoke.

## Rules

- Keep formulas deterministic and unit-explicit.
- Treat IPC-2221 trace width as a planning estimate; do not present it as a fabrication guarantee.
- Prefer practical component choices such as nearest E12 LED resistor values and wattage margin.
- Keep LDO thermal safety visible through junction temperature, max current, margin, and status.
- After changes, update `roadmap-web.md`, `log.md`, `modules/web_frontend.md`, `web/README.md`, and `wiki/skills.md`.

## Validation

Run:

```bash
cd platform_app/web
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "EE Calculators"
```

UI check: open `?module=eecalc`; verify the divider ratio SVG, trace cross-section SVG, LDO thermal SVG, result tables, and `Download report.md`.
