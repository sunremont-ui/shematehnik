# UCP Implement: WASM Build

Add Qt for WebAssembly build support with feature guards and CI job.

## Target files

- `platform_app/cmake/wasm.cmake` (new) — toolchain + emscripten settings
- `platform_app/CMakeLists.txt` — WASM-aware feature guards
- `.github/workflows/ci.yml` — new `wasm` job
- All modules — audit and guard QProcess / QSerialPort usage

## Step 1: `cmake/wasm.cmake` toolchain file

```cmake
# Usage: cmake -B build-wasm -DCMAKE_TOOLCHAIN_FILE=cmake/wasm.cmake
set(CMAKE_SYSTEM_NAME Emscripten)
set(CMAKE_SYSTEM_VERSION 1)

# Expect EMSDK env var pointing to emsdk root
if(NOT DEFINED ENV{EMSDK})
    message(FATAL_ERROR "EMSDK environment variable not set")
endif()

set(EMSCRIPTEN_ROOT "$ENV{EMSDK}/upstream/emscripten")
set(CMAKE_C_COMPILER   "${EMSCRIPTEN_ROOT}/emcc")
set(CMAKE_CXX_COMPILER "${EMSCRIPTEN_ROOT}/em++")
set(CMAKE_AR           "${EMSCRIPTEN_ROOT}/emar")
set(CMAKE_RANLIB       "${EMSCRIPTEN_ROOT}/emranlib")

# Qt wasm kit path — override with -DQT_WASM_ROOT=...
if(NOT DEFINED QT_WASM_ROOT)
    set(QT_WASM_ROOT "$ENV{HOME}/Qt/6.6.0/wasm_singlethread")
endif()
set(CMAKE_PREFIX_PATH "${QT_WASM_ROOT}")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
```

## Step 2: CMakeLists.txt — WASM guards

Add at top after `project()`:
```cmake
if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    set(UCP_WASM ON)
    message(STATUS "Building for WebAssembly")
endif()
```

Wrap QProcess-using targets:
```cmake
if(NOT UCP_WASM)
    # OTA flash uses QProcess — exclude from WASM build
    target_sources(ucp_modules PRIVATE modules/ota/ota_flash_module.cpp)
endif()
```

Emscripten linker flags for Qt6:
```cmake
if(UCP_WASM)
    target_link_options(ucp PRIVATE
        "SHELL:-s WASM=1"
        "SHELL:-s TOTAL_MEMORY=256MB"
        "SHELL:-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
        "--bind"
    )
endif()
```

## Step 3: Source guards

In every file that uses QProcess or QSerialPort, wrap with:
```cpp
#ifndef Q_OS_WASM
// ... QProcess / QSerialPort code ...
#endif
```

Files to audit:
- `modules/ota/ota_flash_module.cpp` — entire file
- `modules/protocol/protocol_module.cpp` — QSerialPort sections (already `#ifdef HAS_QT_SERIALPORT`)
- `app/main_window.cpp` — check for QProcess use

## Step 4: GitHub Actions CI job

Add to `.github/workflows/ci.yml`:
```yaml
wasm:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install emsdk
      run: |
        git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
        ~/emsdk/emsdk install latest
        ~/emsdk/emsdk activate latest
    - name: Install Qt for WASM
      run: |
        pip install aqtinstall
        aqt install-qt linux desktop 6.6.0 wasm_singlethread -O ~/Qt
    - name: Configure
      run: |
        source ~/emsdk/emsdk_env.sh
        cmake -B build-wasm \
          -DCMAKE_TOOLCHAIN_FILE=cmake/wasm.cmake \
          -DQT_WASM_ROOT=~/Qt/6.6.0/wasm_singlethread \
          -DCMAKE_BUILD_TYPE=Release
    - name: Build
      run: |
        source ~/emsdk/emsdk_env.sh
        cmake --build build-wasm --parallel
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: ucp-wasm
        path: build-wasm/ucp.*
```

## Step 5: WASM-only main entry

Qt WASM requires `EMSCRIPTEN_KEEPALIVE` and `emscripten_set_main_loop`. Qt handles this automatically when linking with `Qt6::Core`. No changes to `main.cpp` needed if using `QApplication`.

## Acceptance criteria
- `cmake -DCMAKE_TOOLCHAIN_FILE=cmake/wasm.cmake` configures without errors
- Build produces `ucp.html`, `ucp.wasm`, `ucp.js`
- No QProcess / QSerialPort compilation errors on WASM
- CI wasm job passes (can be allowed to fail initially with `continue-on-error: true`)

## After implementing
Mark `[ ] WASM` done in `wiki/roadmap.md` v2.0 section.
