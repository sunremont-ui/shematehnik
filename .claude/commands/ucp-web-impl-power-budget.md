# UCP Web Implement: Power Budget

Phase 17.5 (`platform_app/wiki/roadmap-web.md`): maintain the Power Budget module in the Code Generator family.

## Scope

- `platform_app/web/src/power.ts` -- pure load/rail model, default current estimates, rail grouping, warnings, CSV export.
- `platform_app/web/src/modules/PowerBudgetView.tsx` -- React UI for editable loads, rail budgets, summary bars, warning list, and CSV download.
- `platform_app/web/src/power.test.ts` -- Vitest vectors.
- `platform_app/web/e2e/smoke.spec.ts` -- module count/open-all list and Power Budget smoke.

## Rules

- Keep defaults conservative and clearly heuristic; real current measurements override guesses.
- Group rails only from explicit or obvious power-net labels (`VCC`, `3V3`, `5V`, `12V`, etc.).
- Surface unassigned/unknown loads as warnings, not hidden zeros.
- Make overload and low-margin states visible in both data and UI.
- After changes, update `roadmap-web.md`, `log.md`, `modules/web_frontend.md`, `web/README.md`, and `wiki/skills.md`.

## Validation

Run:

```bash
cd platform_app/web
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "Power Budget"
```

UI check: open `?module=powerbudget`; verify load table, rail budget inputs, summary bars, warning list, and `Download budget.csv`.
