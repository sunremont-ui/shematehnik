# UCP WASM core

Qt-free вычислительное ядро (`ucp_core.cpp`), собираемое в WebAssembly через
Emscripten + embind. Цель — чтобы веб-фронтенд считал теми же алгоритмами,
что и нативный десктоп (единый источник правды), а не дублировал логику.

## Что внутри

| Функция | Зеркало в C++ десктопа | JS API |
|---------|------------------------|--------|
| `crc_compute` | `CrcEngine` (`modules/codegen/codegen_module.cpp`) | `crc(bytes, poly, init, refIn, refOut, xorOut, bits)` |
| `pid_step` | `PidTunerView.simulate` / `PidCore` | `pidStep(kp, ki, kd, setpoint, steps)` |

## Сборка (требует emsdk — пока НЕ установлен)

```bash
# 1) поставить Emscripten один раз
git clone https://github.com/emscripten-core/emsdk ~/emsdk
cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest
source ~/emsdk/emsdk_env.sh

# 2) собрать ядро
cd platform_app/web/wasm
./build.sh           # или: npm run build:wasm (из platform_app/web)
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
