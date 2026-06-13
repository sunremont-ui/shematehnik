# UCP Implement: Project Save/Load UI

> **STATUS: ✓ DONE** — Was already fully implemented in `main_window.cpp` (confirmed 2026-05-17): Ctrl+S/O wired, QFileDialog, `"[*]"` title indicator, `onProjectModified()`.

Wire `Project::save()` / `Project::load()` to MainWindow File menu so the full module tree persists to disk.

## Current state

- `platform_app/core/project.h` / `project.cpp`: `Project` class with `save(path)` / `load(path)` methods
- `platform_app/app/main_window.h` / `main_window.cpp`: MainWindow with module tree and workspace
- Each module has `serialize()` → `QJsonObject` and `deserialize(QJsonObject)`
- Problem: File→Save/Open in MainWindow are likely stubs or absent

## Read these files first
- `platform_app/core/project.h`
- `platform_app/core/project.cpp`
- `platform_app/app/main_window.h`
- `platform_app/app/main_window.cpp`

## Implementation plan

### 1. `Project::save(path, rootModule)` enhancement
If Project doesn't already walk the module tree:
```cpp
void Project::save(const QString &path, Module *root) {
    QJsonObject obj;
    obj["name"]    = m_name;
    obj["version"] = m_version;
    obj["tree"]    = serializeTree(root);
    // write to file...
}

static QJsonObject serializeTree(Module *m) {
    QJsonObject obj = m->serialize();
    obj["type"] = ModuleFactory::instance().typeOf(m); // need typeOf()
    QJsonArray children;
    for (int i = 0; i < m->childCount(); i++)
        children.append(serializeTree(m->childAt(i)));
    obj["children"] = children;
    return obj;
}
```

### 2. `Project::load(path, rootModule)` enhancement
Deserialize recursively, use `ModuleFactory::create(type)` to recreate child modules.

### 3. Wire MainWindow

In `main_window.cpp`, add File menu actions:
- **Save** (Ctrl+S): `QFileDialog::getSaveFileName(…, "*.ucp")` → `m_project.save(path, m_rootModule)`
- **Open** (Ctrl+O): `QFileDialog::getOpenFileName(…, "*.ucp")` → clear workspace → `m_project.load(path, m_rootModule)` → rebuild tabs
- **Recent files**: store last 5 paths in `QSettings`

### 4. Modified indicator
Set window title to `"UCP — <name> [*]"` using `setWindowModified(true)` when any module emits `modified()`.

### 5. Integration test
Add `project_save_load_roundtrip` in `test_integration.cpp`:
- Create module tree programmatically
- Save to temp file
- Load into new tree
- Verify module names and child counts match

## Acceptance criteria
- Ctrl+S prompts for `.ucp` file name and saves JSON
- Ctrl+O loads the file and restores module state
- Window title shows `[*]` when unsaved changes exist
- Test passes

## After implementing
Mark `[ ] Project save/load wired to UI` done in `wiki/roadmap.md` v1.0 section.
