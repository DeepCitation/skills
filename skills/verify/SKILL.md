---
name: verify
description: Use when the user wants claims verified, facts checked, or evidence cited against a source document (PDF, DOCX, XLSX, PPTX, image, URL, etc.), OR when /verify appears in the prompt. Reads evidence with DeepCitation, anchors each citation to a page/line, and opens a confidence-badged annotated report the user reviews in the browser.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation-anchored, human-reviewable verification

This skill verifies claims against a source, then opens a **lavish annotated report** the user
reviews live: every citation carries a confidence badge, and the user clicks or selects any text
to flag it. Flagged or low-confidence citations escalate to an adversarial judge panel, the report
re-renders, and the loop runs until the user ends the session.

**DeepCitation is the verification backend.** `deepcitation prepare` is the only evidence reader;
the model then anchors each `sourceMatch` to a page/line against the tagged prepare text — that
self-derivation **is** the coordinate match (no second locating call). **lavish-axi renders the
report** and drives the review loop. We do not use DeepCitation to render the final HTML.

## When to run

Run when `/verify` is in the prompt, or when the user has BOTH (a) a claim/answer/document with
claims AND (b) a source to verify against. **If the user only wants to read, OCR, summarize, or
translate a document, do NOT run this skill** — call `deepcitation prepare` directly and answer
normally. /verify kicks in only when there is something to cite.

If `.deepcitation/<name>.json` already exists from an earlier `prepare`, skip step 2.

## Workflow

1. **Orient.** Emit the preamble (`Claim:` / `Evidence:` on their own lines), then call `prepare`
   in the same turn. Choose the run-time roster tier per [rules/runtime-roster.md](rules/runtime-roster.md).
   A claim cannot be its own evidence; if it is unclear which file is claims vs. evidence, ask.

2. **Prepare evidence.** `prepare` is the only reader — built-in PDF/OCR/office/web. It writes the
   prepared JSON payload to **stdout** and its status lines (`Using proxy:`, `Preparing file:`, …)
   to **stderr** — redirect stdout only. **Never `2>&1`**: it interleaves stderr log lines into
   the JSON (corrupting a later read/parse) and hides the live sandbox signals.
   ```bash
   mkdir -p .deepcitation .lavish
   npx -y deepcitation@latest prepare <file-or-url> > .deepcitation/<name>.json
   ```
   Multiple sources: one parallel `prepare` each (`&` + `wait`). The default JSON output carries
   `attachmentId` plus `deepTextPages` with `<page_number_N_index_I>` / `<line id="K">` tags. On
   **"action needed"** follow [rules/auth.md](rules/auth.md); on sandbox/network behavior see
   [rules/cloud-sandbox-constraints.md](rules/cloud-sandbox-constraints.md). Never
   `DEEPCITATION_API_KEY=` prefix; never print keys. Read the original file and prepare output
   fully (top to bottom) before authoring.

3. **Author + coordinate-match.** Write the cited narrative and, for each fact, the anchor record
   `{ n, r, f, k, p, l }` against the tagged prepare text — `f→k` substring + `p`/`l` page/line.
   **This model self-derivation is the coordinate match, and it is the single locating authority** —
   no `deepcitation verify` call re-locates the anchor. All `k`/`l`/`f` and Format 1/2 hard rules
   live unchanged in [rules/citation-anchors.md](rules/citation-anchors.md). For 100+ pages across
   3+ files, split the work per [rules/parallel-generation.md](rules/parallel-generation.md)
   (Format 1 only for anchors; subagents emit per-section bodies + `<<<CITATION_DATA>>>`, the main
   loop assembles them into the lavish artifact).

4. **Cheap audit → badges.** Before the first render, run the cheap auditor (fast tier) over the
   citations — **batched per attachment, not one call per citation** — to assign
   `verified | review | contradicted` plus a confidence. See the tiered trigger and rubric in
   [rules/runtime-roster.md](rules/runtime-roster.md). Never show a badge a citation did not earn;
   a citation with no located `p`/`l` anchor is never `verified` — it badges `unmatched`
   deterministically (no panel).

5. **Build the lavish report.** Pick the surface, open its playbook
   (`npx -y lavish-axi playbook <id>` + `npx -y lavish-axi design`) **before** writing HTML, and
   render to a stable path `.lavish/<topic>-verify.html`:
   - hero (default): [playbooks/annotated-report.md](playbooks/annotated-report.md)
   - secondary: [playbooks/evidence-table.md](playbooks/evidence-table.md)
   - secondary: [playbooks/discrepancy-report.md](playbooks/discrepancy-report.md)

   The report is the deliverable, so unclamp before writing — clamp placeholders must never reach
   the file. Strip the `<<<CITATION_DATA>>>` block before it ships.

6. **Open with the layout gate.** `npx -y lavish-axi .lavish/<topic>-verify.html`. Fix every
   `layout_warning` (overflow/clipped/overlap) **before** involving the user.

7. **Poll loop.** `npx -y lavish-axi poll .lavish/<topic>-verify.html` — long-running by design;
   run it as a background task and re-run if killed (queued feedback is never lost). Parse each
   returned prompt: element click vs. `target.type === "text-range"` (whose `target.text` is the
   exact flagged bytes). Full command contract in [rules/lavish-loop.md](rules/lavish-loop.md).

8. **Escalate on flag or semantic dispute.** Run the 3-vote adversarial judge panel + editor per
   [rules/runtime-roster.md](rules/runtime-roster.md) only for: any citation the user flagged, OR a
   `weak`/`contradicted` cheap-audit verdict. A merely `unmatched` anchor badges deterministically
   and does **not** auto-escalate (the panel cannot locate what the substring match could not); it
   re-anchors only when the user asks. High-confidence, unflagged citations do not re-run.

9. **Revise + re-render.** Apply the editor's verdicts, rewrite the **same** file path (the
   session is keyed by path), then `poll <file> --agent-reply "<one line on what changed>"`.

10. **End.** When the user ends the session: `npx -y lavish-axi end <file>` then
    `npx -y lavish-axi stop`.

## Invariants

- **DeepCitation is the only evidence reader.** No direct-read fallback (no pdfplumber/urllib). If
  `prepare` cannot complete, the deliverable is not producible — show the error and stop.
- **One locating authority.** The model's `f→k` / `p`/`l` derivation against the tagged prepare
  text is the coordinate match; do not run a separate `deepcitation verify` locate. The auditor and
  panel re-confirm `k` is a verbatim substring of the `<line>`-tagged source text — they do not
  re-locate it.
- **Every badge traces to an anchor.** Never mark a citation `verified` without a located `p`/`l`,
  and never show higher confidence than the audit/panel earned. `review` is the honest default for
  low confidence; the panel upgrades it — the user never sees false green.
- **Never fabricate citations** when auth or network fails. Show the error and stop.
- **lavish renders; we re-render every loop.** Keep the same `.lavish/<topic>-verify.html` path so
  the session, scroll, and annotations persist. Use only real verbs:
  `lavish-axi <file> | poll | end | stop | playbook | design`. `--timeout-ms` is test-only.
- **Format 1 for anything that must anchor** (Format 2 auto-promotes `k` and breaks verification).
- Auth is `deepcitation auth`; never `DEEPCITATION_API_KEY=` prefix; never print keys.
- Always "DeepCitation" (never "DeepCite"). Always deliver the annotated report.
