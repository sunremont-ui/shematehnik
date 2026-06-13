# UCP Implement: CI — GitHub Actions

Set up GitHub Actions for automated build + test on Windows (MSYS2), Ubuntu, and macOS.

## Target

- `.github/workflows/ci.yml` in the repo root (`d:\shemaTehnik\`)
- 3 jobs: `windows-msys2`, `ubuntu`, `macos`
- Each: configure → build → ctest with QT_QPA_PLATFORM=offscreen

## Windows (MSYS2 MinGW64)

```yaml
windows-msys2:
  runs-on: windows-latest
  defaults:
    run:
      shell: msys2 {0}
  steps:
    - uses: msys2/setup-msys2@v2
      with:
        msystem: MINGW64
        update: true
        install: >-
          mingw-w64-x86_64-toolchain
          mingw-w64-x86_64-cmake
          mingw-w64-x86_64-ninja
          mingw-w64-x86_64-qt6-base
          mingw-w64-x86_64-qt6-svg
    - uses: actions/checkout@v4
    - name: Build
      run: |
        cd platform_app
        cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
        cmake --build build --parallel
    - name: Test
      run: |
        cd platform_app/build
        QT_QPA_PLATFORM=offscreen ctest --output-on-failure
```

## Ubuntu

```yaml
ubuntu:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install Qt6
      run: |
        sudo apt-get update
        sudo apt-get install -y \
          cmake ninja-build \
          qt6-base-dev libqt6svg6-dev \
          qt6-base-private-dev
    - name: Build
      run: |
        cd platform_app
        cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
        cmake --build build --parallel
    - name: Test
      run: |
        cd platform_app/build
        QT_QPA_PLATFORM=offscreen ctest --output-on-failure
```

## macOS

```yaml
macos:
  runs-on: macos-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install Qt6
      run: brew install qt6 cmake ninja
    - name: Build
      run: |
        cd platform_app
        cmake -B build -G Ninja \
          -DCMAKE_PREFIX_PATH=$(brew --prefix qt6) \
          -DCMAKE_BUILD_TYPE=Release
        cmake --build build --parallel
    - name: Test
      run: |
        cd platform_app/build
        QT_QPA_PLATFORM=offscreen ctest --output-on-failure
```

## Implementation steps

1. Create `.github/workflows/` directory in `d:\shemaTehnik\`
2. Write `ci.yml` combining all 3 jobs with `on: [push, pull_request]`
3. Push to GitHub remote (ask user for remote URL if not set)
4. Verify Actions tab shows green

## Notes
- `ucp_tests` (core only) does NOT need `QT_QPA_PLATFORM=offscreen`
- `ucp_smoke_tests` and `ucp_integration_tests` require it (widget creation)
- Add `set_tests_properties(CoreTests PROPERTIES ENVIRONMENT "")` to be explicit

## After implementing
Mark `[ ] CI: GitHub Actions` done in `wiki/roadmap.md` v0.9.1 section.
