# ChatGPT Exporter — Launch Post (Build in Public)

## Show HN

**Title:** Show HN: ChatGPT Exporter — export ChatGPT conversations to files, locally, in one place

**Body:**

I open sourced `ChatGPT Exporter`, a browser userscript that adds conversation export tools directly inside the ChatGPT web app (no extension needed, no separate backend).

What problem it solves:

- ChatGPT has no built-in per-thread export button for Markdown/HTML/screenshot workflows.
- OpenAI’s full data export is often too heavy for day-to-day use.
- People want durable, local copies of prompts and outputs they can index, review, and reuse.

What it does:

- Installs as a userscript via Tampermonkey/Violentmonkey.
- Adds an Export menu to the ChatGPT sidebar.
- Exports the current conversation in five formats:
  - Markdown (with YAML metadata when enabled)
  - HTML (styled, copy/paste-safe output)
  - JSON (raw API-format payload)
  - PNG (full-thread screenshot)
  - Plain text (clipboard copy)
- Keeps export processing in your browser. No data upload pipeline, no required account, no hidden server dependency.

Pricing model:

- Free: export one open conversation at a time in the five formats above.
- Pro: adds batch workflows for people who export a lot:
  - Bulk export to ZIP/JSON from the dialog
  - `conversations.json` re-import and re-export
  - Additional provider conversion targets (including character-chat-friendly formats)
  - Project-filtered/bulk workflow options
  - Optional conversation management actions for API-loaded items

Built details:

- Language: TypeScript + Preact
- Export logic includes AST-based markdown normalization and math-safe handling
- Bulk flow uses request backoff to reduce API pressure
- HTML/PNG exports are generated client-side

This is intentionally small-scope, practical tooling: if you just need reliable conversation backups and format conversions you can use it today:

- GitHub: https://github.com/organvm-iii-ergon/a-i-chat--exporter
- Install page: https://greasyfork.org/scripts/456055-chatgpt-exporter

Feedback is welcome: especially missing formats, screenshot edge cases, and Pro feature requests.

---

## Reddit (r/ChatGPT or r/selfhosted)

**Title:** Open-sourced ChatGPT Exporter: browser userscript for Markdown, HTML, JSON, PNG, and text exports

People still ask how to archive ChatGPT conversations without waiting on a full platform export. I just published `ChatGPT Exporter` to address that workflow gap.

This is a browser userscript (Tampermonkey/Violentmonkey) that injects an export menu in ChatGPT and supports:

- Markdown (+ metadata)
- HTML
- JSON (raw format)
- PNG thread screenshot
- Plain text to clipboard

It’s free for everyday single-conversation use. A paid Pro tier adds batch export and import/conversion workflows for heavier users:

- Bulk export in zip/json flows
- Import and re-export official `conversations.json`
- Additional conversion targets for character-chat flows
- Project-filtered export and batch conversation actions

Everything runs locally in the browser; no backend is required for ordinary export.

Install + source:

- https://greasyfork.org/scripts/456055-chatgpt-exporter  
- https://github.com/organvm-iii-ergon/a-i-chat--exporter

---

## X / Twitter thread

1) I just released `ChatGPT Exporter` as a browser userscript.

It adds conversation export directly inside the ChatGPT interface, so you can save work locally without moving data through a separate service.

2) Export formats:
✅ Markdown  
✅ HTML  
✅ JSON (raw payload shape)  
✅ PNG screenshot  
✅ Plain text

3) Free path: export the open conversation in those formats.

Pro path: bulk workflows (ZIP/JSON), `conversations.json` import, and extra provider conversion targets for character-chat workflows.

4) Notes:
- Browser-only processing
- No account required for core workflow
- Open source on GitHub
- Designed for people who need stable archives and reusable chat artifacts

5) Try it:
Install: https://greasyfork.org/scripts/456055-chatgpt-exporter  
Source: https://github.com/organvm-iii-ergon/a-i-chat--exporter
