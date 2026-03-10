# CLAUDE.md — a-i-chat--exporter

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**@pionxzh/chatgpt-exporter** — browser extension to export ChatGPT and other AI chat conversation history. Supports multiple export formats. Fork of the original chatgpt-exporter, extended to cover additional AI chat interfaces.

**Active branch**: `master` (not `main`).

## Commands

```bash
pnpm install         # Install dependencies
pnpm run dev         # Vite dev server (for local testing)
pnpm run build       # Vite build → dist/ (load unpacked in Chrome)
pnpm run test        # TypeScript typecheck only (tsc --noEmit) — no test suite
pnpm run lint        # ESLint
pnpm run lint:fix    # ESLint with auto-fix
```

## Architecture

Browser extension built with TypeScript + Vite. Output in `dist/` — load as unpacked extension in `chrome://extensions`.

**Entry points** (`src/`):
- `main.tsx` — Content script injected into chat pages
- `page.ts` — Page-level utilities
- `api.ts` — API interaction helpers
- `constants.ts` — Shared constants
- `i18n.ts` — Internationalization (locales in `src/locales/`)
- `style.css` / `src/styles/` — Extension styles

**Exporter module** (`src/exporter/`): Format-specific export logic (JSON, Markdown, HTML, etc.)

**Hooks** (`src/hooks/`): React hooks for extension UI components

**Releases**: Managed by `release-please`. Config in `release-please-config.json` / `.release-please-manifest.json`. CHANGELOG auto-generated.

**Git hooks**: Husky (`.husky/`) — runs lint/typecheck pre-commit.

## Notes

- No formal test suite — `npm test` only typechecks
- Multilingual READMEs: `README_FR.md`, `README_ID.md`, `README_KR.md`, `README_TR.md`

<!-- ORGANVM:AUTO:START -->
## System Context (auto-generated — do not edit)

**Organ:** ORGAN-III (Commerce) | **Tier:** standard | **Status:** PUBLIC_PROCESS
**Org:** `organvm-iii-ergon` | **Repo:** `a-i-chat--exporter`

### Edges
- **Produces** → `ORGAN-IV`: product-artifact
- **Produces** → `organvm-vi-koinonia/community-hub`: community_signal
- **Produces** → `organvm-vii-kerygma/social-automation`: distribution_signal
- **Consumes** ← `ORGAN-IV`: governance-rules

### Siblings in Commerce
`classroom-rpg-aetheria`, `gamified-coach-interface`, `trade-perpetual-future`, `fetch-familiar-friends`, `sovereign-ecosystem--real-estate-luxury`, `public-record-data-scrapper`, `search-local--happy-hour`, `multi-camera--livestream--framework`, `universal-mail--automation`, `mirror-mirror`, `the-invisible-ledger`, `enterprise-plugin`, `virgil-training-overlay`, `tab-bookmark-manager`, `.github` ... and 12 more

### Governance
- Strictly unidirectional flow: I→II→III. No dependencies on Theory (I).

*Last synced: 2026-03-08T20:11:34Z*

## Session Review Protocol

At the end of each session that produces or modifies files:
1. Run `organvm session review --latest` to get a session summary
2. Check for unimplemented plans: `organvm session plans --project .`
3. Export significant sessions: `organvm session export <id> --slug <slug>`
4. Run `organvm prompts distill --dry-run` to detect uncovered operational patterns

Transcripts are on-demand (never committed):
- `organvm session transcript <id>` — conversation summary
- `organvm session transcript <id> --unabridged` — full audit trail
- `organvm session prompts <id>` — human prompts only


## Active Directives

| Scope | Phase | Name | Description |
|-------|-------|------|-------------|
| system | any | prompting-standards | Prompting Standards |
| system | any | research-standards-bibliography | APPENDIX: Research Standards Bibliography |
| system | any | research-standards | METADOC: Architectural Typology & Research Standards |
| system | any | sop-ecosystem | METADOC: SOP Ecosystem — Taxonomy, Inventory & Coverage |
| system | any | autopoietic-systems-diagnostics | SOP: Autopoietic Systems Diagnostics (The Mirror of Eternity) |
| system | any | cicd-resilience-and-recovery | SOP: CI/CD Pipeline Resilience & Recovery |
| system | any | cross-agent-handoff | SOP: Cross-Agent Session Handoff |
| system | any | document-audit-feature-extraction | SOP: Document Audit & Feature Extraction |
| system | any | essay-publishing-and-distribution | SOP: Essay Publishing & Distribution |
| system | any | market-gap-analysis | SOP: Full-Breath Market-Gap Analysis & Defensive Parrying |
| system | any | pitch-deck-rollout | SOP: Pitch Deck Generation & Rollout |
| system | any | promotion-and-state-transitions | SOP: Promotion & State Transitions |
| system | any | repo-onboarding-and-habitat-creation | SOP: Repo Onboarding & Habitat Creation |
| system | any | research-to-implementation-pipeline | SOP: Research-to-Implementation Pipeline (The Gold Path) |
| system | any | security-and-accessibility-audit | SOP: Security & Accessibility Audit |
| system | any | session-self-critique | session-self-critique |
| system | any | source-evaluation-and-bibliography | SOP: Source Evaluation & Annotated Bibliography (The Refinery) |
| system | any | stranger-test-protocol | SOP: Stranger Test Protocol |
| system | any | strategic-foresight-and-futures | SOP: Strategic Foresight & Futures (The Telescope) |
| system | any | typological-hermeneutic-analysis | SOP: Typological & Hermeneutic Analysis (The Archaeology) |
| unknown | any | gpt-to-os | SOP_GPT_TO_OS.md |
| unknown | any | index | SOP_INDEX.md |
| unknown | any | obsidian-sync | SOP_OBSIDIAN_SYNC.md |

Linked skills: evaluation-to-growth


**Prompting (Anthropic)**: context 200K tokens, format: XML tags, thinking: extended thinking (budget_tokens)

<!-- ORGANVM:AUTO:END -->


## ⚡ Conductor OS Integration
This repository is a managed component of the ORGANVM meta-workspace.
- **Orchestration:** Use `conductor patch` for system status and work queue.
- **Lifecycle:** Follow the `FRAME -> SHAPE -> BUILD -> PROVE` workflow.
- **Governance:** Promotions are managed via `conductor wip promote`.
- **Intelligence:** Conductor MCP tools are available for routing and mission synthesis.
