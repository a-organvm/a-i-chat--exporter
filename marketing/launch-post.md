# ChatGPT Exporter — Launch Post Draft (Build in Public)

Prepared for immediate posting across Show HN, Reddit, and X.

Current release: v2.29.1  
Repository: https://github.com/organvm-iii-ergon/a-i-chat--exporter  
Install: https://greasyfork.org/scripts/456055-chatgpt-exporter

---

## Show HN

### Title
Show HN: ChatGPT Exporter — export conversation history in Markdown, HTML, JSON, PNG, and text

### Body

I just shipped ChatGPT Exporter as a browser userscript for people who use ChatGPT as part of real workflows.

The pain point is simple and still unresolved for many users: once conversations are in the ChatGPT web UI, they are not easy to move into the systems you already use. You can still get a JSON export from OpenAI, but it is not the same as being able to archive, cite, search, and repurpose chats at the format level you need.

ChatGPT Exporter adds an export menu to the ChatGPT sidebar and handles:

- Export of the currently open conversation in:
  - Markdown (with optional YAML front matter)
  - Self-contained HTML (theme-aware, LaTeX/KaTeX rendering)
  - Official-style JSON
  - Full-thread PNG screenshots
  - Clipboard-friendly plain text
- Zero-account, browser-only operation: no backend and no cloud upload.
- Localized UI in 9 languages:
  - English, Spanish, French, Indonesian, Japanese, Russian, Turkish, zh-Hans, zh-Hant
- Optional metadata and filename customization for better archival hygiene.

For heavier workflows, there is a gated Pro path:

- Bulk export of multiple conversations or all conversations
- Import and re-export from OpenAI `conversations.json`
- Project-scoped filtering
- Archive/delete actions on API-loaded conversations
- Export format conversion into TavernAI / Ooba JSON formats

This is implemented as a single TypeScript + Preact userscript built with Vite and `vite-plugin-monkey`, plus format modules (`src/exporter/`) and a client-side request queue for API rate safety.

If you already keep research, coding notes, or customer-support transcripts in ChatGPT, this is meant to be boringly practical: get the data out in a useful shape, on your machine, without account handoffs.

Install:
https://greasyfork.org/scripts/456055-chatgpt-exporter

---

## Reddit

### Title
ChatGPT Exporter: local conversation export for researchers, writers, and developers

### Body

I built/released ChatGPT Exporter as a free userscript with optional paid Pro features for larger exports.

What it does:
- Exports a single open conversation into Markdown, HTML, JSON, PNG, or plain text
- Keeps processing local in your browser (no servers, no account requirement)
- Supports 9 localized interfaces
- Works as a normal userscript install via Tampermonkey / Violentmonkey
- Adds metadata options (timestamps, front matter, filename templates)

What Pro currently unlocks:
- Bulk exports (multiple/all chats)
- Re-export from uploaded `conversations.json`
- Project filtering and batch archive/delete actions
- TavernAI / Ooba conversion output

I built it to solve everyday "knowledge preservation" work: people who use ChatGPT for research notes, code planning, writing, and customer-facing work often need durable output that their existing tooling can handle.

Install:
https://greasyfork.org/scripts/456055-chatgpt-exporter

Source:
https://github.com/organvm-iii-ergon/a-i-chat--exporter

---

## X (Twitter)

### Variant A (single post)
I shipped ChatGPT Exporter (v2.29.1): a browser userscript to export ChatGPT conversations into Markdown, HTML, JSON, PNG, or plain text.  
Free tier covers single-conversation export. Pro adds bulk/JSON import/project-scoped and conversion workflows.  
Runs locally in your browser, no backend, no data upload.  
Install: https://greasyfork.org/scripts/456055-chatgpt-exporter

### Variant B (thread starter)
1/ I added a Build-in-Public release: ChatGPT Exporter now supports practical conversation export workflows for real users.

2/ Export one chat in 5 formats: Markdown (front matter), HTML, JSON, PNG, text.  
Everything local, no account, no cloud upload.

3/ Pro unlocks bulk export and import/re-export from OpenAI `conversations.json`, plus project filtering and chat conversion formats used in local toolchains.

4/ Free/open tier stays on single-conversation exports; Pro is for people exporting at scale.

5/ Install: https://greasyfork.org/scripts/456055-chatgpt-exporter  
Code: https://github.com/organvm-iii-ergon/a-i-chat--exporter

