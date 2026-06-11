# UCP Web Implement: Library — Custom Parts + .kicad_sym Import

Phase 14 (`wiki/roadmap-web.md`). Symbol Editor today draws «в никуда»; make it
produce real library parts, support `.kicad_sym` import, and grow the stock library.

## Target files

- `platform_app/web/src/data/library.ts` — `LIBRARY` (24 parts) + user parts layer
- `platform_app/web/src/modules/schematic_family.tsx` — Symbol Editor view
- `platform_app/web/src/project.ts` — `pinsOf`/`pinOffset` (custom kinds), import

## 14.1 Symbol Editor → user parts

- Editor form: name, category, kind base (R/C/L/D/Q/U), value, footprint,
  **pin count + pin positions** (для U-образных) — простая таблица пинов
  (number, name, side: left/right, offset).
- `userParts` store (pattern `src/design.ts`): persist в `localStorage`
  (`ucp.userParts`) + включить в `.ucp` сериализацию (`UcpProject.userParts?`),
  чтобы проект открывался на другой машине со своими деталями.
- `pinsOf`/`pinOffset` должны учитывать кастомные определения (lookup в userParts
  перед встроенной геометрией). Палитра Schematic показывает категорию "User".

## 14.2 Import .kicad_sym

- Парсер S-expr уже есть для `.kicad_sch` (`importKicadSch`) — переиспользуй
  токенизатор. Из `kicad_symbol_lib` извлекать: имя, пины (number/name/позиция),
  футпринт по умолчанию (`Footprint` property). Маппить на user part.
- File→Open диспетчеризует `.kicad_sym` → добавление в библиотеку (не в проект),
  статус «imported N symbols».

## 14.3 Расширение штатной библиотеки

- До ~50 деталей: больше корпусов R/C (0402/0603/1206), диоды (1N4007, TVS),
  транзисторы (BC547, AO3400, IRLZ44N), IC (LM317, TL431, 74HC595, CH340,
  MAX485, DS18B20, оптопара PC817), разъёмы (1x3..1x8, JST, microUSB, jack).
- Поиск/фильтр в палитре (input, фильтрация по name/value/desc).

## Vitest

- userParts round-trip через `.ucp` + localStorage
- `.kicad_sym`: фикстура с 2 символами → 2 user parts с верными пинами
- pinsOf для кастомного kind возвращает заданные пины

## After implementing

Tick 14.1–14.3 (коммит на пункт), log entries, `/ucp-web`.
