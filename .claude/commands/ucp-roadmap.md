# UCP Roadmap Dashboard

Display the current roadmap status for the Universal Controller Platform.

## Steps

1. Read `platform_app/wiki/roadmap.md`
2. Count items by status (✓ done, ○ planned, ◇ stretch) per milestone
3. Show a compact dashboard

## Output format

```
UCP Roadmap — v3.0.0 COMPLETE
─────────────────────────────────────────
v0.1–v0.9.1  ████████████████████  DONE
v1.0         ████████████████████  DONE
v1.1         ████████████████████  DONE
v1.2         ████████████████████  DONE
v1.3         ████████████████████  DONE
v2.0         ████████████████████  DONE (AI, OTA, WASM, UI Designer v2)
v3.0         ████████████████████  DONE (NavList, ScrollPanel, навигация lv_scr_load_anim)

Stretch (not started):
  ◇ Collaborative editing (WebSocket / CRDT)
  ◇ Cloud component library sync
─────────────────────────────────────────
ENTIRE ROADMAP v0.1→v3.0 COMPLETE.
```

Show any remaining stretch items and ask the user if they'd like to start on those or open a new roadmap cycle.
