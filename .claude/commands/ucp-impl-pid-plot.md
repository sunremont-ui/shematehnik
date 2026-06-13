# UCP Implement: PID Live Plot

Add a real-time rolling chart (setpoint / input / output) to PidTunerModule using Qt6::Charts.

## Current state

- `platform_app/modules/pid/pid_tuner_module.cpp` (and `.h`)
- `PidCore` computes P/I/D and exposes `setpoint()`, `input()`, `output()` getters
- `PidTunerModule` has channels, sliders, simulation timer — but no chart

## Read these files first
- `platform_app/modules/pid/pid_tuner_module.h`
- `platform_app/modules/pid/pid_tuner_module.cpp`
- `platform_app/CMakeLists.txt` (to add Qt6::Charts)

## Step 1: CMakeLists.txt

In `platform_app/CMakeLists.txt`, add after the existing `find_package` lines:
```cmake
find_package(Qt6 COMPONENTS Charts QUIET)
if(TARGET Qt6::Charts)
    target_link_libraries(ucp_modules PUBLIC Qt6::Charts)
    target_compile_definitions(ucp_modules PRIVATE HAS_QT_CHARTS)
endif()
```

## Step 2: `PidTunerModule` header

Inside the `#ifdef HAS_QT_CHARTS` guard, add members:
```cpp
#ifdef HAS_QT_CHARTS
#include <QtCharts>
QLineSeries *m_seriesSetpoint = nullptr;
QLineSeries *m_seriesInput    = nullptr;
QLineSeries *m_seriesOutput   = nullptr;
QChart      *m_chart          = nullptr;
qreal        m_tAxis          = 0.0;  // rolling time in seconds
static constexpr qreal PLOT_WINDOW = 10.0;
#endif
```

## Step 3: Create chart widget in `widget()`

After building the existing channel/slider UI, append a chart pane:
```cpp
#ifdef HAS_QT_CHARTS
m_seriesSetpoint = new QLineSeries(); m_seriesSetpoint->setName("Setpoint");
m_seriesInput    = new QLineSeries(); m_seriesInput->setName("Input");
m_seriesOutput   = new QLineSeries(); m_seriesOutput->setName("Output");

m_chart = new QChart();
m_chart->addSeries(m_seriesSetpoint);
m_chart->addSeries(m_seriesInput);
m_chart->addSeries(m_seriesOutput);
m_chart->createDefaultAxes();
m_chart->setBackgroundBrush(QColor(0x0d1117));
m_chart->setTitleBrush(Qt::white);
m_chart->legend()->setLabelColor(Qt::white);
m_chart->axes(Qt::Horizontal).first()->setRange(0, PLOT_WINDOW);
m_chart->axes(Qt::Vertical).first()->setRange(-120, 120);

auto *chartView = new QChartView(m_chart);
chartView->setRenderHint(QPainter::Antialiasing);
chartView->setMinimumHeight(200);
layout->addWidget(chartView);
#endif
```

## Step 4: Update simulation timer slot

In the timer tick that calls `m_channels[i]->core.compute(...)`, add:
```cpp
#ifdef HAS_QT_CHARTS
if (m_chart && i == 0) {  // plot first channel
    m_tAxis += dt;
    m_seriesSetpoint->append(m_tAxis, pid.setpoint());
    m_seriesInput   ->append(m_tAxis, pid.input());
    m_seriesOutput  ->append(m_tAxis, pid.output());

    // Rolling window: drop points outside [t - PLOT_WINDOW, t]
    while (!m_seriesSetpoint->points().isEmpty()
           && m_seriesSetpoint->points().first().x() < m_tAxis - PLOT_WINDOW) {
        m_seriesSetpoint->remove(0);
        m_seriesInput   ->remove(0);
        m_seriesOutput  ->remove(0);
    }
    m_chart->axes(Qt::Horizontal).first()->setRange(
        qMax(0.0, m_tAxis - PLOT_WINDOW), m_tAxis);
}
#endif
```

## Step 5: Fallback (no Qt6::Charts)

If `HAS_QT_CHARTS` is not defined, add a `QLabel` placeholder:
```cpp
layout->addWidget(new QLabel("Install Qt6::Charts for live plot"));
```

## Acceptance criteria
- When Qt6::Charts is available, chart shows rolling 10s window
- Chart updates at simulation timer rate
- If Charts not installed, graceful fallback label (no compile error)
- Smoke tests still pass (widget() non-null)

## After implementing
Mark `[ ] PID live plot` done in `wiki/roadmap.md` v1.3 section.
