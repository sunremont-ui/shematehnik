# UCP Web Implement: Pin Planner

Phase 17.2 (`platform_app/wiki/roadmap-web.md`): maintain the Pin Planner module.

## Scope

- `platform_app/web/src/pinplanner.ts` — pure MCU pinout model, assignment validation, generated init code.
- `platform_app/web/src/modules/PinPlannerView.tsx` — React UI for MCU selection, package SVG, pin assignment, conflicts, and generated code.
- `platform_app/web/src/pinplanner.test.ts` — Vitest vectors.
- `platform_app/web/e2e/smoke.spec.ts` — module count/open-all list and Pin Planner smoke.

## Rules

- Keep MCU data compact and honest; do not claim complete CubeMX coverage.
- Keep conflict logic testable in pure TS.
- Allow repeated GPIO functions, but detect duplicate unique peripheral functions.
- Generate practical starter code for STM32 HAL, Arduino, and ESP-IDF with comments for alternate peripheral setup.
- After changes, update `roadmap-web.md`, `log.md`, `modules/web_frontend.md`, `web/README.md`, and `wiki/skills.md`.

## Validation

Run:

```bash
cd platform_app/web
npm.cmd test
npm.cmd run build
```

UI check: open `?module=pinplanner`; verify the package SVG, issue table, generated code, and export button.
