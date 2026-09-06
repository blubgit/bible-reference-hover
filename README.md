# Bible Reference Hover

Bible Reference Hover is an Obsidian plugin for previewing, editing, and embedding Bible passages found in surrounding Markdown text.

## Current development status

The plugin is under private development. Version `1.0.0` is reserved for the first approved standalone release.

## Features

- Recognizes explicit references written with colon or period notation, such as `Eph 2:3-4` and `Eph 2.3-4`.
- Scans all references in the surrounding paragraph, heading, list item, callout paragraph, or selected text.
- Normalizes, orders, and deduplicates references before displaying their passages.
- Opens the same accessible preview from Reading view, Live Preview, keyboard focus, or **Scan for Bible References** in the editor context menu.
- Supports editing references in the preview and optionally applying the edits back to the note.
- Embeds a combined collapsed Bible callout, quote callout, or HTML details widget without removing the original prose.
- Uses configured online providers or the bundled WEB text in offline mode.

## Reference syntax

An explicit chapter and verse are required. Supported examples include:

```text
Eph 2:3-4
Eph. 2.3–4
1 John 1.9@esv
John 3.16-4:2
John 3.16, 18; 4.1
```

References are displayed canonically with full book names, colon chapter–verse separators, and en dashes for ranges.

## Development

This repository is a Bun workspace. The plugin source is in `packages/obsidian-bible-reference`, and production builds emit `main.js` at the repository root.

```bash
bun install
bun run test
bun run build
```

For a local test installation, copy `main.js`, `manifest.json`, and `styles.css` to:

```text
<vault>/.obsidian/plugins/bible-reference-hover/
```

Do not copy or commit `data.json`; it contains vault-specific settings and may contain provider credentials.

## Providers and Bible text

Network behavior depends on the provider selected in the plugin settings. Offline mode uses the bundled World English Bible text and does not make provider requests. Users of the ESV API are responsible for supplying their own access credentials and complying with Crossway's API terms, attribution requirements, and usage limits. No provider credential is included in this repository or its releases.

## Attribution

Bible Reference Hover is derived from [Bible Reference](https://github.com/tim-hub/obsidian-bible-reference) by tim-hub and contributors. The standalone hover, multi-reference scanning, editing, selection, and embedding functionality is maintained by blubgit.

The original and modified work are distributed under the [MIT License](LICENSE).
