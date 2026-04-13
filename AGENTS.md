# AGENTS.md

This package contains DeepCitation skills — self-contained Markdown instruction files for AI coding agents (Claude Code, Cursor, etc.) that integrate with the DeepCitation verification API.

Use progressive disclosure: keep this file minimal and load focused guidance only when relevant.

## Environment

- No build step — skills are pure Markdown
- Validate by reading: `skills/<name>/SKILL.md`
- Rules files live under `skills/<name>/rules/`

## Always-Applicable Invariants

- Product name is `DeepCitation` (never `DeepCite`).
- Use generic, domain-neutral examples as "lorem ipsum" stand-ins: invoices, leases, contracts, memos, earnings PDFs. Never use real product benchmarks, model version strings (e.g. "Claude 4.6 Sonnet", "GPT-5"), or specific brand claims as illustrative examples — they become stale and carry unintended implications.
- Claim examples in SKILL.md must read like illustrative placeholders, not factual assertions about real products or services.
- Auth command is `deepcitation auth` (not `login`).
- Never suggest `DEEPCITATION_API_KEY=...` env-var prefixing; the CLI persists credentials via `auth --key`.
- Never print or log key values in chat.

## Guidance Router

- Working on SKILL.md authoring, pipeline steps, citation format, or `prepare`/`verify` command usage:
  [skills/verify/SKILL.md](skills/verify/SKILL.md)
- Working on auth handling, credential flow, or `action needed` recovery:
  [skills/verify/rules/auth.md](skills/verify/rules/auth.md)
- Working on cloud sandbox behavior, proxy rules, timeout baselines, or `__DC_ERROR__` handling:
  [skills/verify/rules/cloud-sandbox-constraints.md](skills/verify/rules/cloud-sandbox-constraints.md)
- Working on citation field naming, domain model, `claimText`/`sourceMatch` terminology, or view states:
  `packages/deepcitation/docs/agents/deep-citation-concepts.md`
- Working on `k`, `l`, `f`, Format 1/2 hard rules, or truncation strategy:
  `packages/deepcitation/docs/agents/deep-citation-standards.md`

If multiple domains apply, open only the relevant files above instead of loading everything.
