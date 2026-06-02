# 3D Editor Module

## Purpose

Изометрический 3D-редактор для построения корпусов устройств и 3D-моделей компонентов. Рендеринг на чистом QPainter (без OpenGL). Экспорт в бинарный STL.

## Module Tree

```
ThreeDModule
└── PartEditorModule   ← основной редактор примитивов
```

Зарегистрированные типы: `ThreeDModule`, `PartEditorModule`

## Primitives

| Тип | Класс | Параметры |
|-----|-------|---------|
| Коробка | `BoxPrimitive` | pos, size (мм), color |
| Цилиндр | `CylinderPrimitive` | pos, size, segments=16 |
| PCB-плата | `BoardPrimitive` | pos, size (по умолчанию 80×2×60 мм) |

Все примитивы наследуют `ThreeDPrimitive` с методами `buildVertices()` и `buildFaces()`.

## 3D Math

Встроенная математика (без внешних зависимостей):

```cpp
struct Vec3 { float x, y, z; };
// dot, cross, normalize, len — реализованы инлайн
```

Проекция — изометрическая (не перспективная).  
Освещение — фиксированный направленный источник `LIGHT_DIR`.  
Затенение — Gouraud (перфейс + `shade(base, normal)`).

## Renderer (ThreeDView)

`ThreeDView` — это `QWidget` с ручным рендерингом через `QPainter`:

1. Каждый фрейм: собрать грани всех примитивов → `QVector<RenderFace>`
2. Отсортировать по глубине (painter's algorithm)
3. Нарисовать полигоны с вычисленным цветом
4. Нарисовать оси и сетку поверх

Управление видом:

| Жест | Действие |
|------|---------|
| Перетаскивание ЛКМ | Вращение (rotX, rotY) |
| Колесо мыши | Масштаб (zoom) |
| Клик на примитив | Выбор (подсветка) |

## Part Editor (PartEditorModule)

Интерфейс Part Editor:

- Список объектов слева (QListWidget)
- ThreeDView по центру
- Панель свойств справа (PrimitivePropsPanel)

### Панель свойств

Spinbox-поля для X/Y/Z положения и X/Y/Z размера. Изменения применяются немедленно.

## Usage

### Создание сцены

1. Откройте **3D Editor** → **Part Editor**
2. Нажмите **+ Box** / **+ Cylinder** / **+ Board** для добавления примитивов
3. Выберите примитив в списке — справа появится панель свойств
4. Измените позицию и размер; вид обновляется в реальном времени
5. Вращайте вид перетаскиванием мышью

### Удаление объектов

Выберите примитив → кнопка **Delete** или клавиша `Del`.

### Экспорт STL

Кнопка **Export STL** сохраняет всю сцену в бинарный STL-файл (совместим с PrusaSlicer, Cura, FreeCAD).

Алгоритм: каждый `ThreeDPrimitive::exportSTLTriangles()` пишет треугольники в `QDataStream`, заголовок STL добавляется автоматически.

## Keyboard Shortcuts

| Клавиша | Действие |
|---------|---------|
| `Del` | Удалить выбранный примитив |
| Drag (ЛКМ) | Вращение камеры |
| Scroll | Zoom in / out |

## Dependencies

- Qt6::Widgets (QWidget, QPainter)
- Нет OpenGL, нет внешних 3D-библиотек
