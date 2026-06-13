# UCP Implement: OTA Flash

Flash ESP32 firmware (.bin) from within UCP via esptool.py subprocess.

## Target files

- `platform_app/modules/ota/ota_flash_module.h` (new)
- `platform_app/modules/ota/ota_flash_module.cpp` (new)
- `platform_app/CMakeLists.txt` — add module sources
- `platform_app/tests/test_smoke.cpp` — add `OtaFlashModule` to ALL_MODULE_TYPES
- `platform_app/tests/test_integration.cpp` — add integration tests

## Architecture

```
OtaFlashModule
  └── widget(): QVBoxLayout
        ├── Port row: QComboBox (QSerialPortInfo list) + QPushButton "Refresh"
        ├── File row: QLineEdit + QPushButton "Browse..." (.bin)
        ├── Flash address: QLineEdit "0x0" (default)
        ├── QPushButton "Flash!" (disabled until port + file set)
        ├── QProgressBar (0–100, updated from esptool output)
        └── QTextEdit log (stdout/stderr from QProcess)
```

## Step 1: CMakeLists.txt

Add to ucp_modules sources:
```cmake
modules/ota/ota_flash_module.cpp
```

No new Qt deps needed — QProcess is in QtCore.
Guard with HAS_QT_SERIALPORT for port enumeration (port combo still shows if not available, just empty).

## Step 2: Header `ota_flash_module.h`

```cpp
#ifndef OTA_FLASH_MODULE_H
#define OTA_FLASH_MODULE_H

#include "../../core/module.h"
#include <QProcess>
#include <QTextEdit>
#include <QProgressBar>
#include <QComboBox>
#include <QLineEdit>
#include <QPushButton>

class OtaFlashModule : public Module {
    Q_OBJECT
public:
    explicit OtaFlashModule(Module *parent = nullptr);
    bool     init() override;
    QWidget *widget() override;
    QString  widgetTitle() const override { return "OTA Flash"; }

private slots:
    void onRefreshPorts();
    void onBrowse();
    void onFlash();
    void onProcessOutput();
    void onProcessFinished(int exitCode, QProcess::ExitStatus);

private:
    void parseProgress(const QString &line);

    QComboBox    *m_portCombo  = nullptr;
    QLineEdit    *m_filePath   = nullptr;
    QLineEdit    *m_flashAddr  = nullptr;
    QPushButton  *m_btnFlash   = nullptr;
    QProgressBar *m_progress   = nullptr;
    QTextEdit    *m_log        = nullptr;
    QProcess     *m_process    = nullptr;
};

#endif
```

## Step 3: Implementation `ota_flash_module.cpp`

### Port enumeration
```cpp
#ifdef HAS_QT_SERIALPORT
#include <QSerialPortInfo>
void OtaFlashModule::onRefreshPorts() {
    m_portCombo->clear();
    for (const auto &info : QSerialPortInfo::availablePorts())
        m_portCombo->addItem(info.portName());
}
#else
void OtaFlashModule::onRefreshPorts() { m_portCombo->addItem("(SerialPort not available)"); }
#endif
```

### Flash command
```cpp
void OtaFlashModule::onFlash() {
    QString port = m_portCombo->currentText();
    QString file = m_filePath->text();
    QString addr = m_flashAddr->text().isEmpty() ? "0x0" : m_flashAddr->text();

    if (port.isEmpty() || file.isEmpty()) return;

    m_log->clear();
    m_progress->setValue(0);
    m_btnFlash->setEnabled(false);

    m_process = new QProcess(this);
    connect(m_process, &QProcess::readyReadStandardOutput, this, &OtaFlashModule::onProcessOutput);
    connect(m_process, &QProcess::readyReadStandardError,  this, &OtaFlashModule::onProcessOutput);
    connect(m_process, QOverload<int,QProcess::ExitStatus>::of(&QProcess::finished),
            this, &OtaFlashModule::onProcessFinished);

    QStringList args = {
        "-m", "esptool",
        "--port", port,
        "--baud", "460800",
        "write_flash",
        "--flash_mode", "dio",
        addr, file
    };
    m_process->start("python", args);
}
```

### Progress parsing
esptool outputs lines like `Writing at 0x00010000... (12 %)`
```cpp
void OtaFlashModule::parseProgress(const QString &line) {
    static QRegularExpression re(R"(\((\d+)\s*%\))");
    auto m = re.match(line);
    if (m.hasMatch())
        m_progress->setValue(m.captured(1).toInt());
}
```

## Step 4: Integration test

```cpp
void TestIntegration::ota_module_widget_nonnull() {
    OtaFlashModule mod;
    mod.init();
    QWidget *w = mod.widget();
    QVERIFY(w != nullptr);
}

void TestIntegration::ota_progress_parse() {
    // Test parseProgress regex indirectly via a public helper or protected friend
    // Or just verify module constructs without crash
}
```

## Acceptance criteria
- widget() non-null (smoke test passes)
- Port list populated from QSerialPortInfo (or empty placeholder if no SerialPort)
- Flash button disabled until port + file both set
- QProcess command built correctly: `python -m esptool --port X ... write_flash addr file`
- Progress bar updates from esptool output `(N %)`
- Log shows full stdout/stderr

## After implementing
Mark `[ ] OTA Flash` done in `wiki/roadmap.md` v2.0 section.
