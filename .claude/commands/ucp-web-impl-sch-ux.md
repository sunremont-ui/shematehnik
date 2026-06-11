# UCP Web Implement: Schematic UX

Phase 13 (`wiki/roadmap-web.md`). Editor ergonomics: multi-select, copy/paste,
junction dots, inline value edit, ERC pin types.

## Target files

- `platform_app/web/src/modules/SchematicView.tsx` — interaction
- `platform_app/web/src/project.ts` — pin types, ERC
- `platform_app/web/src/data/library.ts` — pin metadata

## 13.1 Multi-select

- Рамка выделения (mousedown на пустом месте + drag) → `selected: Set<ref>`;
  Shift+click добавляет. Групповое перемещение (drag любого выделенного — все
  двигаются, провода переразводятся), Del — удалить все.
- Undo: групповое перемещение = 1 шаг (история уже коалесит drag — проверь).

## 13.2 Copy/paste

- Ctrl+C: сериализовать выделенные компоненты + провода между ними (внутренние).
- Ctrl+V: вставить со смещением +2 клетки, новые ref через `nextRef` (R1→R5),
  провода перенаправить на новые ref. Не использовать системный clipboard
  (достаточно модульной переменной), но Ctrl+C/V слушать на контейнере с фокусом.

## 13.3 Junction dots

- Сейчас провод = pin↔pin, T-соединения видны только логически. Рисовать точку
  (кружок r=3, var(--accent)) там, где ≥3 сегмента разных проводов одной цепи
  сходятся в одной точке сетки. Чистый рендер-хелпер `findJunctions(wires) → Point[]` + Vitest.

## 13.4 Inline value/ref edit

- Двойной клик по компоненту → маленький `<input>` поверх (foreignObject или
  абсолютный div) для value; Enter/blur — применить (через update модели → undo).
  Двойной клик по ref-тексту — правка ref (валидация уникальности).

## 13.5 ERC pin types

- `LibPart` + `pinsOf`: добавить типы пинов `power_in | power_out | in | out | passive`
  (для U-частей из библиотеки: VCC/GND = power_in; default passive).
- ERC-проверки (рядом с существующей «висящие выводы»):
  `out↔out` в одной цепи → error; `power_in` без `power_out`/источника в цепи → warning.
- Подсветка как текущий ERC + список в панели.

## Vitest

- findJunctions: T-образное соединение → 1 точка, прямой провод → 0
- paste: ref-переименование + перенаправление проводов
- ERC: two outputs on one net → error; powered net → clean

## After implementing

Tick 13.1–13.5 (коммит на пункт), log entries, `/ucp-web`.
