# Module System

## Core concept

UCP построен на **дереве модулей**. Каждый модуль:

- Имеет `id` (UUID), `name`, `icon`
- Может содержать любое количество **подмодулей** (children)
- Имеет `widget()` — QWidget для отображения в workspace
- Умеет сериализовать себя в JSON и восстанавливаться из JSON
- Имеет жизненный цикл: `init()` → use → `destroy()`

```
Module (base)
 │
 ├── id()      : QString
 ├── name()    : QString
 ├── icon()    : QIcon
 ├── parent()  : Module*
 ├── children : QVector<Module*>
 │
 ├── init() / destroy()
 ├── serialize() / deserialize(QJsonObject)
 ├── widget() → QWidget*
 │
 └── signals: modified(), childAdded(), childRemoved()
```

## Дерево — не плоский список

Главное отличие от обычных plugin-систем: модуль **владеет** своими подмодулями.

```
Project
 ├── SchematicModule
 │    ├── SymbolEditor (подмодуль SchematicModule)
 │    ├── WireTool (подмодуль SchematicModule)
 │    ├── NetlistGenerator (подмодуль SchematicModule)
 │    └── SPICESimulator (подмодуль SchematicModule)
 ├── PIDTunerModule
 │    ├── PIDLoop_1 (подмодуль PIDTunerModule)
 │    ├── PIDLoop_2 (подмодуль PIDTunerModule)
 │    └── RealTimeGraph (подмодуль PIDTunerModule)
 └── ThreeDModule
      ├── PartEditor (подмодуль ThreeDModule)
      └── AssemblyEditor (подмодуль ThreeDModule)
```

Это позволяет:
- Проекту быть деревом, а не списком — отражает реальную структуру устройства
- Каждому модулю управлять своими подмодулями (создавать/удалять)
- Подмодулям иметь доступ к родителю: `parentModule()->findChildOfType<NetlistGenerator>()`

## Регистрация

Модули регистрируются один раз при запуске через макрос:

```cpp
// В .cpp файле модуля:
REGISTER_MODULE(MyNewModule);
```

После регистрации модуль появляется в меню `Modules → Add MyNewModule`.

Фабрика (`ModuleFactory`) хранит `QHash<QString, std::function<Module*()>>`.

## Поиск по дереву

```cpp
// Найти первого ребёнка типа T
auto *netlist = parentModule()->findChildOfType<NetlistGenerator>();

// Найти по UUID рекурсивно
Module *m = project->findChildById("some-uuid");

// Итерация по всем детям
for (int i = 0; i < module->childCount(); i++)
    process(module->childAt(i));
```
