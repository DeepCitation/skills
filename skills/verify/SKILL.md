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
  decides each citation's status and **embeds the interactive popover runtime** (badge, evidence
  keyhole, page view) into the report. We never invent a verification UI or a score.
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

`verify --html` returns a **binary** status per citation, anchored on the **`sourceContext`** sentence
(the `f` field) — never a confidence score:

| Badge state | Meaning | Comes from |
|---|---|---|
| `verified` | the `sourceContext` sentence was located in the source | the API found `f` (exact or fuzzy line match) |
| `unverified` | the `sourceContext` sentence was not found | no located passage |

**The badge follows the context sentence, not the key.** The API verifies `sourceContext` (`f`); the
`sourceMatch` (`k`) only drives the highlight. So a citation whose `f` is real but whose `k` is wrong
(or absent from `f`) still renders **verified** — the keyhole shows the true sentence, but the badge
trusts it. That puts the burden on the author:

- **`sourceContext` (`f`) must actually support the claim** — it is the thing that gets verified.
- **`sourceMatch` (`k`) must be a verbatim substring of `f`** — the CLI prints
  `Warning: … source_match — not a substring of source_context` when it isn't, and the highlight breaks.

There is **no `variance` or `pending` state and no `isVerbatim` flag** in the CLI embed (those belong to
the web app's richer renderer — do not document them here). **Never** add a percentage, a "confidence",
a star rating, or a parallel status of your own; the CLI's internal `ambiguity.confidence` is a
localization (which-occurrence) signal, is not rendered, and must not be surfaced. The substring-collapse
rule and Format 1/2 anchor rules live unchanged in [rules/citation-anchors.md](rules/citation-anchors.md).

## Workflow

1. **Orient.** Emit the preamble (`Claim:` / `Evidence:` on their own lines), then call `prepare` in the
   same turn. A claim cannot be its own evidence; if it is unclear which file is claims vs. evidence, ask.

2. **Prepare evidence.** `prepare` is the only reader. Accepted inputs: **PDF, images, Office files
   (doc/docx/xls/xlsx/ppt/pptx/rtf/odt/ods), CSV/TSV, and URLs** — **plain `.txt` is rejected** (convert
   it to PDF, or feed the page image). It writes the JSON payload to **stdout** and status lines to
   **stderr** — redirect stdout only, **never `2>&1`** (it corrupts the JSON and hides sandbox signals).
   ```bash
   mkdir -p .deepcitation .lavish
   npx -y deepcitation@latest prepare <file-or-url> > .deepcitation/<name>.json
   ```
   Read each source's **`attachmentId`** from the prepare JSON (the `attachmentId` field) — step 3's
   citation block is keyed by it. Multiple sources: one parallel `prepare` each (`&` +
   `wait`). On **"action needed"** follow
   [rules/auth.md](rules/auth.md); on sandbox/network behavior see
   [rules/cloud-sandbox-constraints.md](rules/cloud-sandbox-constraints.md). Never `DEEPCITATION_API_KEY=`
   prefix; never print keys. Read the original file and the prepare output fully before authoring.

3. **Author the report.** Pick the shape the *answer* needs and open lavish's own playbook + design for
   it (`npx -y lavish-axi playbook <id>` — e.g. `table` for tabular findings, `comparison`, `plan` — and
   `npx -y lavish-axi design`). Write the answer as a clean, lavish-styled HTML document to
   **`.lavish/<topic>.html`**, wrap each cited phrase in a `data-cite="N"` element, and append **one**
   `<<<CITATION_DATA>>>` block — a single JSON object **grouped by `attachmentId`** (from step 2), each
   entry using `n, r, f, k, p, l` in CoT order:
   ```
   <<<CITATION_DATA>>>
   { "<attachmentId>": [ {"n":1,"r":"why","f":"verbatim source sentence","k":"key phrase","p":"page_number_1_index_0","l":[14]} ] }
   <<<END_CITATION_DATA>>>
   ```
   A flat list of objects with no `attachmentId` wrapper fails with *"No valid CITATION_DATA block
   found"*. **Per-citation self-check (in CoT order, before writing each marker):** find the verbatim
   source sentence first and put it in `f`, then derive `k` as a word-for-word substring of `f`; if
   your key phrase isn't in `f`, fix `f` first — don't wait for `verify` to flag a bad anchor.
   **Answer the hard part as fully as the easy part:** when the question has multiple sub-claims, cite
   the difficult one as thoroughly as the obvious one — a deep answer to the easy half is a failure.
   The answer is the deliverable; citations are inline and scannable. **DeepCitation's popover
   is the evidence surface — do NOT build a separate evidence table, status grid, or discrepancy list;
   that re-presents what the live citation already shows.** For 100+ pages across 3+ files, split per
   [rules/parallel-generation.md](rules/parallel-generation.md) (subagents emit per-section bodies +
   `<<<CITATION_DATA>>>`; the main loop assembles one report).

4. **Embed live citations.** Run `verify --html` once — it verifies against the source, replaces each
   `data-cite` with a hashed `data-citation-key`, and injects DeepCitation's runtime (badge, evidence
   keyhole, page view) **into your report, styling preserved**. It writes the embedded report to
   **`{stem}-verified.html`** — i.e. `.lavish/<topic>-verified.html` — **regardless of `--out`**, so do
   not rely on `--out`. Pass **`--local-only`** to keep the report on this machine (without it the CLI
   uploads to "My Verifications").
   ```bash
   npx -y deepcitation@latest verify --html .lavish/<topic>.html \
     --title "Descriptive Report Title" --claim "the question or claim verified" --local-only
   # → writes .lavish/<topic>-verified.html
   ```
   Run verify ONCE; the API handles partial matches and flags unmatched anchors (and any `sourceMatch`
   not found in its `sourceContext`) in its summary.

5. **Make citations lavish-safe, then open.** `verify --html` does **not** mark its citations as
   lavish-excluded, and you cannot pre-mark them (the keys are hashed at verify time). So **after** the
   embed, sweep every `[data-citation-key]` and add `data-lavish-action` — lavish skips those on hover,
   select, **and** click, so a citation click opens DeepCitation's popover while prose stays commentable
   (contract + the verified handler logic in [rules/lavish-loop.md](rules/lavish-loop.md)):
   ```bash
   perl -0pi -e 's/(<[a-zA-Z][\w-]*)(?=[^>]*\sdata-citation-key=)/$1 data-lavish-action/g' .lavish/<topic>-verified.html
   ```
   Then open the **verified** file with the layout gate and fix every `layout_warning` before involving
   the user:
   ```bash
   npx -y lavish-axi .lavish/<topic>-verified.html
   ```

6. **Poll loop.** `npx -y lavish-axi poll .lavish/<topic>-verified.html` — long-running; run it as a
   background task and re-run if killed (queued feedback is never lost). The user reads, clicks citations
   to inspect the source, and comments/questions specifics. Parse each returned prompt: element click vs.
   `target.type === "text-range"` (whose `target.text` is the exact flagged bytes).

7. **Revise on feedback.** The user's comment is the signal — there is no judge panel. Apply it by
   editing the **authored** `.lavish/<topic>.html` (fix a claim, re-anchor a citation, or `prepare` a
   better source), then **re-run step 4 then step 5** — verify regenerates `.lavish/<topic>-verified.html`
   in place, so the lavish session (keyed on that path) hot-reloads — and reply:
   ```bash
   npx -y lavish-axi poll .lavish/<topic>-verified.html --agent-reply "<one line on what changed>"
   ```

8. **End.** When the user ends the session: `npx -y lavish-axi end <file>` then `npx -y lavish-axi stop`.

## Invariants

- **DeepCitation owns verification and the citation UX.** `prepare` reads; `verify --html` decides status
  and renders the interactive citation. Never hand-build a citation popover, badge, or evidence view.
- **No confidence — ever.** Status is **binary** — `verified` (the `sourceContext` was located) or
  `unverified` (it was not) — from the match, never a score. No `variance`/`pending` in the CLI embed;
  the internal `ambiguity.confidence` is a localization signal and is never surfaced.
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
