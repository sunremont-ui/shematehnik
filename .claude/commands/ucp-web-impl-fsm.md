# UCP Web Implement: FSM Editor + C Code Generator

Phase 15.1 (`wiki/roadmap-web.md`). Program System today shows static FSM demos
(теплица/вентилятор/стиралка). Turn it into a visual FSM editor that generates
real C code — the switch-case pattern used in the dryer/iron firmware.

## Target files

- `platform_app/web/src/modules/ProgramsView.tsx` — editor UI
- `platform_app/web/src/design.ts` — new `fsm` store (same useSyncExternalStore pattern as `uiDesign`/`packet`)
- `platform_app/web/src/codegen.ts` — `genFsm()`

## Data model (in design.ts)

```ts
interface FsmState { id: string; name: string; x: number; y: number; entry?: string; }
interface FsmTransition { from: string; to: string; event: string; guard?: string; action?: string; }
interface FsmDesign { name: string; states: FsmState[]; transitions: FsmTransition[]; initial: string; }
```

Seed with the existing демо-автоматы (теплица и т.д.) as presets.

## Editor (SVG, как Schematic)

- Состояния — перетаскиваемые узлы (кружки/скругл. прямоугольники), двойной клик — переименовать.
- Переходы — режим «стрелка»: клик из→в, подпись `event [guard] / action`; самопереходы петлёй.
- Кнопки: Add State, Set Initial, Delete; пресеты в выпадающем списке.

## genFsm() — C switch-case

Generate the same shape as the soldering-iron firmware FSM
(см. memory [[project-soldering-iron]] / `concepts/stm32-firmware-architecture.md`):

```c
typedef enum { ST_IDLE, ST_HEAT, ... } fsm_state_t;
typedef enum { EV_NONE, EV_BTN, ... } fsm_event_t;
fsm_state_t fsm_step(fsm_state_t s, fsm_event_t ev) {
    switch (s) {
    case ST_IDLE:
        if (ev == EV_BTN) { /* action */ return ST_HEAT; }
        break;
    ...
    }
    return s;
}
```

+ header с enum'ами; guard → `if (ev == X && (guard))`. Кнопка Export C → `downloadText`.

## Vitest (codegen.test.ts)

- 3 состояния / 3 перехода → компилируемый по структуре C (все states/events в enum, каждый переход в своём case)
- guard и action попадают в условие/тело
- initial state в комментарии/`FSM_INITIAL` define

## After implementing

Tick 15.1, log entry, `/ucp-web`. Бонус-связка: пресет FSM сушилки из
[[project-filament-dryer]] — кросс-модуль с Firmware Project.
