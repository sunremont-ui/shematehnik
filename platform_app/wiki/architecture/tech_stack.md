# Tech Stack

## Core

| Component | Choice | Why |
|-----------|--------|-----|
| Language | C++17 | Performance, Qt compatibility, KiCad/FreeCAD interop |
| GUI | Qt6 (Widgets) | Native look, QGraphicsScene для схем/PCB, mature |
| Build | CMake 3.20+ | Cross-platform, de facto standard for C++ |
| IDE | Qt Creator / VS Code | — |

## 3D Engine

| Component | Choice | Why |
|-----------|--------|-----|
| CAD kernel | OpenCASCADE | FreeCAD uses it, STEP export, boolean ops |
| Viewer | Qt3D / OpenGL | 3D viewport in widget |

## Simulation

| Component | Choice | Why |
|-----------|--------|-----|
| SPICE | ngspice (libngspice) | Open-source, Berkeley SPICE, in-process API |
| MCU (future) | avr8js via QWebEngine | Wokwi's engine, or QEMU for ESP32 |
| Graphs | QCustomPlot | Fast, native Qt, no OpenGL dependency |

## Storage

| Component | Choice | Why |
|-----------|--------|-----|
| Project format | JSON (.ucp) | Human-readable, diffable, no binary blobs |
| Persistence | NVS (ESP32) / JSON file (desktop) | Matches target hardware |

## Other

| Component | Choice | Why |
|-----------|--------|-----|
| Unit tests | QtTest / Google Test | — |
| Web view | Qt6 WebEngine | For Mermaid diagrams, Wokwi iframe |
| Serial | QSerialPort | Built into Qt6 |
