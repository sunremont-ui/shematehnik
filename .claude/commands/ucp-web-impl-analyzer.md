# UCP Web Implement: Protocol Analyzer — Real Decode

Phase 15.2 (`wiki/roadmap-web.md`). Analyzer today is a demo. Make it decode a
real byte stream using the packet definition from Packet Editor — the
cross-module chain Packet Editor → UART Monitor → Analyzer, no hardware needed.

## Target files

- `platform_app/web/src/modules/protocol_family.tsx` — AnalyzerView + UART capture
- `platform_app/web/src/design.ts` — `packet` store (уже есть); add `capture` store (байты из UART Monitor)
- `platform_app/web/src/codegen.ts` or new `src/decode.ts` — `decodePackets()`

## Design

1. **Capture store**: UART Monitor пишет принятые байты (реальные из Web Serial,
   когда есть /ucp-web-impl-serial, или симулированные) в кольцевой буфер
   `capture` (design.ts), кнопка "Send to Analyzer" / автоматически.
2. **decodePackets(bytes, packet)**: скан потока по описанию пакета из стора
   `packet` (поля: name/size/type, big-endian — как в `genPacketStruct`):
   - sync по магическому первому полю, если есть; иначе скользящее окно по длине пакета
   - проверка CRC, если поле `crc` есть (переиспользуй `crc()` из ядра — тот же
     полином, что в `genProtoParser`)
   - результат: `{offset, fields: {name: value}, crcOk}[]` + остаток ("garbage")
3. **AnalyzerView**: hex-дамп с подсветкой полей по цветам, таблица декодированных
   пакетов (поле→значение, CRC ✓/✗), вставка hex вручную (textarea) как
   альтернативный вход. Источник: capture | manual.

## Vitest

- Сгенерировать байты по описанию пакета → `decodePackets` возвращает те же значения
- Битый CRC → `crcOk: false`
- Мусор до/после пакета → правильный offset, мусор отделён

## After implementing

Tick 15.2, log entry, `/ucp-web`. В e2e добавить цепочку Packet→Analyzer
(задать поле, вставить hex, увидеть декод).
