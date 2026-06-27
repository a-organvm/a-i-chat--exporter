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

> ### Work with the builder
>
> **The expensive problem this engineering solves:** your organization's most valuable thinking is trapped inside AI chat platforms that ship no real export — ephemeral, unsearchable, un-archivable, impossible to move into your own systems for compliance, search, or model training. Capturing it durably means reverse-engineering an undocumented internal API, linearizing a branching message tree, and rendering it into archival formats — all client-side, with no backend to lean on. That is rare, costly engineering, and it is the whole of this repository.
>
> **The proof is this codebase:** a TypeScript / Vite / Preact userscript that authenticates against ChatGPT's internal `/backend-api/`, walks the conversation tree node-by-node, and exports five formats (LaTeX-safe Markdown, self-contained HTML, official-schema JSON, full-thread PNG, clipboard text) across nine localized UIs — behind a fail-closed Pro license gate (`PRO_FEATURES` in [`src/ui/SettingContext.tsx`](./src/ui/SettingContext.tsx)), a rate-limited `RequestQueue` ([`src/utils/queue.ts`](./src/utils/queue.ts)), and a provider layer ([`src/providers/`](./src/providers)) already scaffolded for Claude and Gemini.
>
> [**Deploy this for your org →**](mailto:padavano.anthony@gmail.com)  
> *(Technical recruiter or engineering leader? This repository is the proof-of-work behind the senior-to-principal roles I take. [Work with the team that built this →](mailto:padavano.anthony@gmail.com))*

ChatGPT Exporter lives inside ORGAN-III (Ergon), the commerce and product organ of the [organvm system](https://github.com/meta-organvm). Within the eight-organ model, this tool represents a concrete, publicly distributed product: a piece of software that thousands of people install and use daily. It converts ephemeral AI conversations into durable artifacts — a concern that connects directly to ORGAN-I's epistemological interest in how knowledge gets captured and structured, and to ORGAN-IV's orchestration interest in how tools route information across systems.

---

## Table of Contents

- [Product Overview](#product-overview)
- [Why This Tool Exists](#why-this-tool-exists)
- [Pricing and Monetization](#pricing-and-monetization)
- [Technical Architecture](#technical-architecture)
- [Supported Export Formats](#supported-export-formats)
- [Usage](#usage)
- [Internationalization](#internationalization)
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

- **Single conversation export** — Export the currently open conversation in any of five formats after the local API Auth gate is unlocked for API-backed formats.
- **Bulk conversation export** *(Pro)* — Select multiple conversations (or all of them) and export Markdown, HTML, JSON, or JSON ZIP output.
- **Official export file import** *(Pro)* — Upload a JSON array such as OpenAI's `conversations.json` export, then re-export selected conversations from the bulk dialog.
- **Project-scoped export** *(Pro)* — Filter API-loaded bulk exports by ChatGPT Projects (OpenAI's "Gizmos" system).
- **Conversation management** *(Pro)* — Archive or delete API-loaded conversations in bulk directly from the export dialog.
- **Timestamp injection** — Optionally display per-message timestamps inline within the ChatGPT interface, with configurable 12h/24h format.
- **Customizable filenames** — Configure filename patterns using template variables (`{title}`, `{date}`, `{timestamp}`, `{chat_id}`, `{create_time}`, `{update_time}`).
- **Metadata front matter** — Attach custom key-value metadata to Markdown and HTML exports (title, source URL, model name, creation time, etc.).

### Key Numbers

- **Version:** 2.29.1 (from `package.json`)
- **Supported domains:** `chatgpt.com`, `chat.openai.com`, `new.oaifree.com`
- **Export formats:** 5 (Markdown, HTML, JSON, PNG, Text)
- **Locales:** 9 (English, Spanish, French, Indonesian, Japanese, Russian, Turkish, Simplified Chinese, Traditional Chinese)
- **Model detection:** GPT-3.5, GPT-4, GPT-4 Browsing, GPT-4o, and forward-compatible fuzzy matching

---

## Why This Tool Exists

ChatGPT conversations are ephemeral by default. The web interface offers no native export to Markdown or HTML, no bulk download, and no way to produce archival snapshots. OpenAI's official data export gives you a single massive JSON file that most people cannot use directly. This tool bridges that gap: it turns ChatGPT's internal API responses into formats that researchers, writers, developers, and knowledge workers can actually store, search, share, and reference.

The design philosophy is zero-friction: no accounts, no servers, no cloud dependencies. The userscript runs entirely in your browser, authenticates using your existing ChatGPT session, and produces local files. Your data never leaves your machine.

---

## Pricing and Monetization

ChatGPT Exporter is **free and open-source** at its core. The userscript installs from GreasyFork or GitHub, runs entirely in your browser, and never asks for an account. There is no paywall on the everyday workflow: opening a conversation and exporting it to Markdown, HTML, JSON, PNG, or text is — and stays — free.

The project sustains itself through a two-tier model. The free tier covers the individual export workflow that the overwhelming majority of users need. A paid **Pro** tier covers the heavier, batch-oriented workflows guarded by the `bulk-export` and `multi-provider-export` feature flags.

### Who Pays

The free tier is built for the casual-to-regular user: someone archiving a handful of conversations, saving a notable thread, or grabbing a screenshot to share. They never need Pro.

Pro is aimed at people for whom export is part of their job or research, and who feel the limits of one-at-a-time export:

- **Researchers and writers** building corpora out of hundreds of conversations.
- **Developers and knowledge workers** piping bulk exports into note systems, RAG pipelines, or version control.
- **Users of Pro-gated import/conversion controls** such as official JSON-file import and TavernAI/Ooba JSON conversion.

### Tier Comparison

| Capability | Free | Pro |
|------------|:----:|:---:|
| Single-conversation export (Markdown, HTML, OpenAI-format JSON, PNG, Text) | Yes | Yes |
| Timestamp injection and custom filename templates | Yes | Yes |
| Metadata front matter for Markdown and HTML | Yes | Yes |
| 9-language localized UI | Yes | Yes |
| No remote exporter service; files are produced locally in the browser | Yes | Yes |
| Bulk export from ChatGPT's API | No | Yes |
| Official JSON-file import and re-export from the bulk dialog | No | Yes |
| TavernAI JSONL and Ooba JSON conversion buttons | No | Yes |

The two Pro capabilities map directly to the feature flags in the codebase (`PRO_FEATURES` in [`src/ui/SettingContext.tsx`](./src/ui/SettingContext.tsx)): `bulk-export` and `multi-provider-export`.

### Plan and Status

The code supports a hosted Lemon Squeezy checkout URL when
`LEMONSQUEEZY_STORE_ID` (or `VITE_LEMONSQUEEZY_STORE_ID`) is configured at build time. After purchase, the checkout can return the license
key to ChatGPT Exporter automatically; you can also paste the key into the
settings panel. The key is stored locally via Tampermonkey storage and unlocks
Pro features in place after verification.

> **Status — first revenue slice implemented.** The Pro gate now fails closed against signed-key or Lemon Squeezy validation, captures checkout-return license keys, scrubs license material from the URL, and gates bulk / multi-provider export through `PRO_FEATURES`. A production checkout URL still needs to be configured at build time, and live Claude/Gemini extraction remains foundation-only — see [Architecture: providers](#architecture-providers).

### Support / Sponsor

If ChatGPT Exporter helps you, you can support ongoing maintenance via:
- **[GitHub Sponsors](https://github.com/sponsors/organvm)** (sponsor profile: `organvm`)

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

## Usage

This repository builds one browser userscript. The runtime entrypoint is
[`src/main.tsx`](./src/main.tsx), and Vite emits the installable file as
`dist/chatgpt.user.js`. The package is private and does not expose an npm
`bin`, `main`, `module`, or `exports` API.

### Install the userscript

Install a userscript manager such as **Tampermonkey**, then install one of the
published userscript files:

| Source | Link |
|--------|------|
| GreasyFork | [Install from GreasyFork](https://greasyfork.org/scripts/456055-chatgpt-exporter) |
| GitHub raw userscript | [Install `dist/chatgpt.user.js`](https://raw.githubusercontent.com/organvm/a-i-chat--exporter/master/dist/chatgpt.user.js) |

The userscript metadata in [`vite.config.ts`](./vite.config.ts) matches these
hosts: `chatgpt.com`, `chat.openai.com`, and `new.oaifree.com`. It runs on the
root page, `?model=*`, `/c/*`, `/g/*`, `/gpts`, `/gpts/*`, `/share/*`, and
`/share/*/continue` paths for those hosts.

### Run it in ChatGPT

After installation, open a supported ChatGPT page. The script injects an
**Export** menu into the sidebar. On share pages, it injects the same menu above
the shared conversation content. If ChatGPT history is disabled in browser
storage, the injected menu shows **Chat History disabled** and export actions
are not available.

Actions that call `src/api.ts` require the local **API Auth** gate first. This
includes Copy Text, Markdown, HTML, JSON, Export All, archive/delete, project
loading, and timestamp injection. Screenshot export reads the current page DOM
and does not call the backend API.

1. Open **Export** -> **Exporter Settings**.
2. In **API Auth**, click **Issue API Key**.
3. Keep the issued key if you need to unlock again later. The UI shows the
   plaintext key once, while the script stores a SHA-256 digest in Tampermonkey
   storage.
4. If the current tab is locked later, paste the key into **API Auth** and click
   **Unlock**. **Revoke** removes the stored digest and session authorization.

### Single-conversation actions

Open a conversation before using these actions. Otherwise the script alerts that
a conversation must be started first.

| Menu action | Actual behavior |
|-------------|-----------------|
| **Copy Text** | Fetches the current conversation, converts messages to plain text, and copies the result to the clipboard. Images become `[image]` placeholders. |
| **Screenshot** | Captures the conversation thread DOM with `html2canvas` and downloads a `.png`. Very large conversations can hit browser canvas limits and fail. |
| **Markdown** | Fetches the current conversation and downloads a `.md` file. Optional metadata and Markdown timestamps come from settings. |
| **HTML** | Fetches the current conversation and downloads a self-contained `.html` file using `src/template.html`. Optional metadata and HTML timestamps come from settings. |
| **JSON** -> **OpenAI Official Format** | Fetches the current conversation and downloads a `.json` file containing an array with the raw conversation response. |
| **JSON** -> **JSONL (TavernAI, SillyTavern)** | Converts the current conversation to JSONL. This button is disabled unless the verified Pro license grants `multi-provider-export`. |
| **JSON** -> **Ooba (text-generation-webui)** | Converts the current conversation to the Ooba JSON shape. This button is disabled unless the verified Pro license grants `multi-provider-export`. |

The default filename format is `ChatGPT-{title}`. File naming replaces
`{title}`, `{date}`, `{timestamp}`, `{chat_id}`, `{create_time}`, and
`{update_time}`. The title is sanitized and spaces become underscores.

### Export All

**Export All** opens the bulk dialog. It is disabled unless the verified Pro
license grants `bulk-export`.

From the API source, the dialog fetches projects and conversation lists from
ChatGPT, then lets you select conversations, optionally filter by project, and
choose one output type:

| Output type | Downloaded file |
|-------------|-----------------|
| Markdown | `chatgpt-export-markdown.zip` containing `.md` files |
| HTML | `chatgpt-export-html.zip` containing `.html` files |
| JSON | `chatgpt-export.json` containing the selected raw conversations in one array |
| JSON (ZIP) | `chatgpt-export-json.zip` containing one `.json` file per conversation |

The dialog uses a `RequestQueue` with 200 ms spacing and 1600 ms backoff for
conversation fetches, archive requests, and delete requests. **Archive** and
**Delete** are available only for API-loaded conversations, and each asks for
browser confirmation before sending the request.

The upload button imports an official `conversations.json`-style file only when
the JSON parses as an array. In the current UI it is also gated by the
`multi-provider-export` Pro feature. Imported local conversations can be
re-exported by the same Markdown, HTML, JSON, and JSON (ZIP) choices, but they
cannot be archived or deleted.

### Settings

Open **Export** -> **Exporter Settings** to change persisted userscript
settings:

| Setting | Actual behavior |
|---------|-----------------|
| **Language** | Selects one of the locales in `src/i18n.ts`; the value is stored as `exporter:language`. |
| **File Name** | Edits the filename template. Default: `ChatGPT-{title}`. |
| **Export All Limit** | Controls the maximum conversations fetched by Export All. Default: `1000`; slider range: `100` to `20000` in steps of `100`. |
| **Pro License** | Stores the license key as `exporter:pro_license_key` and verifies it with the license helpers. **Buy Pro** is enabled only when checkout is configured at build time via `LEMONSQUEEZY_STORE_ID` (or `VITE_LEMONSQUEEZY_STORE_ID`). |
| **API Auth** | Issues, unlocks, and revokes the local API gate required before backend API calls run. |
| **Conversation Timestamp** | Injects per-message timestamps into the ChatGPT page when enabled. Optional sub-toggles enable 24-hour display, HTML export timestamps, and Markdown export timestamps. |
| **Export Metadata** | Adds configured key/value metadata to Markdown front matter and to the HTML metadata block. Defaults to `title: {title}` and `source: {source}` when enabled. |

Markdown metadata values support: `{title}`, `{date}`, `{timestamp}`,
`{source}`, `{model}`, `{model_name}`, `{create_time}`, and `{update_time}`.
HTML metadata values support: `{title}`, `{date}`, `{timestamp}`,
`{source}`, `{model}`, `{mode_name}`, `{create_time}`, and `{update_time}` (note: HTML uses `{mode_name}` instead of `{model_name}`).

### Development commands

Use Node.js `>=20.0.0` and pnpm `8.14.1` as declared in
[`package.json`](./package.json):

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm lint:fix
```

The package scripts are:

| Command | Actual script |
|---------|---------------|
| `pnpm dev` | `vite` |
| `pnpm build` | `vite build`; writes `dist/chatgpt.user.js` |
| `pnpm test` | `vitest run && tsc --noEmit` |
| `pnpm lint` | `eslint .` |
| `pnpm lint:fix` | `eslint . --fix` |
| `pnpm prepare` | `husky` |
| `pnpm run site:build` | `node scripts/build-site.mjs --build`; rebuilds the userscript and assembles `dist-site/` |
| `pnpm run preview:site` | `node scripts/build-site.mjs && npx --yes serve dist-site -l 8080` |
| `pnpm run deploy` | `docker compose up -d --build` |
| `pnpm run deploy:docker` | `docker compose up -d --build` |
| `pnpm run deploy:vercel` | `npx --yes vercel deploy --prod` |
| `pnpm run deploy:cloudflare` | `pnpm run site:build && npx --yes wrangler pages deploy dist-site --project-name chatgpt-exporter` |

The static-site helper has one flag:

```bash
node scripts/build-site.mjs         # build only if dist/chatgpt.user.js is missing, then assemble dist-site/
node scripts/build-site.mjs --build # always run pnpm run build first, then assemble dist-site/
```

Set `LEMONSQUEEZY_STORE_ID` or `VITE_LEMONSQUEEZY_STORE_ID` at build time to
enable the in-app **Buy Pro** button and the landing-page **Buy Pro** CTA:

```bash
LEMONSQUEEZY_STORE_ID="https://your-store.lemonsqueezy.com/buy/..." pnpm build
```

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
