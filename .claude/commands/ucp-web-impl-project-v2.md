# UCP Web Implement: .ucp v2 — Unified Project File

Phase 16.1 (`wiki/roadmap-web.md`). `.ucp` today stores only
components/wires/labels; `uiDesign`, `packet` (и будущие fsm/userParts) живут
отдельно — Save/Open теряет половину работы. Include all artifacts + migrate v1.

## Target files

- `platform_app/web/src/project.ts` — `serialize`/`deserialize`
- `platform_app/web/src/design.ts` — экспорт snapshot/restore для сторов
- автосейв в `App.tsx`/`store.ts` (где debounce 800мс)

## Design

```ts
interface UcpFileV2 {
  version: 2;
  project: UcpProject;            // components, wires, labels (+tracks/board из фазы 12, userParts из 14)
  design: {
    uiDesign?: UiDesign;
    packet?: PacketDef;
    fsm?: FsmDesign;              // когда появится (15.1)
    pid?: PidParams;              // параметры PID Tuner
  };
}
```

- `serialize()` собирает всё; `deserialize()`:
  - **v1** (нет `version` / version 1 — массивные поля на верхнем уровне) → читать как раньше, design-поля не трогать
  - **v2** → restore сторов design.ts (`uiDesign.set(...)` и т.д.)
- Автосейв localStorage — тот же v2-снапшот; restore при загрузке.
- design.ts: каждому стору добавить `snapshot()`/`restore(v)` рядом с `set`,
  чтобы project.ts не лез во внутренности.
- undo/redo НЕ расширять на design-сторы в этом пункте (объём); зафиксировать ограничение.

## Vitest

- v2 round-trip: project + uiDesign + packet → serialize → deserialize → идентично
- v1-фикстура (текущий формат) открывается без ошибок, design-сторы не затронуты
- автосейв-снапшот = serialize (один формат)

## After implementing

Tick 16.1, log entry, `/ucp-web` (e2e: Save→Open сохраняет виджеты UI Designer).
