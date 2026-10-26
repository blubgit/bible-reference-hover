---
name: release
description: Use when releasing a new version of this plugin — set the x.y.z version in the plugin package.json (source of truth), sync it to the other version files, commit, tag, and push to main
model: haiku
---

# Release Bible Reference Hover

## Overview

This is a Bun workspace monorepo. The **plugin `package.json`** at
`packages/obsidian-bible-reference/package.json` is the **single source of truth**
for the version. The `version` script copies it into the root `package.json`,
`manifest.json`, and `versions.json`. Pushing a version tag starts the GitHub
Actions **Release plugin** workflow, which builds the plugin and publishes the
release with `main.js`, `manifest.json`, and `styles.css` attached.

The default branch is **`main`**.

## Version format

Semantic versioning, `x.y.z` (for example `1.2.0`). The version script rejects
anything else. There is no `v` prefix on the tag, which is an Obsidian guideline.

Choose the number from what changed since the last tag:

- **Patch** (`1.1.1`): bug or performance fixes, no new features.
- **Minor** (`1.2.0`): a new user-facing feature or command.
- **Major** (`2.0.0`): a breaking change.

If the user has not named a version, recommend one and confirm before continuing.
Releasing publishes to users, so get an explicit go-ahead first.

## Before you start

- Everything meant for the release must already be merged to `main`. Check with
  `git log --oneline <last tag>..main`.
- The working tree must be clean.
- README and docs should describe any new feature.

## Preflight

Run before touching any version file. Stop if either fails.

```bash
bun run build   # must exit 0 (builds packages and the plugin, writes main.js to the repo root)
bun run test    # must exit 0
```

## Steps

1. **Update `main`**

   ```bash
   git checkout main && git pull origin main
   ```

2. **Set the version** in `packages/obsidian-bible-reference/package.json`, then
   sync the other files:

   ```bash
   # edit "version" in packages/obsidian-bible-reference/package.json to NEW_VERSION
   bun run --filter bible-reference-hover version
   ```

   It prints `version set to <NEW_VERSION>`. It updates the root `package.json`,
   `manifest.json`, and `versions.json` (adding `"<NEW_VERSION>": "<minAppVersion>"`).

3. **Refresh the lockfile**

   ```bash
   bun install
   ```

4. **Commit.** The message is just the version string, matching earlier releases.
   The pre-commit hook runs ESLint and Prettier; fix what it reports instead of
   skipping it.

   ```bash
   git add bun.lock manifest.json package.json packages/obsidian-bible-reference/package.json versions.json
   git commit -m "<NEW_VERSION>"
   ```

5. **Tag** with the exact version, no `v`:

   ```bash
   git tag <NEW_VERSION>
   ```

6. **Push the commit, then the tag.** The tag push publishes the release.

   ```bash
   git push origin main
   git push origin <NEW_VERSION>
   ```

7. **Confirm the release.** The **Release plugin** run takes about a minute.

   ```bash
   gh run list --repo blubgit/bible-reference-hover --limit 3
   gh release view <NEW_VERSION> --repo blubgit/bible-reference-hover --json url,isDraft,assets
   ```

   Done when the release is not a draft and lists `main.js`, `manifest.json`,
   and `styles.css`. The release notes are generated from the titles of merged
   pull requests, so clear PR titles make clear notes.

## Checklist

- [ ] Version confirmed with the user
- [ ] Everything for the release is merged to `main`
- [ ] Build passes (`bun run build`) and tests pass (`bun run test`)
- [ ] Plugin `package.json`, root `package.json`, `manifest.json` all show the new version
- [ ] `versions.json` has an entry for the new version
- [ ] `bun.lock` refreshed (`bun install`)
- [ ] Commit message is only the version string
- [ ] Commit and tag both pushed
- [ ] GitHub release is published with all three assets

## Common mistakes

- Editing the root `package.json` instead of the plugin one. The script overwrites the root copy.
- Using a date version or a `v` prefix. Use plain `x.y.z`.
- Forgetting `bun install`, so the lockfile drifts.
- Tagging before the version files are committed.
- Pushing the commit but not the tag. Only the tag push publishes the release.
- Using `gh` without `--repo blubgit/bible-reference-hover`. This repo is a fork, so `gh` defaults to the upstream (tim-hub) repo.
- Releasing changes that are still on a branch. Merge them to `main` first, or they will not be in the release.
