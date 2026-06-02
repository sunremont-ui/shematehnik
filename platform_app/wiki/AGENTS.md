# AGENTS.md — Wiki Schema for LLM

This file tells the LLM how to maintain the UCP wiki.

## Directory structure

```
wiki/
├── AGENTS.md                   ← Этот файл (wiki schema)
├── index.md                    ← Catalog of all pages
├── log.md                      ← Chronological record of changes
├── overview.md                 ← Project overview
├── philosophy.md               ← Design principles
├── roadmap.md                  ← Version plan
│
├── architecture/               ← Architecture docs
│   ├── module_system.md
│   ├── event_bus.md
│   ├── project_format.md       ← .ucp JSON format
│   └── tech_stack.md
│
├── modules/                    ← Module documentation
│   ├── schematic_editor.md
│   ├── pcb_layout.md
│   ├── 3d_editor.md
│   ├── pid_tuner.md
│   ├── program_system.md
│   ├── protocol_designer.md
│   └── code_generator.md
│
├── concepts/                   ← Key concepts
│   ├── hal.md
│   ├── pin_mapping.md
│   └── pid.md
│
├── integration/                ← Integration with other tools
│   ├── kicad.md
│   ├── freecad.md
│   ├── squareline.md
│   └── proteus.md
│
└── raw/                        ← Source documents (immutable)
    ├── articles/
    └── references/
```

## Page conventions

- All pages are GitHub-flavored Markdown (`.md`)
- First line is `# Title`
- Use `##` for sections, `###` for sub-sections
- Code blocks with language tags: ```cpp, ```json, ```sh
- Links within wiki: `[text](relative/path.md)`
- External links: full URL
- Tables for structured data

## Workflows

### Ingest workflow

1. User places a new source in `raw/`
2. User tells LLM: "Process the file raw/articles/foo.md"
3. LLM reads the source
4. LLM discusses key takeaways with user if needed
5. LLM writes/updates relevant wiki pages
6. LLM updates `index.md` if new pages were created
7. LLM appends entry to `log.md`:
   ```
   ## [YYYY-MM-DD] ingest | Source Title
   - Processed: raw/articles/foo.md
   - Created: concepts/bar.md
   - Updated: modules/baz.md, index.md
   ```

### Query workflow

1. User asks a question
2. LLM reads `index.md` to find relevant pages
3. LLM reads relevant pages
4. LLM synthesizes answer with citations to wiki pages

If the answer contains novel synthesis, LLM suggests filing it as a new wiki page.

### Lint workflow

User: "Lint the wiki"

LLM checks:
- Orphan pages (no inbound links from other wiki pages)
- Stale claims (check roadmap dates, update version numbers)
- Contradictions between pages
- Missing cross-references
- Concepts mentioned in multiple places that should have their own page
- Data gaps that could be filled with a web search

### Roadmap update workflow

User: "Update roadmap — we finished X, started Y"

1. LLM reads `roadmap.md`
2. Moves X from ○|◐ to ✓
3. Moves Y from ○ to ◐
4. Updates version description if needed
5. Logs the change

## Rules for the LLM

- **Never modify raw/ files** — they are immutable source documents
- **Never delete wiki pages without asking** — user decides
- **Always update index.md when creating/renaming pages**
- **Always log changes in log.md**
- **Prefer updating existing pages over creating new ones** — avoid page bloat
- **Cross-reference related pages** with `[links](relative/path.md)`
- **Use YAML frontmatter** for metadata on entity pages:
  ```yaml
  ---
  type: concept
  created: 2026-05-16
  updated: 2026-05-16
  related: [architecture/module_system.md, architecture/event_bus.md]
  ---
  ```
