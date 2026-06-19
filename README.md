[![ORGAN-III: Ergon](https://img.shields.io/badge/ORGAN--III-Ergon-1b5e20?style=flat-square)](https://github.com/organvm-iii-ergon)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![GreasyFork](https://img.shields.io/badge/GreasyFork-Install-960000?style=flat-square)](https://greasyfork.org/scripts/456055-chatgpt-exporter)

# ChatGPT Exporter

[![CI](https://github.com/organvm-iii-ergon/a-i-chat--exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/organvm-iii-ergon/a-i-chat--exporter/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-pending-lightgrey)](https://github.com/organvm-iii-ergon/a-i-chat--exporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/organvm-iii-ergon/a-i-chat--exporter/blob/main/LICENSE)
[![Organ III](https://img.shields.io/badge/Organ-III%20Ergon-F59E0B)](https://github.com/organvm-iii-ergon)
[![Status](https://img.shields.io/badge/status-active-brightgreen)](https://github.com/organvm-iii-ergon/a-i-chat--exporter)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript-informational)](https://github.com/organvm-iii-ergon/a-i-chat--exporter)


**A browser userscript that exports your entire ChatGPT conversation history into portable, archival-quality formats — Markdown, HTML, JSON, PNG, and plain text.**

ChatGPT Exporter lives inside ORGAN-III (Ergon), the commerce and product organ of the [organvm system](https://github.com/meta-organvm). Within the eight-organ model, this tool represents a concrete, publicly distributed product: a piece of software that thousands of people install and use daily. It converts ephemeral AI conversations into durable artifacts — a concern that connects directly to ORGAN-I's epistemological interest in how knowledge gets captured and structured, and to ORGAN-IV's orchestration interest in how tools route information across systems.

---

## Table of Contents

- [Product Overview](#product-overview)
- [Why This Tool Exists](#why-this-tool-exists)
- [Technical Architecture](#technical-architecture)
- [Supported Export Formats](#supported-export-formats)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Bulk Export and Conversation Management](#bulk-export-and-conversation-management)
- [Internationalization](#internationalization)
- [Configuration and Settings](#configuration-and-settings)
- [Build System and Development](#build-system-and-development)
- [Cross-Organ Context](#cross-organ-context)
- [Related Work](#related-work)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Product Overview

ChatGPT Exporter is a [Tampermonkey](https://www.tampermonkey.net/) userscript — a small program that runs inside your browser and augments the ChatGPT web interface with export functionality that OpenAI does not natively provide. Once installed, it injects a menu into the ChatGPT sidebar that lets you export any conversation in five formats: Markdown with YAML front matter, styled HTML with dark-mode support, raw JSON matching the ChatGPT API schema, PNG screenshots of the full conversation thread, and plain text copied to your clipboard.

The tool is also available through [GreasyFork](https://greasyfork.org/scripts/456055-chatgpt-exporter), the largest public userscript repository, where it is one of the highest-traffic ChatGPT utility scripts.

### What It Does

- **Single conversation export** — One-click export of the currently open conversation in any of five formats.
- **Bulk conversation export** — Select multiple conversations (or all of them) and export as a ZIP archive. Supports Markdown, HTML, JSON, and the official OpenAI JSON schema.
- **Official export file import** — Upload a `conversations.json` file downloaded from OpenAI's data export feature, then re-export it in more useful formats.
- **Project-scoped export** — Filter and export conversations belonging to specific ChatGPT Projects (OpenAI's "Gizmos" system).
- **Conversation management** — Archive or delete conversations in bulk directly from the export dialog.
- **Timestamp injection** — Optionally display per-message timestamps inline within the ChatGPT interface, with configurable 12h/24h format.
- **Customizable filenames** — Configure filename patterns using template variables (`{title}`, `{date}`, `{id}`, etc.).
- **Metadata front matter** — Attach custom key-value metadata to Markdown and HTML exports (title, source URL, model name, creation time, etc.).

### Key Numbers

- **Version:** 2.29.1 (as of July 2025)
- **Supported domains:** `chatgpt.com`, `chat.openai.com`, `new.oaifree.com`
- **Export formats:** 5 (Markdown, HTML, JSON, PNG, Text)
- **Locales:** 9 (English, Spanish, French, Indonesian, Japanese, Russian, Turkish, Simplified Chinese, Traditional Chinese)
- **Model detection:** GPT-3.5, GPT-4, GPT-4 Browsing, GPT-4o, and forward-compatible fuzzy matching

---

## Why This Tool Exists

ChatGPT conversations are ephemeral by default. The web interface offers no native export to Markdown or HTML, no bulk download, and no way to produce archival snapshots. OpenAI's official data export gives you a single massive JSON file that most people cannot use directly. This tool bridges that gap: it turns ChatGPT's internal API responses into formats that researchers, writers, developers, and knowledge workers can actually store, search, share, and reference.

The design philosophy is zero-friction: no accounts, no servers, no cloud dependencies. The userscript runs entirely in your browser, authenticates using your existing ChatGPT session, and produces local files. Your data never leaves your machine.

---

## Technical Architecture

The codebase is a TypeScript application built with Vite and Preact, compiled into a single userscript file (`dist/chatgpt.user.js`) via [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey). The architecture breaks down into four layers:

### 1. API Layer (`src/api.ts`)

The API module handles all communication with ChatGPT's internal backend API (`/backend-api/`). It manages:

- **Session authentication** — Extracts access tokens from the ChatGPT page's auth session endpoint (`/api/auth/session`). Falls back to page-embedded tokens for share pages.
- **Conversation fetching** — Retrieves full conversation objects by ID, including the complete message tree with branching paths, model metadata, and tool invocations.
- **Asset resolution** — Replaces `file-service://` pointers (used by DALL-E, Code Interpreter, and multimodal inputs) with base64 data URIs by fetching and encoding the actual image blobs.
- **Bulk pagination** — Fetches all conversations with configurable limits and offset-based pagination, supporting both the global conversation list and project-scoped ("Gizmo") conversations.
- **Conversation processing** — Traverses the message tree from `current_node` backward through parent links, extracting the linear conversation path, merging continuation nodes, and resolving model slugs to human-readable names.
- **Team/workspace support** — Detects workspace accounts via cookies and attaches the appropriate `Chatgpt-Account-Id` header for team environments.

The conversation data model is a tree structure (`mapping` of `ConversationNode` objects linked by `parent`/`children` references). The API layer linearizes this tree into a flat array for export, handling edge cases like system messages, tool intermediate messages, model-editable context, and user custom instructions.

### 2. Exporter Layer (`src/exporter/`)

Five specialized exporter modules handle format-specific conversion:

| Module | Format | Key Behavior |
|--------|--------|-------------|
| `markdown.ts` | `.md` | YAML front matter, LaTeX preservation via placeholder substitution, footnote transformation, AST-based markdown normalization |
| `html.ts` | `.html` | Self-contained HTML from template, dark/light theme detection, KaTeX LaTeX rendering, user avatar embedding |
| `json.ts` | `.json` / `.jsonl` | Raw API format (official schema), plus TavernAI and Ooba character-chat formats |
| `image.ts` | `.png` | Full-thread screenshot via html2canvas with 2x scaling, progressive size reduction for canvas limits, CSS injection to hide UI chrome |
| `text.ts` | clipboard | Stripped-down text with markdown syntax removed (bold/italic stripped via AST transforms), images replaced with `[image]` placeholders |

The Markdown exporter deserves special attention for its LaTeX handling: it uses a placeholder system to protect LaTeX expressions from being corrupted by the markdown AST roundtrip, then restores them after normalization. It also transforms ChatGPT's custom footnote syntax into standard markdown footnote references.

Bulk exports use JSZip to produce compressed archives with deduplication-aware filename generation.

### 3. UI Layer (`src/ui/`)

The interface is built with Preact (aliased as React) and Radix UI primitives:

- **`Menu.tsx`** — The sidebar injection point. Uses sentinel-js to watch for DOM mutations (ChatGPT's SPA navigation) and re-inject the export menu when the sidebar rebuilds. A 300ms interval handles edge cases where sentinel misses reattachments.
- **`ExportDialog.tsx`** — The bulk export modal. Manages a three-source data model (API-fetched conversations, project-scoped conversations, locally uploaded JSON files). Uses a custom `RequestQueue` with 200ms/1600ms rate limiting to avoid hitting ChatGPT API throttles during bulk fetches.
- **`SettingDialog.tsx`** — Configuration panel for filename format, timestamp display, metadata fields, and language selection.
- **`SettingContext.tsx`** — React context provider that persists all settings to Tampermonkey's `GM_getValue`/`GM_setValue` storage.

### 4. Utility Layer (`src/utils/`)

Supporting modules handle cross-cutting concerns:

- **`markdown.ts`** — mdast-based Markdown AST parsing and serialization with GFM (GitHub Flavored Markdown) support.
- **`download.ts`** — Browser download triggers and filename template resolution.
- **`queue.ts`** — Rate-limited request queue with progress events, used for bulk operations.
- **`storage.ts`** — Abstraction over Tampermonkey's persistent storage API.
- **`conversion.ts`** — Format converters for TavernAI and Ooba character-chat schemas.
- **`dom.ts`** — DOM utilities including blob-to-data-URL conversion.
- **`memorize.ts`** — Memoization wrapper for expensive single-call functions (session fetch, account check).

### Architecture: providers

The conversation source is abstracted behind a `Provider` interface in
`src/providers/`. Each provider knows how to read conversations out of one host
(ChatGPT, and — scaffolded — Claude and Gemini) and normalize them into the
shared `ConversationResult` the exporters already consume:

- `src/providers/types.ts` — the `Provider` interface, re-exporting the existing
  data types from `src/api.ts` (no duplication).
- `src/providers/chatgpt.ts` — `chatgptProvider`, a thin wrapper that delegates
  to `src/api.ts`. ChatGPT behavior is unchanged.
- `src/providers/claude.ts`, `src/providers/gemini.ts` — scaffolds whose methods
  throw `NotImplemented` and whose top-of-file comments document the exact
  extraction points a future implementer must fill against a live session.
- `src/providers/index.ts` — the registry and `getActiveProvider(host)`, which
  picks a provider by `location.host` and falls back to `chatgptProvider`.

This is foundation only: the existing UI still calls `src/api.ts` directly, so
behavior is identical today. Live Claude/Gemini extraction is intentionally
deferred (it needs real sessions to map their conversation shapes).

### Build Pipeline

The project uses Vite with `@preact/preset-vite` for JSX transformation and `vite-plugin-monkey` for userscript packaging. External dependencies (JSZip, html2canvas) are loaded from jsDelivr CDN at runtime to keep the script bundle small. The build produces a single `dist/chatgpt.user.js` file that Tampermonkey can install directly.

CI/CD uses three GitHub Actions workflows:
- **`build.yml`** — Lint, type-check, build, and auto-commit the compiled userscript on release commits.
- **`check.yml`** — PR validation (lint + type-check).
- **`release-please.yml`** — Automated changelog and version bumping via [release-please](https://github.com/googleapis/release-please).

---

## Supported Export Formats

### Markdown

Produces a `.md` file with optional YAML front matter (title, source URL, model, timestamps). Each message is formatted as a level-4 heading with the author name, followed by the content. LaTeX expressions are preserved. Code blocks, citations, and browsing results are rendered in standard markdown syntax. Footnotes from ChatGPT's browsing feature are converted to markdown footnote syntax.

### HTML

Generates a self-contained `.html` file using a bundled template with inline CSS. Supports dark and light themes (auto-detected from the ChatGPT page). User avatars are embedded as base64 images. LaTeX is rendered via KaTeX. Metadata is placed in a collapsible `<details>` element.

### JSON

Two JSON modes:
- **Official format** — The raw API response wrapped in an array, matching the schema of OpenAI's official data export.
- **ZIP** — Individual JSON files per conversation, compressed into a ZIP archive.

Additional specialty formats:
- **TavernAI** (`.jsonl`) — Character-chat format for [SillyTavern](https://github.com/SillyTavern/SillyTavern) and compatible frontends.
- **Ooba** (`.json`) — [text-generation-webui](https://github.com/oobabooga/text-generation-webui) conversation format.

### PNG (Screenshot)

Captures the entire conversation thread as a single PNG image using html2canvas. The export injects temporary CSS to hide UI chrome (header, action buttons, non-conversation elements), scales to 2x device pixel ratio for crisp output, and progressively reduces scale if the canvas exceeds browser size limits (Chromium silently returns an empty canvas; Firefox throws a DOMException).

### Text (Clipboard)

Copies the conversation to your clipboard as plain text. Markdown formatting is stripped via AST transforms (bold and italic removed, links reduced to text). Images are replaced with `[image]` placeholders. Designed for quick paste-and-share workflows.

---

## Installation

### Prerequisites

Install **Tampermonkey** for your browser:

| Browser | Install Link |
|---------|-------------|
| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey) |
| Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |

### Install the Userscript

Choose one:

| Source | Link |
|--------|------|
| **GreasyFork** (recommended) | [Install from GreasyFork](https://greasyfork.org/scripts/456055-chatgpt-exporter) |
| **GitHub (raw)** | [Install from GitHub](https://raw.githubusercontent.com/organvm-iii-ergon/a-i-chat--exporter/master/dist/chatgpt.user.js) |

Click the link, and Tampermonkey will prompt you to install the script. Once installed, navigate to [chatgpt.com](https://chatgpt.com/) and you will see the export menu in the sidebar.

---

## Quick Start

1. **Open any ChatGPT conversation** at `chatgpt.com`.
2. **Look for the export menu** at the bottom of the sidebar (left navigation panel).
3. **Click a format button** — Markdown, HTML, JSON, PNG, or Text.
4. **The file downloads automatically** (or copies to clipboard for Text).

That is the entire workflow. No configuration is required for basic use.

### Example: Markdown Output

```markdown
---
title: ChatGPT Exporter Creation
source: https://chatgpt.com/c/cf3f8850-1d69-43c8-b99b-affd0de4e76f
model: GPT-4o
create_time: 2025-03-15T10:23:41Z
---

# ChatGPT Exporter Creation

#### You:
I'm creating a ChatGPT Exporter. What do you think?

#### ChatGPT:
It sounds like you're planning on creating a tool that uses the ChatGPT
model to export text...
```

### Example: Plain Text Output

```
You:
I'm creating a ChatGPT Exporter. What do you think?

ChatGPT:
It sounds like you're planning on creating a tool that uses the ChatGPT
model to export text. ChatGPT is a large language model trained by OpenAI
that is designed to generate human-like text responses based on a given
input...
```

---

## Bulk Export and Conversation Management

Click **"Export All"** in the sidebar menu to open the bulk export dialog. This dialog provides three workflows:

### Export from API

The dialog loads your complete conversation list from ChatGPT's API (up to a configurable maximum, default 1,000). You can:

1. **Filter by project** — Use the project dropdown to scope the list to a specific ChatGPT Project.
2. **Select conversations** — Check individual conversations or use "Select All."
3. **Choose format** — Markdown, HTML, JSON, or JSON (ZIP).
4. **Click Export** — The tool fetches each conversation's full data with rate limiting (200ms minimum between requests, 1600ms backoff), then downloads a ZIP archive.

### Export from Official File

Click the upload icon to import a `conversations.json` file downloaded from OpenAI's data export feature (Settings > Data controls > Export data). The dialog switches to local mode and lets you re-export the imported conversations in any supported format.

### Conversation Management

The bulk dialog also provides **Archive** and **Delete** buttons for managing your conversation history directly from the export interface, with confirmation dialogs and rate-limited API calls.

---

## Internationalization

The interface is fully localized in 9 languages:

| Language | Code |
|----------|------|
| English | `en-US` |
| Spanish | `es` |
| French | `fr` |
| Indonesian | `id-ID` |
| Japanese | `ja-JP` |
| Russian | `ru` |
| Turkish | `tr-TR` |
| Simplified Chinese | `zh-Hans` |
| Traditional Chinese | `zh-Hant` |

Language detection follows a cascade: user's stored preference, ChatGPT's locale setting (from `localStorage`), browser language, then fallback to English. The language can be changed in the settings dialog.

---

## Configuration and Settings

Open the settings panel from the export menu to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| **Filename format** | Template string for exported filenames. Supports `{title}`, `{date}`, `{id}`, `{create_time}`, `{update_time}` variables. | `{title}` |
| **Timestamps** | Show per-message timestamps in the ChatGPT interface and/or in exports. | Disabled |
| **24-hour format** | Use 24-hour time format for timestamps. | Off (12h) |
| **Markdown timestamps** | Include timestamps in Markdown exports. | Off |
| **HTML timestamps** | Include timestamps in HTML exports. | Off |
| **Metadata** | Custom key-value pairs appended as YAML front matter (Markdown) or collapsible details (HTML). Template variables: `{title}`, `{date}`, `{timestamp}`, `{source}`, `{model}`, `{model_name}`, `{create_time}`, `{update_time}`. | Empty |
| **Export all limit** | Maximum number of conversations fetched during bulk export. | 1,000 |
| **Language** | UI language. | Auto-detected |

All settings persist across sessions via Tampermonkey's storage API.

---

## Build System and Development

### Prerequisites

- Node.js >= 20.0.0
- [pnpm](https://pnpm.io/) 8.x

### Setup

```bash
git clone https://github.com/organvm-iii-ergon/a-i-chat--exporter.git
cd a-i-chat--exporter
pnpm install
```

### Development

```bash
pnpm dev
```

This starts a Vite dev server that auto-opens ChatGPT in your browser. Tampermonkey will prompt you to install the development script. Changes hot-reload.

### Build

```bash
pnpm build
```

Produces `dist/chatgpt.user.js` — the standalone userscript ready for distribution.

### Lint and Type Check

```bash
pnpm lint        # ESLint
pnpm test        # TypeScript type checking (tsc --noEmit)
```

### Dependencies

**Runtime** (bundled or CDN-loaded):
- `preact` — Lightweight React-compatible UI framework (aliased to React)
- `@radix-ui/react-dialog`, `@radix-ui/react-hover-card` — Accessible UI primitives
- `i18next` + `react-i18next` — Internationalization framework
- `jszip` — ZIP archive generation (loaded from jsDelivr CDN)
- `html2canvas` — DOM-to-canvas screenshot (loaded from jsDelivr CDN)
- `mdast-util-from-markdown`, `mdast-util-to-markdown`, `mdast-util-to-hast` — Markdown AST processing
- `micromark-extension-gfm`, `mdast-util-gfm` — GitHub Flavored Markdown support
- `hast-util-to-html` — HTML generation from HAST (Hypertext AST)
- `sentinel-js` — DOM mutation observer for SPA navigation
- `sanitize-filename` — Safe filename generation
- `vite-plugin-monkey` — Tampermonkey userscript packaging

**Dev-only:**
- `vite` — Build tool
- `typescript` — Type system
- `eslint` — Linting
- `husky` — Git hooks (pre-commit, pre-push, commit-msg)
- `commitlint` — Conventional commits enforcement
- `katex` — LaTeX math typesetting (type definitions)

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are enforced via commitlint and husky pre-commit hooks.

---

## Cross-Organ Context

Within the [organvm eight-organ system](https://github.com/meta-organvm), ChatGPT Exporter occupies a specific position in the knowledge flow:

### ORGAN-I (Theoria) — Epistemic Foundation

ORGAN-I investigates how knowledge is structured, captured, and transformed. The conversation export problem is fundamentally an epistemological one: AI chat sessions produce knowledge artifacts that exist only as transient DOM state and API responses. This tool materializes those artifacts into durable, structured formats. The Markdown exporter's AST-based processing — parsing ChatGPT's output into an abstract syntax tree, normalizing it, and serializing it back — mirrors ORGAN-I's interest in recursive structure and transformation. See [organvm-i-theoria](https://github.com/organvm-i-theoria) for the theoretical framework.

### ORGAN-IV (Taxis) — Orchestration and Routing

ORGAN-IV governs how tools, agents, and systems coordinate. ChatGPT Exporter is a concrete example of an orchestration pattern: it sits between a user and an API, intercepts data flows, transforms formats, and routes outputs to the filesystem. The rate-limited request queue in the bulk export dialog is a miniature orchestration engine. The multi-domain support (`chatgpt.com`, `chat.openai.com`, `new.oaifree.com`) demonstrates adaptive routing across platform variants. See [organvm-iv-taxis](https://github.com/organvm-iv-taxis) for the orchestration model.

### ORGAN-V (Logos) — Public Process

The development and maintenance of this tool provides material for ORGAN-V's building-in-public essays. A browser extension that intercepts and re-exports AI conversation data raises questions about data ownership, platform lock-in, and the politics of API access — all topics that fit within ORGAN-V's public discourse mission. See [organvm-v-logos](https://github.com/organvm-v-logos).

---

## Related Work

- **[pionxzh/chatgpt-exporter](https://github.com/pionxzh/chatgpt-exporter)** — Upstream source. This fork is maintained within ORGAN-III for integration into the organvm product portfolio.
- **[SillyTavern](https://github.com/SillyTavern/SillyTavern)** — Character-chat frontend compatible with the TavernAI export format.
- **[text-generation-webui](https://github.com/oobabooga/text-generation-webui)** — Gradio-based LLM interface compatible with the Ooba export format.
- **[GreasyFork](https://greasyfork.org/scripts/456055-chatgpt-exporter)** — Primary distribution channel for the userscript.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions.

**Quick summary:**

1. Fork and branch from `master`.
2. `pnpm install` then `pnpm dev` for local development.
3. Ensure `pnpm lint` and `pnpm test` pass before submitting a PR.
4. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

[MIT](./LICENSE) -- Copyright (c) 2022-Present Pionxzh

---

## Author

Maintained by [@4444j99](https://github.com/4444j99) as part of [ORGAN-III: Ergon](https://github.com/organvm-iii-ergon) -- the commerce and product organ of the organvm system.

Original work by [Pionxzh](https://github.com/pionxzh).
