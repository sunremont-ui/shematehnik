# ============================================================
# WASM-сборка вычислительного ядра UCP (Emscripten + embind).
# Требует emsdk. Сборка: см. build.sh / README.md.
# Выход: ../public/wasm/ucp_core.js + ucp_core.wasm (ES-модуль).
# В public/, чтобы Vite копировал артефакты в dist/ дословно (нужно для прода).
# ============================================================
cmake_minimum_required(VERSION 3.20)
project(ucp_core_wasm CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "Configure with emcmake: `emcmake cmake -B build`")
endif()

add_executable(ucp_core ucp_core.cpp ucp_csg.cpp bindings.cpp)

target_link_options(ucp_core PRIVATE
    "-lembind"
    "-sMODULARIZE=1"
    "-sEXPORT_ES6=1"
    "-sENVIRONMENT=web"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sEXPORT_NAME=createUcpCore"
)

set_target_properties(ucp_core PROPERTIES
    OUTPUT_NAME "ucp_core"
    SUFFIX ".js"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../public/wasm"
)
