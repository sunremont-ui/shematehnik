# UCP Implement: Project Autosave

Save project to `<name>.ucp.bak` every 5 minutes via QTimer.

## Target files

- `platform_app/app/main_window.h/.cpp` — add autosave timer

## Design

```cpp
// MainWindow
QTimer* m_autosaveTimer = nullptr;

// in constructor, after project loaded:
m_autosaveTimer = new QTimer(this);
m_autosaveTimer->setInterval(5 * 60 * 1000); // 5 min
connect(m_autosaveTimer, &QTimer::timeout, this, &MainWindow::autosave);
m_autosaveTimer->start();

void MainWindow::autosave() {
    if (m_project->filePath().isEmpty()) return; // unsaved new project
    QString bakPath = m_project->filePath() + ".bak";
    m_project->saveToFile(bakPath);
    statusBar()->showMessage(tr("Autosaved"), 3000);
}
```

Reset timer on manual save (Ctrl+S) so autosave doesn't fire right after user saves.

## Implementation steps

1. Add `QTimer* m_autosaveTimer` to `MainWindow`
2. Initialize and connect in constructor
3. In `slotSave()`: call `m_autosaveTimer->start()` to reset the 5-min countdown
4. Implement `autosave()` slot: guard empty path, save to `.bak`, show status message
5. Run `/ucp-test`

## After implementing

Mark `[ ] Project autosave` done in `wiki/roadmap.md` v1.3 section.
