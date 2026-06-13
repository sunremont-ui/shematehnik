# UCP Web Implement: Logic Analyzer

Phase 17.4 (`platform_app/wiki/roadmap-web.md`): maintain the Logic Analyzer module in the Protocol family.

## Scope

- `platform_app/web/src/logic.ts` -- pure signal model, CSV/VCD import, time formatting, UART/I2C/SPI decode.
- `platform_app/web/src/modules/LogicAnalyzerView.tsx` -- React UI for import, timing canvas, zoom/pan, cursors, decode controls, annotations export.
- `platform_app/web/src/logic.test.ts` -- Vitest vectors.
- `platform_app/web/e2e/smoke.spec.ts` -- module count/open-all list and Logic Analyzer smoke.

## Rules

- Keep parsers and decoders deterministic and testable outside React.
- Treat imported sample timestamps as source truth; do not silently rescale without preserving units.
- Keep UART/I2C/SPI decode assumptions visible in labels and tests.
- For VCD, prefer compact supported syntax over pretending to be a full simulator waveform database.
- After changes, update `roadmap-web.md`, `log.md`, `modules/web_frontend.md`, `web/README.md`, and `wiki/skills.md`.

## Validation

Run:

```bash
cd platform_app/web
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "Logic Analyzer"
```

UI check: open `?module=logic`; verify imported demo waveform, timing canvas, cursor delta, UART/I2C/SPI annotations, and `Download annotations.csv`.
