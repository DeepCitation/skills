---
name: verify
description: Use when the user wants claims verified, facts checked, or evidence cited against a source document (PDF, DOCX, XLSX, PPTX, image, URL, etc.), OR when /verify appears in the prompt. Reads evidence with DeepCitation, embeds DeepCitation's live interactive citations into a clean HTML report, and opens it in lavish-axi so the user can inspect each source and comment back.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — a readable report with DeepCitation's live citations, reviewable in lavish

This skill answers a question (or checks claims) against a source, then delivers a **well-made HTML
report whose citations are DeepCitation's own interactive citations** — click one and the user sees
the actual source: the matched phrase, the evidence keyhole crop, the page view. The report opens in
**lavish-axi**, so the user can also pin any claim and comment or question it back to the agent.

Two runtimes, one file, each doing what it is best at:

- **DeepCitation owns verification and the citation UX.** `prepare` reads the evidence; `verify --html`
  decides each citation's status and **embeds the interactive popover runtime** (badge state, evidence
  keyhole, page view, variance) into the report. We never invent a verification UI or a score.
- **lavish-axi owns the report shell and the review loop.** It makes the HTML nice and runs the
  annotate → poll → reply round-trip. We never rebuild DeepCitation's citation rendering inside it.

> **Verification is woven in, not the show.** Users *scan* citations, they do not read them. The report
> is a good report; the citations happen to be live. Do not build a "verification report" with a hero
> banner, score, or dashboard. See [`packages/deepcitation/docs/agents/deep-citation-concepts.md`](../../../deepcitation/docs/agents/deep-citation-concepts.md).

## When to run

Run when `/verify` is in the prompt, or when the user has BOTH (a) a claim/answer/document with claims
AND (b) a source to verify against. **If the user only wants to read, OCR, summarize, or translate a
document, do NOT run this skill** — call `deepcitation prepare` directly and answer normally. /verify is
for when there is something to cite. If `.deepcitation/<name>.json` already exists from an earlier
`prepare`, skip step 2.

## The verification model (use DeepCitation's, never invent one)

Status is **discrete and decided by the match**, never a confidence score:

| Badge state | Meaning | Comes from |
|---|---|---|
| `verified` | `sourceMatch` located; `isVerbatim` | exact match in the source |
| `variance` | located but the wording differs ("FREE" vs "$0.00", "roughly half" vs "50%") | `isVerbatim === false` → `varianceFootnote` reconciles the two strings |
| `unverified` | not found in the source | no located match |
| `pending` | verification still resolving | in-flight |

`verify --html` assigns these. **Never** add a percentage, a "confidence", a star rating, or a parallel
status of your own. The substring-collapse rule and Format 1/2 anchor rules live unchanged in
[rules/citation-anchors.md](rules/citation-anchors.md).

## Workflow

1. **Orient.** Emit the preamble (`Claim:` / `Evidence:` on their own lines), then call `prepare` in the
   same turn. A claim cannot be its own evidence; if it is unclear which file is claims vs. evidence, ask.

2. **Prepare evidence.** `prepare` is the only reader — built-in PDF/OCR/office/web. It writes the JSON
   payload to **stdout** and status lines to **stderr** — redirect stdout only, **never `2>&1`** (it
   corrupts the JSON and hides sandbox signals).
   ```bash
   mkdir -p .deepcitation .lavish
   npx -y deepcitation@latest prepare <file-or-url> > .deepcitation/<name>.json
   ```
   Multiple sources: one parallel `prepare` each (`&` + `wait`). On **"action needed"** follow
   [rules/auth.md](rules/auth.md); on sandbox/network behavior see
   [rules/cloud-sandbox-constraints.md](rules/cloud-sandbox-constraints.md). Never `DEEPCITATION_API_KEY=`
   prefix; never print keys. Read the original file and the prepare output fully before authoring.

3. **Author the report.** Pick the shape the *answer* needs and open lavish's own playbook + design for
   it (`npx -y lavish-axi playbook <id>` — e.g. `table` for tabular findings, `comparison`, `plan` — and
   `npx -y lavish-axi design`). Write the answer as a clean, lavish-styled HTML document to
   `.lavish/<topic>-verify.html`, wrap each cited phrase in a `data-cite="N"` element, and append a
   `<<<CITATION_DATA>>>` block (`n, r, f, k, p, l` in CoT order). The answer is the deliverable; citations
   are inline and scannable. **DeepCitation's popover is the evidence surface — do NOT build a separate
   evidence table, status grid, or discrepancy list; that re-presents what the live citation already
   shows.** For 100+ pages across 3+ files, split per [rules/parallel-generation.md](rules/parallel-generation.md)
   (subagents emit per-section bodies + `<<<CITATION_DATA>>>`; the main loop assembles one report).

4. **Embed live citations.** Run `verify --html` once — it verifies against the source, replaces each
   `data-cite` with a hashed `data-citation-key`, and injects DeepCitation's runtime (badge, evidence
   keyhole, page view, variance) **into your report, styling preserved**.
   ```bash
   npx -y deepcitation@latest verify --html .lavish/<topic>-verify.html \
     --title "Descriptive Report Title" --claim "the question or claim verified" \
     --out .lavish/<topic>-verify.html
   ```
   Run verify ONCE; the API handles partial matches and flags unmatched anchors in its summary.

5. **Make it reviewable + open.** Ensure the lavish-axi SDK is wired and that `[data-citation-key]`
   elements are **excluded from lavish's click-to-annotate** (a citation click opens DeepCitation's
   popover; clicking/selecting the surrounding prose starts a lavish comment) — contract in
   [rules/lavish-loop.md](rules/lavish-loop.md). Then open with the layout gate and fix every
   `layout_warning` before involving the user:
   ```bash
   npx -y lavish-axi .lavish/<topic>-verify.html
   ```

6. **Poll loop.** `npx -y lavish-axi poll .lavish/<topic>-verify.html` — long-running; run it as a
   background task and re-run if killed (queued feedback is never lost). The user reads, clicks citations
   to inspect the source, and comments/questions specifics. Parse each returned prompt: element click vs.
   `target.type === "text-range"` (whose `target.text` is the exact flagged bytes).

7. **Revise on feedback.** The user's comment is the signal — there is no judge panel. Apply it (fix a
   claim, re-anchor a citation, or `prepare` a better source), then re-run step 4 on the **same** file
   path (the session is keyed by path) and reply:
   ```bash
   npx -y lavish-axi poll .lavish/<topic>-verify.html --agent-reply "<one line on what changed>"
   ```

8. **End.** When the user ends the session: `npx -y lavish-axi end <file>` then `npx -y lavish-axi stop`.

## Invariants

- **DeepCitation owns verification and the citation UX.** `prepare` reads; `verify --html` decides status
  and renders the interactive citation. Never hand-build a citation popover, badge, or evidence view.
- **No confidence — ever.** Status is the discrete `verificationBadge` state (`verified` / `variance` /
  `unverified` / `pending`) from the match. No scores, percentages, or invented parallel status.
- **Don't over-emphasize verification.** It is a good report whose citations are live. No hero banner,
  no score dashboard, no "trust" framing. Verification scans; evidence is on-demand in the popover.
- **lavish = report shell + review loop only.** It makes the HTML nice and runs annotate→poll→reply;
  exclude `[data-citation-key]` from its click capture so it never hijacks a citation.
- **DeepCitation is the only evidence reader.** No direct-read fallback. If `prepare` or `verify` cannot
  complete, the deliverable is not producible — show the error and stop. Never fabricate citations.
- Use only real lavish verbs: `lavish-axi <file> | poll | end | stop | playbook | design`
  (`--timeout-ms` is test-only). Use only real DeepCitation commands: `prepare`, `verify --html`, `auth`.
- **Format 1 for anything that must anchor** (Format 2 auto-promotes `k` and breaks verification).
- Auth is `deepcitation auth`; never `DEEPCITATION_API_KEY=` prefix; never print keys.
- Always "DeepCitation" (never "DeepCite"). Always deliver the report.
