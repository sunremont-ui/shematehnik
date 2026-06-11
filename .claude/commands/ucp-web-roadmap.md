# UCP Web Roadmap Dashboard

Display progress for the web frontend roadmap (cycle 2, phases 10–17).

## Steps

1. Read `platform_app/wiki/roadmap-web.md`
2. Phases 0–8 are done, 9 cancelled. For phases 10–17 count `[x]` vs `[ ]` items
3. Show a compact dashboard

## Output format

```
UCP Web Roadmap — цикл 2
─────────────────────────────────────────
Фазы 0–8     ████████████████████  DONE   (оболочка→WASM→модель→fab→«по-настоящему»)
Фаза 10 🔌   ░░░░░░░░░░░░░░░░░░░░  0/4    Web Serial: UART, PID live, esptool-js OTA
Фаза 11 📈   ░░░░░░░░░░░░░░░░░░░░  0/4    SPICE 2.0: диод, BJT/MOSFET, sweep, курсоры
Фаза 12 🟩   ░░░░░░░░░░░░░░░░░░░░  0/5    PCB Pro: clearance-DRC, ручные дорожки, pour, P&P
Фаза 13 ✏️   ░░░░░░░░░░░░░░░░░░░░  0/5    Schematic UX
Фаза 14 📚   ░░░░░░░░░░░░░░░░░░░░  0/3    Библиотека: custom parts, .kicad_sym
Фаза 15 🔁   ░░░░░░░░░░░░░░░░░░░░  0/3    FSM-генератор, Analyzer, AI (опц.)
Фаза 16 🧹   ░░░░░░░░░░░░░░░░░░░░  0/6    .ucp v2, code-split, PWA, palette
Фаза 17 ➕   ░░░░░░░░░░░░░░░░░░░░  0/6    Новые модули
─────────────────────────────────────────
Next up: <первый незакрытый пункт> → /ucp-web-impl-<skill>
```

4. Suggest the next unchecked item and name its `/ucp-web-impl-*` skill.

## Logging convention (применяется всеми /ucp-web-impl-* скиллами)

After each completed item:
1. Tick `[x]` in `platform_app/wiki/roadmap-web.md`
2. Add an entry to `platform_app/wiki/log.md`: `## [date] feature | Web — <item>` —
   what was done, key files, test counts, commit hash
3. Commit + push (see `/git`)
