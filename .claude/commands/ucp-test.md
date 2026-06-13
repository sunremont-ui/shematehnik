# UCP Test

Build (if needed) and run all three test suites for the UCP platform.

## Steps

```bash
export PATH="/c/msys64/mingw64/bin:$PATH"
cd D:/shemaTehnik/platform_app/build
cmake --build . --parallel 2>&1 | tail -10

QT_QPA_PLATFORM=offscreen ctest --output-on-failure -V 2>&1
```

Report for each suite (CoreTests, SmokeTests, IntegrationTests):
- PASS / FAIL status
- Which specific tests failed and the assertion message
- Total passed / total tests ratio

If any tests fail, analyze root cause and fix the source. Re-run to confirm green.

## Test suites

| Suite | Binary | Coverage |
|-------|--------|---------|
| CoreTests | `ucp_tests` | Module tree, EventBus |
| SmokeTests | `ucp_smoke_tests` | All 20 module types factory + init + widget |
| IntegrationTests | `ucp_integration_tests` | CRC, PID, Schematic, PCB |
