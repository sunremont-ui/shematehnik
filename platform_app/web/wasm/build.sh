#!/usr/bin/env bash
# Build the UCP WASM core. Requires emsdk activated in this shell:
#   source ~/emsdk/emsdk_env.sh
# Output: ../src/core/generated/ucp_core.js + ucp_core.wasm
set -e
cd "$(dirname "$0")"

if ! command -v emcc >/dev/null 2>&1; then
  echo "emcc not found. Install Emscripten first:"
  echo "  git clone https://github.com/emscripten-core/emsdk ~/emsdk"
  echo "  cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest"
  echo "  source ~/emsdk/emsdk_env.sh"
  exit 1
fi

emcmake cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
echo "OK -> ../public/wasm/ucp_core.js"
