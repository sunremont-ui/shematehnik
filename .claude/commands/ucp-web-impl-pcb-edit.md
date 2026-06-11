# UCP Web Implement: PCB Editing — Manual Tracks, Pour, Outline, Silkscreen, P&P

Phase 12.2–12.5 (`wiki/roadmap-web.md`). PCB today is fully auto (A* in
`src/routing.ts`); add manual control and complete the fab outputs.

## Target files

- `platform_app/web/src/modules/PcbView.tsx` — interaction + render
- `platform_app/web/src/project.ts` — track/outline data in the model (undo/redo подхватит автоматически — проверь, что снапшоты истории включают новые поля)
- Gerber/Excellon export — где сейчас `exportGerber` (PcbView/util)

## 12.2 Manual track editing

- Tracks become first-class model objects (если сейчас разводятся на лету —
  персистни результат: `tracks: {net, layer, points[]}[]` в `UcpProject`).
- Select track segment (click, hit-test с допуском) → highlight; Drag
  perpendicular — двигает сегмент (соседние сегменты растягиваются, ортогональность сохраняется);
  Del — удалить дорожку (цепь вернётся в ratsnest); R на выделенной — переразвести A*.
- "Route all" / "Unroute all" buttons остаются.

## 12.3 Copper pour (GND)

- Button "Pour GND (F.Cu)": прямоугольник платы минус (другие цепи: дорожки/пады,
  раздутые на clearance). Растеризованный подход: сетка 0.5мм, заливка→вычитание→
  контуры островов (marching squares или просто прямоугольные полосы).
- Pads of GND net connect directly (без термобарьеров в первой версии — пометить ограничение).
- Render полупрозрачно; в Gerber — полигональная заливка (G36/G37 region).

## 12.4 Board outline + silkscreen

- `UcpProject.board?: {w, h}` (мм) + UI поля; default = bbox футпринтов + поля.
- Gerber: `Edge.Cuts` файл (контур) + `F.Silkscreen` (ref-текст над футпринтами —
  Gerber текст делается штрихами; проще: ref как набор линий из мини-векторного шрифта,
  допустимо ограничиться рамками + ref в виде апертурных flash-комментариев первой версией — зафиксируй выбор).

## 12.5 Pick-and-place CSV

- `Ref,Val,Package,PosX,PosY,Rot,Side` (KiCad-формат, мм, origin = левый нижний угол платы).
- Поворот из `SchComponent.rot` (см. `/ucp-impl-component-rotation` историю), Side: F.Cu/B.Cu.
- Кнопка рядом с BOM CSV.

## Vitest

- Track persist round-trip `.ucp`; drag segment keeps orthogonality (pure helper)
- Pour: остров не пересекает чужие дорожки (мин. дистанция ≥ clearance)
- P&P: known project → exact CSV string

## After implementing

Tick 12.2–12.5 (можно по одному, коммит на пункт), log entries, `/ucp-web`.
