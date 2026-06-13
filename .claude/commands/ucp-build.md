# UCP Build

Build the Universal Controller Platform project using CMake + Ninja.

## Steps

1. Ensure MSYS2 MinGW64 is in PATH: `C:\msys64\mingw64\bin`
2. Configure (if needed) and build in `platform_app/build/`

```bash
export PATH="/c/msys64/mingw64/bin:$PATH"
cd D:/shemaTehnik/platform_app
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release 2>&1 | tail -5
cmake --build build --parallel 2>&1
```

Report:
- Any compiler errors (file:line format)
- Warnings count
- Whether the executable `build/ucp.exe` was produced
- Whether all test targets built (`ucp_tests`, `ucp_smoke_tests`, `ucp_integration_tests`)

If there are errors, analyze and fix them directly. Prefer targeted fixes over broad changes.
