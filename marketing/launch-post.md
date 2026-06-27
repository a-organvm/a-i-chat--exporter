# ChatGPT Exporter — Launch Post (Build in Public)

## BEFORE POSTING — Checklist

- [ ] `LEMONSQUEEZY_STORE_ID` configured and build deployed (required for in-app **Buy Pro** button to appear)
- [ ] Pro price defined and added to the response templates below ("How much does Pro cost?")
- [ ] GreasyFork listing updated to match v2.29.1
- [ ] GitHub Sponsors profile (`organvm`) is live and linked
- [ ] Verify GreasyFork ranking claim is still current before posting

---

## Show HN

**Title:** Show HN: ChatGPT Exporter – Markdown, HTML, JSON, PNG Export for ChatGPT Conversations

**Body:**

ChatGPT Exporter is a browser userscript that adds a five-format export menu to the ChatGPT web interface. No backend, no account, no data upload — everything runs in your browser.

**Problem:**
- ChatGPT doesn’t export conversations to Markdown or HTML natively.
- OpenAI’s official data export is a single massive JSON file.
- Researchers, writers, and developers regularly archive conversations for reference, analysis, or ingestion into knowledge systems.

**Solution:**
- Installs as a userscript (Tampermonkey, Violentmonkey, or GreasyFork).
- Injects an **Export** menu into the ChatGPT sidebar.
- Exports the current conversation in five formats:
  - **Markdown** — YAML front matter, preserved LaTeX, footnote conversion
  - **HTML** — self-contained file, theme-aware (dark/light), KaTeX rendering, embedded avatars
  - **JSON** — raw OpenAI API format (for ingestion into other systems)
  - **PNG** — full-thread screenshot via html2canvas
  - **Plain text** — markdown formatting stripped, copied to clipboard
- All processing happens locally. Your data never leaves your machine.

**Pricing (no paywall on the common workflow):**
- **Free:** export one open conversation at a time in all five formats.
- **Pro ($):** for researchers and developers who export at scale:
  - Bulk export: select multiple conversations or export all, download as ZIP or JSON
  - Upload and re-export: import OpenAI’s `conversations.json` export, then re-export selected conversations
  - Format conversion: TavernAI and Ooba character-chat formats
  - Project filtering: scope bulk exports to ChatGPT Projects
  - Conversation management: archive or delete multiple conversations via the API

**Technical details:**
- Built in TypeScript + Preact, compiled to a single userscript file (external heavy dependencies — jszip, html2canvas — loaded from jsDelivr CDN at runtime).
- Markdown exporter uses mdast AST normalization to preserve LaTeX and convert ChatGPT’s custom footnote syntax to markdown footnotes.
- Bulk export uses a smart rate-limited request queue (200ms/1600ms backoff) to avoid throttling ChatGPT’s API.
- Extensible provider architecture scaffolds Claude and Gemini support (deferred — foundation-only today).
- Localized in 9 languages: EN, ES, FR, ID, JA, RU, TR, ZH-Hans, ZH-Hant.

**Distribution:**
- GreasyFork: [Install here](https://greasyfork.org/scripts/456055-chatgpt-exporter) — one of the highest-traffic ChatGPT utility scripts.
- GitHub raw: [Direct install](https://raw.githubusercontent.com/organvm-iii-ergon/a-i-chat--exporter/master/dist/chatgpt.user.js).
- Open source (MIT): [organvm-iii-ergon/a-i-chat--exporter](https://github.com/organvm-iii-ergon/a-i-chat--exporter).

**Status:** v2.29.1, production, actively maintained.

---

## Reddit (r/ChatGPT or r/selfhosted)

**Title:** ChatGPT Exporter: Open-Source Browser Userscript for Markdown/HTML/JSON/PNG Export

I maintain a fork of ChatGPT Exporter (originally open-sourced by pionxzh in 2022) and just crossed into production-ready. It’s a browser userscript that fills a gap: OpenAI doesn’t export conversations to Markdown or HTML, and researchers/writers/developers regularly need to archive conversations for reference or ingestion into knowledge systems.

**What it actually does:**

Install as a Tampermonkey/Violentmonkey userscript. Opens a ChatGPT conversation. Click **Export** in the sidebar and choose:
- **Markdown** — with optional YAML front matter (title, model, timestamp). LaTeX preserved. ChatGPT’s footnotes converted to markdown footnote syntax.
- **HTML** — self-contained, theme-aware (auto-detects dark/light mode), includes KaTeX LaTeX rendering and embedded avatars.
- **JSON** — raw OpenAI API format for processing by other tools.
- **PNG** — full-thread screenshot using html2canvas with progressive scaling fallback.
- **Plain text** — markdown stripped, copied to your clipboard.

All processing happens in your browser. No account, no backend, no data upload.

**Free vs. Pro:**

Free tier: export single conversations in all five formats. No paywall. This covers the vast majority of casual use.

Pro tier ($): for people who export at scale:
- **Bulk export:** select multiple conversations or all of them, download as ZIP or JSON.
- **JSON import:** upload OpenAI’s `conversations.json` export, then re-export selected conversations in any format.
- **Format conversion:** TavernAI and Ooba character-chat formats (for use in SillyTavern, text-generation-webui, etc.).
- **Project filtering:** scope bulk exports to ChatGPT Projects.
- **Conversation management:** archive or delete multiple conversations directly from the export dialog.

**Real context:**

- Built in TypeScript + Preact. Single userscript file (heavy deps loaded from CDN at runtime).
- Distributed primarily via GreasyFork (one of the highest-traffic ChatGPT utility scripts there).
- Localized in 9 languages.
- Open source (MIT). Active maintenance, no abandoned features.
- Version 2.29.1, production-ready.

**Install:**
- GreasyFork: [https://greasyfork.org/scripts/456055-chatgpt-exporter](https://greasyfork.org/scripts/456055-chatgpt-exporter)
- GitHub: [organvm-iii-ergon/a-i-chat--exporter](https://github.com/organvm-iii-ergon/a-i-chat--exporter)

Happy to answer questions or take feedback on the Pro tier, additional export formats, or edge cases in screenshot generation.

---

## X / Twitter Variants

### Variant 1: Problem-first
OpenAI's ChatGPT has no native export to Markdown or HTML. You get one massive JSON file. For researchers and writers who archive conversations, this is painful.

ChatGPT Exporter fixes it: browser userscript, five export formats, free tier for single conversations, Pro tier for bulk export.

Zero cloud. MIT open source. https://greasyfork.org/scripts/456055-chatgpt-exporter

### Variant 2: Technical focus
ChatGPT Exporter v2.29.1: browser userscript for exporting conversations to Markdown, HTML, JSON, PNG, or text.

Free: single conversation export. Pro: bulk export, JSON import, TavernAI/Ooba conversion.

All processing in your browser. No backend. 9-language localization.

https://github.com/organvm-iii-ergon/a-i-chat--exporter

### Variant 3: Use-case focus
If you save ChatGPT conversations for research or knowledge work: ChatGPT Exporter exports them as Markdown (with YAML front matter), self-contained HTML (dark theme + LaTeX rendering), JSON, PNG, or text.

Free for single conversations. Pro ($) unlocks bulk export.

https://greasyfork.org/scripts/456055-chatgpt-exporter

### Variant 4: Maker story (thread starter)
I've been building ChatGPT Exporter — a fork of the original open-source project — into a production-ready browser userscript that does one thing well: export ChatGPT conversations to portable formats.

The problem is simple: ChatGPT conversations are ephemeral. OpenAI doesn't export to Markdown or HTML. Researchers, writers, developers need archival snapshots.

🧵

1/ Free tier: export any open conversation to Markdown (with metadata), HTML (with LaTeX rendering), JSON, PNG, or text. Everything runs in your browser. No account. No servers.

2/ Pro tier ($): for people who export at scale. Bulk export to ZIP. Import OpenAI's conversations.json, then re-export. TavernAI and Ooba format conversion. Project-filtered export.

3/ Why this matters: knowledge workers archive ChatGPT conversations regularly. The built-in export is a single massive JSON file most tools can't ingest. This converts it into usable formats.

4/ Built in TypeScript + Preact. Distributed via GreasyFork (one of the highest-traffic ChatGPT utility scripts). Open source. Actively maintained.

Install: https://greasyfork.org/scripts/456055-chatgpt-exporter
Repo: https://github.com/organvm-iii-ergon/a-i-chat--exporter

---

## Guidance Notes for Posting

**Channel selection:**
- **Show HN**: Technical audience. Lead with the problem and the architecture. Emphasize AST processing, rate-limited queues, provider abstraction. Good for developer engagement.
- **Reddit r/ChatGPT**: General ChatGPT user community. Lead with the use case. Emphasize "no paywall on free tier" and "everything local." Good for user adoption.
- **Reddit r/selfhosted**: Makers and self-hosters. Lead with "zero backend, no data upload." Emphasize the browser-only architecture and open-source angle.
- **X/Twitter**: Pick a variant based on your audience. Thread starter if you want engagement; single tweet if you want quick reach.

**What to emphasize (no hype):**
- ✅ "Free tier covers single-conversation export" (not "free forever" or "never paywall")
- ✅ "Distributed via GreasyFork" (not "millions of downloads" — we haven't claimed that)
- ✅ "One of the highest-traffic ChatGPT utility scripts" (factual, from GreasyFork's ranking)
- ✅ "Runs entirely in your browser" (key differentiator)
- ✅ "Built in TypeScript + Preact" (technical credibility)
- ✅ "Actively maintained" (future-proof signal)

**What to avoid:**
- ❌ Invented user counts ("10K+ users", "trusted by 5,000 researchers")
- ❌ "Archival-quality" without context (the Markdown + YAML + preserved LaTeX actually qualify, but say "durable formats")
- ❌ Claiming Claude/Gemini support (it's scaffolded, not live)
- ❌ "The only way to export ChatGPT" (there are other tools; we're just better at Markdown/HTML)
- ❌ "Pro tier is required for X" (clarify that Pro is optional and covers advanced/bulk workflows only)

**Post timing:**
- Coordinate with any social media amplification (GitHub, Ko-fi, GitHub Sponsors links)
- Monitor GreasyFork install count and GitHub stars in the 48 hours after posting
- Be ready to answer questions about Pro tier pricing (not in this draft, but should be defined)

**Follow-up response template:**
For common questions:

**"How much does Pro cost?"**
[FILL IN BEFORE POSTING — set price in Lemon Squeezy, then add: "Pro is $X/month (or $Y one-time). Unlocks bulk export, JSON import, and format conversion."]

**"Is Pro required?"**
No. Free tier exports any open conversation in all five formats with no limitations. Pro is for people who export hundreds of conversations at once or need bulk workflows.

**"Will the free tier always be free?"**
Yes. Single-conversation export is the core use case and always free. Pro covers heavier workflows.

**"Where does my data go?"**
Nowhere. Everything runs in your browser. No upload, no backend, no tracking.
