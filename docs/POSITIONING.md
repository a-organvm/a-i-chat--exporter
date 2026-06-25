# ChatGPT Exporter — Internal Positioning

> **STATUS: INTERNAL RECORD ONLY.** This is the strategic anchor for any inbound engagement routed from the repository's front door (the "Work with the builder" block in the [README](../README.md)). It captures the target market, value proposition, and engagement-depth ladder. **Never publish dollar amounts publicly.** The public front door names the problem and the proof; price is negotiated privately, always from a high-ticket floor.

This document is for `a-i-chat--exporter`, a live, shipping product with its own free/Pro pricing (see [Pricing and Monetization](../README.md#pricing-and-monetization)). The positioning here is **deliberately distinct from the product's own Pro tier**: the front door is about high-ticket *build/run engagements* and *hiring the builder* — not the price of the userscript's Pro license. The two never compete on the same page.

## Contents

- [The Expensive Problem](#the-expensive-problem)
- [Who Pays](#who-pays)
- [Why It's High-Ticket](#why-its-high-ticket)
- [The Engagement-Depth Ladder](#the-engagement-depth-ladder)
  - [Level 1 — Tactical Consult](#level-1--tactical-consult)
  - [Level 2 — Deploy / Integrate](#level-2--deploy--integrate)
  - [Level 3 — Build & Operate](#level-3--build--operate)
  - [Level 4 — Hire the Builder](#level-4--hire-the-builder)

## The Expensive Problem

An organization's highest-value thinking now happens inside AI chat platforms — and those platforms ship **no real export**. The web interface produces no Markdown, no bulk download, no archival snapshot; the one official data dump is a single opaque JSON file most teams cannot use. The knowledge is ephemeral, unsearchable, un-archivable, and impossible to route into the systems where it would actually compound: compliance archives, internal search, RAG pipelines, version control.

Closing that gap is not a weekend script. It means authenticating against an **undocumented internal API** (`/backend-api/`), traversing a *branching* conversation tree from `current_node` back through parent links into a clean linear path, resolving `file-service://` asset pointers into embedded data, rate-limiting against throttles, and rendering everything into archival-fidelity formats — all client-side, with no backend to lean on, across nine localized UIs and multiple host variants. That is rare, durable engineering, and the cost of *not* having it is measured in lost institutional knowledge.

## Who Pays

Two distinct high-ticket buyers, served by the **same proof** — this repository.

### A. The Build/Run Buyer (Deploy / Integrate / Operate)

- **Who:** Heads of data, knowledge, compliance, or engineering at organizations whose people live in ChatGPT, Claude, or Gemini and need that output captured, structured, and routed into their own stack.
- **Why they pay:** They cannot afford a brittle hobby script against an API that changes underneath them. They need durable extraction, archival-grade output, fail-closed gating, and someone who will *operate* it as the platforms shift. They want the architecture in this repository deployed for their org, extended to their providers, or run as a managed pipeline.
- **The signal:** "Deploy this for your org" — white-label deployment, provider extension (the Claude/Gemini scaffolds in [`src/providers/`](../src/providers) made live), or a managed knowledge-capture pipeline.

### B. The Talent Buyer (Hire / Acquire)

- **Who:** VPs of Engineering, hiring managers, and elite technical recruiters filling senior, staff, and principal engineering roles — not only in AI tooling, but anywhere that demands resilient browser-side systems, reverse-engineering instinct, and shipped product discipline.
- **Why they pay:** They are buying the hands that built this. A single-file userscript that reverse-engineers an internal API, linearizes a tree data model, ships five exporters, a fail-closed license gate, a rate-limited queue, and nine-language i18n is proof of someone who ships production software without hand-holding.
- **The signal:** "Work with the team that built this" — a full-time, high-leverage engineering role at a senior-to-principal band.

## Why It's High-Ticket

We do not negotiate down and we do not do Fiverr-style gigs. The engagement starts serious because the artifact is serious.

- **It is live, not a mock.** A shipping userscript distributed on GreasyFork as one of the highest-traffic ChatGPT utilities, with a real Pro tier gated by signed-key / Lemon Squeezy validation that **fails closed**.
- **It is hard-won engineering.** Reverse-engineered internal API access, a branching-tree conversation model linearized for export, LaTeX-safe Markdown via placeholder substitution and AST normalization, self-contained HTML with KaTeX, full-thread PNG capture with progressive canvas-limit fallback, and a rate-limited request queue ([`src/utils/queue.ts`](../src/utils/queue.ts)).
- **It is durable under change.** A provider abstraction ([`src/providers/`](../src/providers)) lets the same exporters serve ChatGPT today and Claude/Gemini next — the mark of architecture, not a one-off.
- **Scarcity.** Engineers who can hold reverse-engineering, resilient client-side data extraction, payment/license gating, and product polish in one head are rare. The production weight of the work is the price signal — no negotiation required.

## The Engagement-Depth Ladder

Inbound leads from the README front door are routed up this ladder by need and seriousness. Each rung is a real anchor in this document; price anchors are held **privately** and never published here.

### Level 1 — Tactical Consult

Paid architectural review or extraction roadmap: assess the buyer's current AI-knowledge-capture stack against this blueprint, scope the providers and formats they actually need. Paid upfront — it filters tire-kickers immediately.

### Level 2 — Deploy / Integrate

A dedicated, branded, or org-internal deployment of the exporter; or integration of its capture/export core into the buyer's existing knowledge, compliance, or RAG systems — including standing up the Claude/Gemini provider scaffolds against live sessions.

### Level 3 — Build & Operate

Net-new capability built on this architecture for the buyer's operational reality — new providers, custom formats, pipeline hooks — plus ongoing operation as the upstream platforms change. Retainer or project engagement at premium rates.

### Level 4 — Hire the Builder

The buyer wants the hands, not the product, and brings the builder in-house for a senior, staff, or principal engineering role. The repository is the work sample; the conversation is about scope and impact, not a rate card.
