# Dev Setup & Tooling

## Stack

- **Language:** TypeScript → bundled `main.js` (entry: `packages/obsidian-bible-reference/src/main.ts`)
- **Repo layout:** [Bun](https://bun.sh) workspace monorepo. The repo root is the installable Obsidian plugin folder (`manifest.json`, `versions.json`, `styles.css`, built `main.js`); all source lives under `packages/`.
- **Package manager / runtime / test runner:** Bun (required, `>=1.1`)
- **Bundler:** esbuild (`packages/obsidian-bible-reference/scripts/esbuild.config.mjs`)
- **Types:** `obsidian` type definitions
- **Packages:** `obsidian-bible-reference` (plugin), `bible-reference-toolkit`, `bible-book-names-intl`

## Commands (run from the repo root)

```bash
bun install         # install all workspace dependencies
bun build:packages  # build dependencies
bun run dev         # watch mode (incremental build of the plugin)
bun run build       # production build (type-check + bundle -> main.js at repo root)
bun run test        # build the helper packages, then run all tests
bun run lint        # eslint the whole repo
bun run prettier    # check formatting of the whole repo
```

Use `bun run test`, not bare `bun test`: the `pretest` script builds `bible-book-names-intl` and `bible-reference-toolkit` first, and the plugin's tests import their built output.

## Verifying a change

1. **Test:** `bun run test`. Add or update a `*.test.ts` file next to the module you changed. Some passing tests print errors on purpose (e.g. "Literal Word abbreviation not found for UnknownBook"); only the final `pass` / `fail` count matters.
2. **Build:** `bun run build` type-checks (`tsc -noEmit`) and writes `main.js` to the repo root. `main.js` is gitignored, so it is never committed.
3. **Try it in Obsidian:** copy `main.js` (plus `manifest.json` and `styles.css` if they changed) into `<Vault>/.obsidian/plugins/<plugin-id>/`, then reload the plugin from **Settings → Community plugins** or restart Obsidian.
4. **Commit:** the Husky pre-commit hook runs `bun run precommit` (lint + Prettier). It checks the whole repo, not only staged files, so a formatting slip in an earlier commit blocks every new commit. Fix it with `bun run prettier:fix` and commit that fix separately from your change.

## Windows: Bun on PATH

The installer (`powershell -c "irm bun.sh/install.ps1 | iex"`) puts `bun.exe` in `%USERPROFILE%\.bun\bin` and adds it to the user PATH. Apps already running, such as VS Code and its terminals, keep the old PATH until fully restarted. Until then, both `bun` commands and the pre-commit hook fail with `bun: command not found`. As a stopgap in PowerShell:

```powershell
$env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"
```

Per-package scripts (e.g. `lint:fix`, `prettier:fix`, `version`) live in each package and can be run with:

```bash
bun run --filter obsidian-bible-reference lint:fix
bun run --filter obsidian-bible-reference prettier:fix
```

## Release artifacts

`main.js`, `manifest.json`, and `styles.css` must be at the repo root (the plugin folder). The production build emits `main.js` there; CI attaches these files to the GitHub release on tag push.
