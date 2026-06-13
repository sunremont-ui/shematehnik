---
name: ucp-web-ee-calculators
description: Implement, extend, or repair the UCP web EE Calculators module in D:\shemaTehnik\platform_app\web. Use when working on voltage divider, LED resistor, IPC-2221 PCB trace width, LDO thermal calculations, calculator UI, Vitest vectors, Playwright smoke tests, or roadmap/wiki updates for phase 17.3.
---

# UCP Web EE Calculators

Use this skill for the phase 17.3 EE Calculators module.

## Workflow

1. Read the current state:
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/modules/web_frontend.md`
   - `platform_app/web/src/eecalc.ts`
   - `platform_app/web/src/modules/EeCalculatorsView.tsx`
   - `platform_app/web/src/data/modules.ts`
   - `platform_app/web/e2e/smoke.spec.ts`
2. Keep calculator formulas in `src/eecalc.ts`.
   - `calculateVoltageDivider()` handles loaded/unloaded dividers.
   - `calculateLedResistor()` sizes nominal and nearest E12 LED resistors.
   - `calculateTraceWidth()` uses IPC-2221 external/internal constants.
   - `calculateLdoThermal()` estimates dissipation, junction temperature, and margin.
3. Keep the React view thin.
   - `EeCalculatorsView.tsx` should expose editable inputs, computed result tables, compact SVG indicators, and report export.
   - Do not hide formula assumptions; use labels such as IPC-2221, theta JA, E12, and LDO status.
4. Add Vitest vectors in `src/eecalc.test.ts` for every non-trivial formula branch or new calculator.
5. Update:
   - `MODULE_TREE`, `ModuleKind`, and `ModuleView` if adding module ids.
   - `e2e/smoke.spec.ts` module count, open-all list, and EE Calculators smoke.
   - `wiki/roadmap-web.md`, `wiki/log.md`, `wiki/modules/web_frontend.md`, `web/README.md`, and `wiki/skills.md`.

## Validation

Run from `platform_app/web`:

```bash
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "EE Calculators"
```

For manual UI smoke, open `?module=eecalc` and verify:

- `h1` is `EE Calculators`.
- `.tree-row` count matches the current `MODULE_COUNT`.
- `svg[aria-label="Voltage divider ratio"]` exists.
- `svg[aria-label="Trace width cross-section"]` exists.
- `svg[aria-label="LDO thermal headroom"]` exists.
- `Download report.md` is visible.

## Notes

- Treat IPC-2221 width as a conservative planning estimate, not a board-fab guarantee.
- For LED resistors, prefer visible E-series choices over exact impractical values.
- For LDO thermal checks, make unsafe thermal headroom obvious in the UI and tests.
