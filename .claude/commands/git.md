# Git

Git workflow for this repo (`d:\shemaTehnik`, remote `origin` =
`git@github.com:sunremont-ui/shematehnik.git`, default branch `master`).

## Commit

1. Review first: `git status --short` and `git diff` (or `--cached`).
2. Stage **only the files for this change** by path — never blanket `git add -A`
   (the repo root has many intentionally-untracked dirs: `voice_assistant/`,
   `.obsidian/`, `raw/`, etc.).
3. Message: short imperative subject, blank line, body explaining *what + why*.
   End every commit with the trailer:
   ```
   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   ```
   Use a single-quoted here-string so `$`/backticks aren't expanded:
   ```bash
   git commit -m @'
   Subject line

   Body.

   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   '@
   ```
4. Prefer new commits over `--amend`. Don't use `--no-verify`.

## Push

```bash
git push                       # subsequent pushes
git push -u origin master      # first time / new branch
```
- SSH auth as `sunremont-ui` (key `~/.ssh/id_ed25519`, github.com host-key in
  `~/.ssh/known_hosts`). Verify: `ssh -T git@github.com`.
- Only push when the user asks.

## Conventions for this repo

- **Commit only the user asks for**; don't pull untracked siblings into a commit.
- **Never commit build artifacts** (already gitignored): `platform_app/web/`'s
  `node_modules/`, `dist/`, `public/wasm/`, `*.tsbuildinfo`, `playwright-report/`,
  `test-results/`, `wasm/build/`.
- Before committing web changes, ensure green: `npm run build` + `npm test`
  (see `/ucp-web`).
- **CRLF warnings** (`LF will be replaced by CRLF`) are harmless on Windows —
  not an error, no action needed.
- Splitting interleaved work: if changes across shared files mix features and
  can't be cleanly separated by path, make one comprehensive commit with a
  sectioned body rather than broken half-commits (no interactive `add -p` here).

## Quick recipes

```bash
git log --oneline -10                 # recent history
git status -sb                        # branch + ahead/behind
git restore --staged <path>           # unstage
git diff --stat origin/master         # what's unpushed
```
