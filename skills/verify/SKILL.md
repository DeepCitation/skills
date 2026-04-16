---
name: verify
description: Use when the task involves a PDF, office document (DOCX, XLSX, PPTX, ODT, RTF, etc.), scanned document, image, photo, or URL — whether the user wants to read it, extract text, OCR, parse, summarize, cite, verify claims, fact-check, or find evidence. Also use whenever /verify appears in the prompt.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

This skill handles all PDF, office document, scanned image, and URL work — reading, text extraction, OCR, summarization, citation, verification, and fact-checking. `deepcitation prepare` runs the production OCR and document-parsing pipeline; the rest of this file is what you do with its output.

Execute the pipeline below whenever `/verify` appears in the prompt, or when the user asks for anything involving a PDF, office document (DOCX/XLSX/PPTX/ODT/RTF/etc.), image, scan, or URL. Answer any question as part of the verification report — not as a standalone response.

## Tool precedence — ALWAYS use this skill for PDFs, office docs, images, and URLs

`deepcitation prepare` is the correct tool whenever the task touches a PDF, office document, scanned document, image, photo, or URL. 

If you are tempted to reach for a generic read tool *"I just need to read this PDF"*, *"the user only wants a summary of the DOCX"*, or *"I'll just grep the XLSX contents"*, that is exactly the case this skill handles. Run `prepare --text` and use the output — see the **read-only fast path** at the end of §2 for tasks that do not need citations.

## 1. Orient — decide the mode, state the claim

First, pick the mode:

- **Read-only mode** — user wants the text from a document and has not asked for verification, citations, or fact-checking. Typical triggers: *"what does this PDF/DOCX say?"*, *"extract the text"*, *"OCR this image"*, *"read this document"*, *"summarize this report"*, *"get the numbers from this spreadsheet"*, *"parse this PPTX deck"*. Preamble:
  ```
  Task:     Extracting text from [file/URL]
  ```
  Follow §2 Prepare, then the **read-only fast path** at the end of §2. Skip §3–§4 entirely.

- **Verify mode** — user wants claims verified, facts checked, or evidence cited, OR has typed `/verify`. Preamble:
  ```
  Claim:    [what is being verified — quoted or briefly summarized]
  Evidence: [authoritative source — file name, URL, or "searching for primary sources"]
  ```
  Follow the full pipeline §1 → §4. If the claim source is a static HTML file to embed citations into (rather than a fresh report), note "Output: embedding citations into [filename]" — the original HTML structure is preserved.

If there are multiple claims or multiple sources, list each on its own line under the relevant heading. If the mode or the claims-vs-evidence split is genuinely ambiguous (see §2 triage), note that here and ask — otherwise proceed directly.

**Emit the preamble and call `prepare` in the same assistant turn** — text streams to the user first, so they read the preamble while `prepare` is already running. This is a CoT gate prioritizing user clarity and progress, **not** a confirmation checkpoint; do not ask for approval unless §2's triage table says the split is ambiguous.

## 2. Prepare

Identify the evidence document (the authoritative source — not the claims).
A claim cannot be its own evidence.

| Situation | Evidence |
|-----------|----------|
| **Read-only mode** — user only wants the text (no citations, no claims to check) | Just the document. `prepare` it, then follow the **read-only fast path** at the end of §2. Skip the claims-vs-evidence split entirely. |
| User provided a file/URL as evidence | That file/URL |
| Prior chat OR a user-supplied file (e.g. `index.html`, `draft.md`, a report, or any document containing claims to check) contains claims to verify | Use those claims **verbatim** — do NOT rewrite or rephrase them. Prepare the separate evidence document, then cite the existing claim text. |
| User provided a static HTML file to **embed citations into** (original HTML structure must be preserved) | Treat the HTML as the claims document. Use the **HTML annotation path** in §3 instead of writing a new body.md. Prepare the separate evidence document, then annotate the HTML file directly. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML already produced by the CLI in a **prior run** (already has `data-citation-key` attributes) | Skip to Step 4 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence, or unclear if user wants citations) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, office file readers, and web readers.

```bash
npx -y deepcitation@latest prepare <file-or-url> > .deepcitation/<name>.txt 2>&1
```

Multiple sources: run each as an independent parallel `prepare` with `&` + `wait` (this is parallelism, not a retry — see hard rules below).

If the output contains the phrase **"action needed"**, auth is needed — **follow the recovery options the CLI printed**. Option A (PTY via `script`) is self-sufficient for agent contexts: run it yourself, do not stop and ask the user. After completing, retry the same prepare command.

If the output contains **"Update available"**, run `npm install -g deepcitation@latest`, then retry.

**Only stop completely if all recovery options fail.** Show the full error and end your response.

Never use `DEEPCITATION_API_KEY=...` env-var prefixing in commands. Never print key values in chat.

### Hard rules — apply everywhere, sandbox or not

- **No retry spirals.** If `prepare` or `verify` exits non-zero, is killed by a bash timeout, or returns an empty/truncated output file, **stop**. Do not attempt recovery by backgrounding the same command with `&`/`nohup`, wrapping it in `sleep` polling or `timeout N`, prefixing proxy overrides (`HTTP_PROXY=""`, `NO_PROXY=...`), swapping `--out` ↔ `--text`, or shrinking the input. None of these address the failure — they waste the bash budget and produce misleading partial output. Report the verbatim stdout/stderr and stop.
- **No direct-read fallback.** If `prepare`/`verify` cannot complete, the deliverable is **not producible**. 

Read each original file and prepare output **fully** with the Read tool (no grep, no jq — read top to bottom).
The original file allows you to make better interpretations with visual layouts, charts, columns, tables, or technical content.
The prepare output contains `attachmentId` and `deepTextPages` (evidence text with `<page_number_N_index_I>` and `<line id="N">` metadata tags for deep citations).

### Read-only fast path — text extraction without citations

If §1 Orient selected **read-only mode**, this is the whole pipeline. After `prepare` completes:

1. **Read the prepare output file** with the Read tool — the full extracted text is in `.deepcitation/<name>.txt`. Read it top to bottom.
2. **Return the content to the user** in the shape they asked for:
   - *"Extract the text"* / *"OCR this"* → return the raw text, or the relevant page range if the document is large
   - *"Summarize this"* / *"What does this say?"* → write a summary grounded in the extracted text
   - *"Find the section about X"* → locate and quote the passage
   - *"Translate this"* / *"Convert to markdown"* → transform the extracted text as requested
3. **Stop.** Do not write a `<<<CITATION_DATA>>>` block. Do not run `verify`. Do not invent `[N]` markers. Read-only means read-only.

**If the user follows up with a verification request** (*"now verify that claim"*, *"where exactly does it say that?"*, *"cite the source"*), resume at §3 Respond with citations — if the **same document** was used and `.deepcitation/<name>.txt` **still exists on disk**, no need to re-run `prepare`. Otherwise re-run `prepare` first.

## 3. Respond with citations

> **Citation rules reference**: All anchor text, display label, and citation data field rules are defined in
> `packages/deepcitation/docs/agents/deep-citation-standards.md` (§1–§4 and §9 UX contract). This skill owns the *authoring
> heuristics* — how to pick the right anchor in-flow — and references the standards for the hard rules.
> When the two disagree, the standards doc wins.

Your response IS the verification report. Write body text with citation markers, then append a `<<<CITATION_DATA>>>` JSON block with coordinates.

Use **standard markdown only** — no raw HTML tags. *(Exception: if you are using the HTML annotation path for an embed-into task, write to `.deepcitation/{draft}-body.html` using `data-cite` attributes as described below.)*

### Citation formats — Format 1 vs Format 2

**Format 1** — bold the source phrase directly when `sourceMatch` reads naturally as prose.

Example: The invoice totals **USD 4,350.00** [1] for services rendered by **Acme Corp** [2] on **March 15, 2024** [3].

**Format 2** — use `[claimText](cite:N 'sourceMatch')` when the prose has its own voice or the source term doesn't fit the sentence.

Example: The company's [revenue grew](cite:1 '$4.2 million') over the prior year, with [dissolution protections](cite:2 'Dissolution Event') for minority holders.

**Hard rules** (canonical list in `packages/deepcitation/docs/agents/deep-citation-standards.md` §1):

1. `sourceMatch` (`k`) must be **≤4 words, ≤40 chars**, and a contiguous **substring of `sourceContext`** (`f`) — no paraphrase, no ellipsis
2. Format 1: the bold text equals `k`. Format 2: the bracket label is independent prose; `k` is the verbatim source term
3. `line_ids` (`l`) must include the `sourceMatch` line plus 1–2 adjacent lines, so `sourceContext` is longer than `sourceMatch`
4. Bold **only the fact-specific label** — the number, entity, tier marker, or trigger verb. NEVER bold a full clause that restates the claim.

**For truncation strategies, anti-patterns, and the common failure modes table, read [rules/citation-anchors.md](rules/citation-anchors.md) before writing citations.** It has worked examples for quantifier-drop, clause truncation, formulas/definitions, tax/regulatory extraction, heading-only anchor traps, index/appendix traps, and Format 2 decoupling cases. Consult it whenever:

- Your candidate `sourceMatch` is ≥5 words
- The source is a formula, definition, enumeration, or tax/regulatory value
- You're unsure whether a claim is Format 1 or Format 2
- The evidence has section headings that duplicate body text phrases
- The evidence has an A–Z index, appendix, or table of contents
- An anchor "feels wrong" and you want to check known failure patterns

### HTML annotation path — embedding citations into a source HTML file

When the §2 triage selects "embed citations into static HTML", annotate the source file
directly instead of writing a new body.md:

1. **Read the source HTML file** with the Read tool.

2. **Wrap each cited phrase** with a `data-cite` attribute on the enclosing element:
   ```html
   <span data-cite="N">display label</span>
   ```
   - Any element tag works — use whatever fits the surrounding markup
     (e.g. `<strong data-cite="1">Revenue</strong>` or `<td data-cite="2">$4.2M</td>`).
   - The inner text is the **display label** shown to readers — it does not have to equal
     `sourceMatch`. `sourceMatch` (`k`) lives only in `<<<CITATION_DATA>>>` and must still
     be a ≤4-word verbatim substring of `f`.
   - Format 2 cases: the element wraps your prose claimText; `k` in CITATION_DATA is
     the verbatim source term (same as the markdown path).

3. **Append the `<<<CITATION_DATA>>>` block** as raw text after `</html>`.
   `parseCitationData()` strips it before writing output — it never appears in the browser:
   ```html
   </html>

   <<<CITATION_DATA>>>
   {
     "ATTACHMENT_ID": [
       {"n": 1, "r": "...", "f": "...", "k": "...", "p": "page_number_1_index_0", "l": [10, 11]}
     ]
   }
   <<<END_CITATION_DATA>>>
   ```

4. **Save** as `.deepcitation/{draft}-body.html`.

5. **Run `verify --html`** in §4 (not `--markdown`). The output is your original HTML
   with `data-cite` attributes replaced by hashed `data-citation-key` attributes and the
   CDN popover runtime injected — structure and styling of the original file are preserved.

> All `<<<CITATION_DATA>>>` field rules (`n`, `r`, `f`, `k`, `p`, `l`), the SELF-CHECK,
> and the **STOP AND CHECK** before verify apply identically to this path.

### Per-citation SELF-CHECK

Run this in your head **before AND after** writing each citation:

0. **CoT gate** — locate the source sentence first. `sourceMatch` must be a word-for-word substring of the sentence you pick as `f`.
1. **Pick `sourceMatch`** — terse verbatim phrase from the source. 1–2 words ideal, 3–4 acceptable, 5+ is wrong.
2. **Decide the format** — Format 1 if it reads naturally as prose; Format 2 if your natural prose phrasing fails the substring check.
3. **Recount** — after writing, count `sourceMatch` words. 5+ → shorten before moving on.
4. **Ctrl+F test** — could a reader search this `sourceMatch` and find it uniquely in the source?

### Citation data block

After the body text, append a `<<<CITATION_DATA>>>` block. Fields must appear in **CoT order** — writing them in sequence forces the right reasoning: articulate why first (`r`), commit to the full quote (`f`), then extract the key term (`k`), then locate it (`p`, `l`).

| Shorthand | Full name | Rule |
|-----------|-----------|------|
| `n` | id | Integer matching the `[N]` marker in the body |
| `r` | reasoning | One phrase: *why* this fact supports the claim |
| `f` | source_context | Verbatim sentence(s) from the evidence — the full quote `k` is extracted from |
| `k` | source_match | 1–4 verbatim words from `f` — **must be a substring of `f`**, never a paraphrase. **Format 1:** `k` equals the bold claimText. **Format 2:** `k` equals the tick-quoted sourceMatch — NOT the prose claimText (they are independent). |
| `p` | page_id | `"page_number_N_index_I"` — copy from `<page_number_N_index_I>` tags in the summary |
| `l` | line_ids | `sourceMatch` line ± 1–2 adjacent lines (forming `sourceContext`), e.g. `[19, 20, 21]` |

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID": [
    {"n": 1, "r": "states invoice total", "f": "The invoice total is USD 4,350.00 for services rendered by Acme Corp on March 15, 2024.", "k": "USD 4,350.00", "p": "page_number_1_index_0", "l": [13, 14, 15]},
    {"n": 2, "r": "names the service provider", "f": "The invoice total is USD 4,350.00 for services rendered by Acme Corp on March 15, 2024.", "k": "Acme Corp", "p": "page_number_1_index_0", "l": [2, 3, 4]},
    {"n": 3, "r": "gives the service date", "f": "The invoice total is USD 4,350.00 for services rendered by Acme Corp on March 15, 2024.", "k": "March 15, 2024", "p": "page_number_1_index_0", "l": [4, 5, 6]}
  ]
}
<<<END_CITATION_DATA>>>
```

Use the `attachmentId` from the prepare output as the group key.

**Format 2 in CITATION_DATA — `k` is the sourceMatch, not the claimText.** When the body uses `[claimText](cite:N 'sourceMatch')`, the CITATION_DATA entry for that citation must set `k` to the tick-quoted sourceMatch, not the prose claimText:

```
Body:   The investment [converts automatically](cite:4 'automatically convert') on an equity financing.
Data:   {"n": 4, "r": "states the conversion trigger", "f": "this Safe will automatically convert into the number of shares of Safe Preferred Stock.", "k": "automatically convert", "p": "page_number_1_index_0", "l": [20, 21]}
        ↑ k = tick-quoted sourceMatch ("automatically convert"), NOT prose claimText ("converts automatically")
```

A common error is setting `k` to the prose claimText — this always fails, because `k` must be a substring of `f` (Domain B), and the prose claimText is from Domain A.

**`f` → `k` substring rule (hard).** Write `f` first; then scan it visually for the 1–4 word key term and copy it exactly as `k`. If the phrase you want for `k` does not appear word-for-word inside `f`, your `f` is wrong — fix `f`, then re-derive `k`. This one rule eliminates paraphrase failures at the source.

**Common failure modes.** A trap → fix table covering the top 9 patterns (quantifier bloat, prose-vs-source voice mismatch, multi-value fields, ellipsis, threshold-vs-condition, Format 2 decoupling, `k` ≠ claimText in Format 2) lives in [rules/citation-anchors.md](rules/citation-anchors.md) under **Common failure modes**. Read it before writing citations if you've hit any of these before or your candidate `sourceMatch` feels long.

### Parallel generation — 100+ pages with 3+ files

When the evidence has **100 or more pages** AND the question spans **3 or more distinct files**, read [`rules/parallel-generation.md`](rules/parallel-generation.md) and follow that pipeline.

**Single-topic questions or documents under 100 pages:** write the report body directly to `.deepcitation/{draft}-body.md`, then run `verify --markdown` on it.

### Comprehensiveness — answer every part of the question

**Cover ALL parts of the question equally.** Multi-part questions (e.g., "What are X? What about Y?") require thorough answers for each part — not a deep answer for the easy part and a shallow answer for the harder part. Before writing, scan the full evidence for every section/schedule/appendix that addresses each sub-question.

**Extract specific details.** Vague summaries fail. If the evidence contains measurements, unit numbers, defined terms, thresholds, or formulas — include them with citations. A response that says "boundaries are defined" without stating the actual boundary definitions is incomplete.

**Use structured sections.** If the evidence distinguishes categories (e.g., different unit types, different event types, different parties), your response must mirror those distinctions with separate subsections or table rows — not collapse them into a single vague paragraph.

Structure with headings, tables, and lists matching the evidence. If evidence seems incomplete for the question, note what's covered and suggest the user share additional documents.

**What goes in each file:**
- **Body file** (`.deepcitation/section-a.md`, `section-b.md`, or `{draft}-body.md`): markdown prose with `**bold term** [N]` markers, then a `<<<CITATION_DATA>>>` block with fields in CoT order (`n`, `r`, `f`, `k`, `p`, `l`).
- **Your response to the user**: The full markdown report body — prose only.

> **STOP AND CHECK** — before running `verify`: (1) every bold term or `[claimText]` link has `[N]` / `cite:N`, (2) every `[N]` has a matching entry in `<<<CITATION_DATA>>>`, (3) **Format 1:** `k` equals the bold term exactly; **Format 2:** `k` equals the tick-quoted `sourceMatch` — not the prose claimText, (4) every `k` is a word-for-word substring of its `f`, (5) no `<<<CITATION_DATA>>>` block is wrapped in a code fence.

## 4. Verify

Pick a clean output name matching the topic — the report lives in CWD, not `.deepcitation/`:

```bash
npx -y deepcitation@latest verify --md .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" \
  --claim "The user's question or claim being verified" \
  --out {topic}-verified.html
```

- `--claim`: a concise label describing what was verified. How to choose:
  - **User asked a question** → pass the verbatim question (e.g. `"What are the key terms of this contract?"`)
  - **User provided a file to fact-check** → pass the document title or filename (e.g. `"Q3 Earnings Release.pdf"`)
  - **User provided a URL** → pass the page title or domain + path (e.g. `"ola.org — Bill 56"`)
  - **User pasted long content** → pass a brief descriptive label (e.g. `"Draft lease agreement — pet policy section"`)
  - Never pass the raw file path, full URL, or the content itself — only a human-readable label.

Use `--html` when: (a) you annotated a source HTML file using the HTML annotation path in §3 (embed-into case — use `.deepcitation/{draft}-body.html`), or (b) the HTML was already produced by the CLI in a prior run (Step 2 triage: "Existing verified HTML already produced by the CLI"):

```bash
npx -y deepcitation@latest verify --html .deepcitation/{draft}-body.html \
  --title "Descriptive Report Title" \
  --claim "The user's question or claim being verified" \
  --out {topic}-verified.html
```

Run verify ONCE — do not edit the draft and re-verify. The API handles partial matches gracefully. If an anchor cannot be located in the evidence, the CLI flags it in output as unmatched — check the summary for typos or shorten the `k` value to a more distinctive term.

Do not use `verify --citations` directly — it is low-level and skips format normalization.

Options: `--style plain|report` (default: `report`), `--audience general|executive|technical|legal|medical` (default: `general`), `--theme auto|light|dark` (default: `auto`).

If the output contains "action needed", follow the recovery options the CLI printed (same as Step 2).

Open the output (WSL first — most users run in WSL on Windows; macOS/Linux fallbacks are silent):

```bash
explorer.exe "$(wslpath -w "{topic}-verified.html")" 2>/dev/null || \
xdg-open "{topic}-verified.html" 2>/dev/null || \
open "{topic}-verified.html" 2>/dev/null || \
echo "Open: $(pwd)/{topic}-verified.html"
```

Close with a results line that mirrors the claim/evidence framing from Step 1:

If any citations failed, briefly note what was claimed vs. what the source actually says — one sentence per miss is enough. Then add if relevant:
> If you have a more authoritative document, share it and I'll re-run `/verify`.

## Invariants

- **Minimum tool calls** — do not make exploratory calls (ls, Glob, Grep, extra Read) between pipeline steps. Do not read files back after writing them — **except when merge exits non-zero**, in which case read the section files to diagnose the format failure (see `rules/parallel-generation.md` merge failure section). Single-topic pipeline: prepare → Read summary → Write body → Bash(verify+open). Multi-topic pipeline (100+ pages): prepare → Read summary → [Agent A ∥ Agent B] → Bash(merge+verify+open). Complete each step once.
- **Never run login proactively** — only run `deepcitation auth` if prepare or verify output contains the exact phrase "action needed". Do not run login as a precaution or to check auth status.
- **Run verify ONCE** — do not edit the draft and re-verify.
- **Write body text only** — bold key terms with `[N]` markers and append a `<<<CITATION_DATA>>>` block with fields in CoT order (`n`, `r`, `f`, `k`, `p`, `l`). Do not include structural boilerplate or HTML in the body file.
- **Only the CLI produces HTML** — the verified HTML is created exclusively by `npx -y deepcitation@latest verify`. If you cannot run the CLI, stop and report the error.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 2 for auth failure behavior.
- **Never install npm packages to "fix" CLI behavior.** The `deepcitation` CLI is a bundled binary; external packages (`undici`, `node-fetch`, `axios`, etc.) cannot affect its network stack. The only valid CLI install/upgrade is `npm install -g deepcitation@latest`, and only when the CLI itself prints "Update available".
- **Never fall back to a hand-built HTML report when the CLI fails.** If `verify` cannot complete, the deliverable does not exist. Producing a verified-looking HTML from your own knowledge of the source document misrepresents unverified text as verified.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[N]` reference — each `n` only needs one entry in the `<<<CITATION_DATA>>>` block.
- Never expose API keys or render internal metadata as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact
