# UCP WASM core

Qt-free вычислительное ядро (`ucp_core.cpp`), собираемое в WebAssembly через
Emscripten + embind. Цель — чтобы веб-фронтенд считал теми же алгоритмами,
что и нативный десктоп (единый источник правды), а не дублировал логику.

## Что внутри

| Функция | Зеркало в C++ десктопа | JS API |
|---------|------------------------|--------|
| `crc_compute` | `CrcEngine` (`modules/codegen/codegen_module.cpp`) | `crc(bytes, poly, init, refIn, refOut, xorOut, bits)` |
| `pid_step` | `PidTunerView.simulate` / `PidCore` | `pidStep(kp, ki, kd, setpoint, steps)` |

## Сборка

Emscripten установлен в `~/emsdk` (emcc 5.0.7), ядро уже собрано в
`../src/core/generated/`. Пересобрать после изменения `*.cpp`:

```bash
# Linux / macOS / git-bash с extensionless emcc:
source ~/emsdk/emsdk_env.sh
cd platform_app/web && npm run build:wasm     # = bash wasm/build.sh

# Windows (git-bash, где emcc только .bat) — собирать через cmd:
#   set EM_CONFIG=%USERPROFILE%\emsdk\.emscripten
#   PATH += %USERPROFILE%\emsdk\upstream\emscripten;...\upstream\bin;C:\msys64\mingw64\bin
#   emcmake cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release && cmake --build build
```

Первичная установка emsdk (если переносить на другую машину):

```bash
git clone https://github.com/emscripten-core/emsdk ~/emsdk
cd ~/emsdk && python emsdk.py install latest && python emsdk.py activate latest
```

Результат — `../src/core/generated/ucp_core.js` + `ucp_core.wasm` (ES-модуль,
`MODULARIZE`, `EXPORT_ES6`, `EXPORT_NAME=createUcpCore`).

## Подключение

`src/core/ucpCore.ts` пытается динамически импортировать сгенерированный
модуль. Пока `generated/` пуст, ядро работает на **JS-фолбэке** (тот же
алгоритм на TypeScript), поэтому приложение собирается и работает уже сейчас.
После сборки WASM бэкенд переключается автоматически (бейдж `engine: wasm`).

Сгенерированные артефакты (`src/core/generated/`) в `.gitignore` — собираются
локально/в CI, в репозиторий не коммитятся.
