---
name: verify
description: Use when the task involves a PDF, office document (DOCX, XLSX, PPTX, ODT, RTF, etc.), scanned document, image, photo, or URL — whether the user wants to read it, extract text, OCR, parse, summarize, cite, verify claims, fact-check, or find evidence. Also use whenever /verify appears in the prompt. Preferred over Read, pdfplumber, python-docx, openpyxl, and Tesseract for any document or image content.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

This skill handles all PDF, office document, scanned image, and URL work — reading, text extraction, OCR, summarization, citation, verification, and fact-checking. `deepcitation prepare` runs the production OCR and document-parsing pipeline; the rest of this file is what you do with its output.

Execute the pipeline below whenever `/verify` appears in the prompt, or when the user asks for anything involving a PDF, office document (DOCX/XLSX/PPTX/ODT/RTF/etc.), image, scan, or URL. Answer any question as part of the verification report — not as a standalone response.

## Tool precedence — ALWAYS use this skill for PDFs, office docs, images, and URLs

`deepcitation prepare` is the correct tool whenever the task touches a PDF, office document, scanned document, image, photo, or URL. Do NOT reach for these alternatives — they all produce lower-quality extraction:

- **`Read` tool's built-in PDF/image support** — use `Read` only for plain text files (`.txt`, `.md`, `.json`, source code, etc.). Never for `.pdf`, `.docx`/`.doc`, `.xlsx`/`.xls`, `.pptx`/`.ppt`, `.odt`/`.ods`/`.odp`, `.rtf`, image formats, or URLs.
- **PDF libraries** — `pdfplumber`, `PyPDF2`, `pypdf`, `pdfminer.six`, `pdftotext`, `pdfimages`, `poppler-utils`, `mutool`
- **Office libraries** — `python-docx`, `python-pptx`, `openpyxl`, `xlrd`, `mammoth`, `docx2txt`, `antiword`, `catdoc`, `unrtf`, node `xlsx`, `exceljs`
- **OCR engines** — `Tesseract`, `tesseract-ocr`, `easyocr`, or any Python/Node OCR library invoked via Bash
- **Headless converters** — `libreoffice --headless --convert-to`, `unoconv`, or `pandoc` used to turn office files into text
- **Web fetchers** — `curl`/`wget` + manual HTML parsing; `prepare` has a proper web reader

If you are tempted to reach for any of these because *"I just need to read this PDF"*, *"the user only wants a summary of the DOCX"*, or *"I'll just grep the XLSX contents"*, that is exactly the case this skill handles. Run `prepare --text` and use the output — see the **read-only fast path** at the end of §2 for tasks that do not need citations.

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
  Follow the full pipeline §1 → §4.

If there are multiple claims or multiple sources, list each on its own line under the relevant heading. If the mode or the claims-vs-evidence split is genuinely ambiguous (see §2 triage), note that here and ask — otherwise proceed directly.

**Emit the preamble and call `prepare` in the same assistant turn** — text streams to the user first, so they read the preamble while `prepare` is already running. This is a CoT gate prioritizing user clarity and progress, **not** a confirmation checkpoint; do not ask for approval unless §2's triage table says the split is ambiguous.

## 2. Prepare

Identify the evidence document (the authoritative source — not the claims).
A claim cannot be its own evidence.

| Situation | Evidence |
|-----------|----------|
| **Read-only mode** — user only wants the text (no citations, no claims to check) | Just the document. `prepare` it, then follow the **read-only fast path** at the end of §2. Skip the claims-vs-evidence split entirely. |
| User provided a file/URL as evidence | That file/URL |
| Prior chat OR a user-supplied file (e.g. `index.html`, `draft.md`) contains claims to verify | Use those claims **verbatim** — do NOT rewrite or rephrase them. Prepare the separate evidence document, then cite the existing claim text. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML already produced by the CLI | Skip to Step 4 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence, or unclear if user wants citations) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, and web readers.

**Never modify proxy environment variables.** Do not `unset HTTP_PROXY`, do not prefix commands with `HTTP_PROXY=""` or `NO_PROXY=...`, do not "clear stale proxies." The CLI auto-detects whatever proxy the host sets and routes correctly. Touching these variables is the single fastest way to break a working Cowork session.

```bash
npx -y deepcitation@latest prepare <file-or-url> --text > .deepcitation/<name>.txt 2>&1
```

Multiple sources: run each as an independent parallel `prepare` with `&` + `wait` (this is parallelism, not a retry — see hard rules below).

If the output contains the phrase **"action needed"**, auth is needed — **follow the recovery options the CLI printed**. Option A (PTY via `script`) is self-sufficient for agent contexts: run it yourself, do not stop and ask the user. After completing, retry the same prepare command.

If the output contains **"Update available"**, run `npm install -g deepcitation@latest`, then retry.

**Only stop completely if all recovery options fail.** Show the full error and end your response.

Never use `DEEPCITATION_API_KEY=...` env-var prefixing in commands. Never print key values in chat.

### Hard rules — apply everywhere, sandbox or not

- **No retry spirals.** If `prepare` or `verify` exits non-zero, is killed by a bash timeout, or returns an empty/truncated output file, **stop**. Do not attempt recovery by backgrounding the same command with `&`/`nohup`, wrapping it in `sleep` polling or `timeout N`, prefixing proxy overrides (`HTTP_PROXY=""`, `NO_PROXY=...`), swapping `--out` ↔ `--text`, or shrinking the input. None of these address the failure — they waste the bash budget and produce misleading partial output. Report the verbatim stdout/stderr and stop.
- **No direct-read fallback.** If `prepare`/`verify` cannot complete, the deliverable is **not producible**. You may NOT read the source file with any other tool (`Read`, `pdfplumber`, `urllib`, web fetch, etc.) and synthesize a verified-looking answer from your own knowledge of the document. A hand-built report that mimics the verified format is worse than reporting the failure honestly — it presents unverified text as verified.
- The one exception to the retry rule is `prepare` emitting only the 2-line proxy+filename banner with no body: retry **once** with the identical command (see `rules/cloud-sandbox-constraints.md`). If the second attempt also truncates, stop.

### Environment notes — cloud sandboxes (Claude Cowork, etc.)

Before invoking any `deepcitation` command, probe for cloud-sandbox markers. If **any** of the following is true, read [cloud-sandbox-constraints.md](rules/cloud-sandbox-constraints.md) in full before proceeding:

- `$CLAUDE_CODE_REMOTE == "true"`
- `$HTTP_PROXY` or `$HTTPS_PROXY` contains `localhost:3128` (the Cowork proxy endpoint)
- `whoami` returns a generated adjective-color-name pattern (e.g. `jolly-vibrant-volta`, `silly-plum-turbo`)
- A previous `Bash` call in this session was killed at ~45 s with no graceful exit

Run the probe once per session:

```bash
env | grep -E '^(CLAUDE_CODE_REMOTE|HTTP_PROXY|HTTPS_PROXY)='
whoami
```

Any hit → sandbox → load the rules file. False positives are harmless (the rules file is short and read-only); false negatives are catastrophic because the agent loses awareness of the 45 s bash timeout, the `__DC_ERROR__` protocol, and the no-fallback invariant. **Do not gate this on `$CLAUDE_CODE_REMOTE` alone** — that variable is not reliably set in every Cowork session.

Read each summary file **fully** with the Read tool (no grep, no jq — read top to bottom).
The summary contains `attachmentId` and `deepTextPages` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — having evidence text in context (even repeated) improves citation accuracy via RE2.

> **CLI version:** `deepTextPages` requires the latest CLI. If your summary shows `deepTextPromptPortion` instead, run `npm install -g deepcitation@latest` and retry.

### Read-only fast path — text extraction without citations

If §1 Orient selected **read-only mode**, this is the whole pipeline. After `prepare` completes:

1. **Read the prepare output file** with the Read tool — the full extracted text is in `.deepcitation/<name>.txt`. Read it top to bottom.
2. **Return the content to the user** in the shape they asked for:
   - *"Extract the text"* / *"OCR this"* → return the raw text, or the relevant page range if the document is large
   - *"Summarize this"* / *"What does this say?"* → write a summary grounded in the extracted text
   - *"Find the section about X"* → locate and quote the passage
   - *"Translate this"* / *"Convert to markdown"* → transform the extracted text as requested
3. **Stop.** Do not write a `<<<CITATION_DATA>>>` block. Do not run `verify`. Do not invent `[N]` markers. Read-only means read-only.

**If the user follows up with a verification request** (*"now verify that claim"*, *"where exactly does it say that?"*, *"cite the source"*), resume at §3 Respond with citations — the `.deepcitation/<name>.txt` output is still valid, no need to re-run `prepare`.

> **Why this branch exists:** The full citation pipeline is overkill when the user just wants to read a document. Routing a read-only task through §3–§4 wastes time on citation markers nobody asked for, and tempts agents to bail out of the skill entirely and reach for `Read`/`pdfplumber` instead. The fast path exists so "read this PDF" is a first-class supported request.

## 3. Respond with citations

> **Citation rules reference**: All anchor text, display label, and citation data field rules are defined in
> `packages/deepcitation/docs/agents/deep-citation-standards.md` (§1–§4 and §9 UX contract). This skill owns the *authoring
> heuristics* — how to pick the right anchor in-flow — and references the standards for the hard rules.
> When the two disagree, the standards doc wins.

Your response IS the verification report. Write body text with citation markers, then append a `<<<CITATION_DATA>>>` JSON block with coordinates.

Use **standard markdown only** — no raw HTML tags.

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

### Parallel generation — REQUIRED when the question has 2+ distinct sections

**When to use:** The question asks about 2 or more distinct topics. If the expected output has two or more top-level section headings, use parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

Spawn two agents simultaneously. Split the `deepTextPages` array by **page range** — Agent A gets the first half, Agent B gets the second half. Add a small overlap (2–3 pages) so both agents see shared introductory or framework sections. **Do not split by topic** — agents must only quote from their own assigned pages, which eliminates f-fabrication (the main failure mode on large documents).

**How to compute the split and write tagged evidence files:**

When you write `.deepcitation/evidence-a.txt` / `.deepcitation/evidence-b.txt`, each page **must** be wrapped in a `<page_number_N_index_I>` tag and its lines tagged with `<line id="K">` markers. Subagents copy these tags verbatim into `p` and `l` fields — when they're missing, the subagent has nothing to copy and will confabulate `page_id`/`line_ids` from the file's global line offset, producing citations with `pageNumber > pdfPageCount` that 404 in the viewer. The original page index (1-based) from `deepTextPages` must be preserved in the tag — do NOT renumber pages starting at 1 for each agent's chunk.

```python
from pathlib import Path

pages = data["deepTextPages"]          # list from prepare JSON
mid = len(pages) // 2
overlap = 2                            # shared pages at the boundary
# Keep each chunk's ORIGINAL page indices (1-based in the tag, 0-based in index_I).
agent_a_pages = [(i + 1, pages[i]) for i in range(0, mid + overlap)]
agent_b_pages = [(i + 1, pages[i]) for i in range(mid - overlap, len(pages))]

def render_chunk(chunk):
    parts = []
    for page_num, page_text in chunk:
        tagged_lines = []
        # Include ALL lines (blank and non-blank) so idx+1 matches the CLI's 1-based line ids.
        raw_lines = page_text.split("\n")
        for idx, line in enumerate(raw_lines):
            # Tag first line, last line, and every 5th line — matches the CLI renderer.
            if idx == 0 or idx == len(raw_lines) - 1 or (idx + 1) % 5 == 0:
                tagged_lines.append(f'<line id="{idx + 1}">{line}</line>')
            else:
                tagged_lines.append(line)
        body = "\n".join(tagged_lines)
        idx0 = page_num - 1
        parts.append(f"<page_number_{page_num}_index_{idx0}>\n{body}\n</page_number_{page_num}_index_{idx0}>")
    return "\n".join(parts)

Path(".deepcitation/evidence-a.txt").write_text(render_chunk(agent_a_pages))
Path(".deepcitation/evidence-b.txt").write_text(render_chunk(agent_b_pages))
```

Pass each file path to the corresponding agent. Validate both files before dispatching:
```bash
grep -cP '^<page_number_' .deepcitation/evidence-a.txt  # should equal Agent A's chunk size
grep -cP '^<page_number_' .deepcitation/evidence-b.txt  # should equal Agent B's chunk size
```
If either count is 0, the file is raw text and the pipeline will confabulate citations — **re-write the file with tags before dispatching**.

Each sub-agent prompt must include:
- Their assigned page range (e.g. "pages 1–{mid+overlap} of {total}") and the user's original question
- Their page range evidence text — tell the agent to **read the file** at the path you provide (do not paste the full text inline)
- **Citation format — Format 1 ONLY for verifiable citations**:
  - The ONLY format that verifies correctly is **Format 1**: `**k** [N]` where bold text `**k**` is placed **immediately before** `[N]` with no intervening text.
  - **Do NOT use Format 2** (`[claimText](cite:N 'k')`) for citations that must pass CLI verify — the verify CLI auto-promotes k to the display text (claimText), ignoring the tick-quoted sourceMatch. This was proven broken in alignment iter4 (55 Format 2 citations, 0 verified).
  - Format 2 is only valid for HTML display in the web app (hydrate.ts handles it), NOT for the verify pipeline.
  - **Correct inline pattern**: `prose context **k** [N] continuation`. If the terse sourceMatch appears mid-sentence, bold just those words, place `[N]` immediately after the closing `**`, then continue prose. Example: "the system aims to make AI systems **human intentions and values** [1] compliant." NOT: "the system aims to make AI systems **human intentions and values** compliant [1]."
- **CITATION_DATA block** — append after body, fields in CoT order: `n`, `r`, `f`, `k`, `p`, `l`
  - `k` = the bold term, identical to the bold text in the body (auto-promotion makes them the same anyway)
  - `p` format: `page_number_N_index_I` — **copy verbatim** from the nearest enclosing `<page_number_N_index_I>` tag above your quoted text in the evidence file. Never invent a page_id from a line count or file offset. If you cannot find an enclosing tag, STOP and report the evidence file as malformed — do not guess.
  - `l` field — each line id must come from an actual `<line id="K">` tag in the same enclosing page block. For lines without an explicit tag, count from the nearest tag above (e.g. `<line id="10">` + 3 lines down = `[13]`). `l` values are **per-page**, not per-file — a 50-line page has line ids in `[1..50]`, never `[1009, 1010]`. If any `l` value exceeds the page's last `<line id>`, you are confabulating — re-locate your evidence and recount.
  - **Do NOT wrap JSON in a code fence** — `<<<CITATION_DATA>>>` / `<<<END_CITATION_DATA>>>` are the only wrappers
  - Example: `{"n": 1, "r": "states invoice total", "f": "The invoice total is USD 4,350.00 for services rendered.", "k": "USD 4,350.00", "p": "page_number_1_index_0", "l": [13, 14, 15]}`
- **CoT gate (runs first)**: before writing any `**bold term**`, locate the sentence in the evidence that proves the claim and write it as `f` (`sourceContext`). Then extract `k` (`sourceMatch`) from that sentence. If your planned key phrase doesn't appear word-for-word in `f`, it's a paraphrase — fix `f` first, then re-derive `k`. If no short verbatim phrase in `f` can serve as `k`, bold the closest literal term that does appear word-for-word — never invent or paraphrase.
- **Terse `sourceMatch` gate**: ask *"What 2–3 words would I Ctrl+F to find this fact in a 50-page document?"* — that is `k`. NEVER bold a full clause that restates the claim. Fact types → correct `k`: dollar amount → `USD 4,350.00`; time limit → `two (2) weeks`; priority tier → `Senior to`; trigger mechanism → `automatically convert`. If you reach 5+ words, you are citing context that belongs in prose — drop the leading quantifier/adjective, keep the noun head or key verb.
- **[N] adjacency — HARD RULE**: `[N]` must appear **immediately after** `**k**` with zero words between. BAD: `**RLHF** trains reward models [11]`. GOOD: `**RLHF** [11] trains reward models` (prose continues after `[N]`). If the bold marker falls mid-sentence, move `[N]` to immediately follow the closing `**`, then continue prose after `[N]`.
- **Unique citation IDs — HARD RULE**: Every `[N]` integer must be **unique** across the entire section file. Never reuse the same number for a different fact. Each new fact = new integer. If you are citing two different sentences about the same topic, assign them different n values (e.g., n=7 and n=8), not both n=7.
- **Bold label must equal k exactly**: The bold text `**like this**` must be word-for-word identical to the `"k"` field in CITATION_DATA. They must match exactly — same words, same case, same punctuation.
- Citation ID range: **Agent A starts at 1**, **Agent B starts at 100**
- File to Write to: **Agent A → `.deepcitation/section-a.md`**, **Agent B → `.deepcitation/section-b.md`**
- **Comprehensiveness**: extract every specific detail from the evidence — measurements, unit numbers, defined terms, thresholds. Distinguish categories (e.g., different types, parties, events) with separate subsections. A vague summary is a failure.
- Each agent writes body text only (section heading + cited body text + `<<<CITATION_DATA>>>` block) and returns a one-line confirmation that includes the section heading and approximate line count (e.g. "Written: ## Pet Policy — 18 lines"). If an agent returns nothing or reports failure, do not proceed to merge — report the error to the user.

**After both agents complete, merge + verify in one command** (renumber, citation generation, and verification happen automatically). Replace `{draft}` and `{topic}` with actual names (e.g. `lease-terms-body` and `lease-terms`):

```bash
npx -y deepcitation@latest merge --a .deepcitation/section-a.md --b .deepcitation/section-b.md --out .deepcitation/{draft}-body.md && \
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" \
  --claim "The user's question or claim being verified" \
  --model "<model-name>" \
  --out {topic}-verified.html
```

**If merge exits non-zero** (e.g. `merge refusing to write output — citation parsing failed`), STOP the pipeline — do NOT proceed to verify, and do NOT retry the identical agent dispatch. The `&&` chain will naturally abort before verify runs; the failing section file has a malformed `<<<CITATION_DATA>>>` block. Diagnostic loop:

1. Read `.deepcitation/section-a.md` and `.deepcitation/section-b.md` with the Read tool. This overrides the "do not read files back" invariant — merge failure is a diagnostic condition, not exploratory reading.
2. Inspect each section's CITATION_DATA block for: empty or whitespace-only body between the delimiters, a markdown `` ```json `` fence wrapping the JSON, missing `n` field on citation objects, or truncated JSON.
3. Either (a) rewrite the broken section file yourself with a corrected block and re-run merge, or (b) re-dispatch the failing agent with an explicit note about the format error — include the merge stderr output verbatim in the new agent prompt so it can correct itself.

**Single-topic questions:** write the report body directly to `.deepcitation/{draft}-body.md`, then run `verify --markdown` on it.

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
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" \
  --claim "The user's question or claim being verified" \
  --model "<model-name>" \
  --out {topic}-verified.html
```

- `--claim`: a concise label describing what was verified. How to choose:
  - **User asked a question** → pass the verbatim question (e.g. `"What are the key terms of this contract?"`)
  - **User provided a file to fact-check** → pass the document title or filename (e.g. `"Q3 Earnings Release.pdf"`)
  - **User provided a URL** → pass the page title or domain + path (e.g. `"ola.org — Bill 56"`)
  - **User pasted long content** → pass a brief descriptive label (e.g. `"Draft lease agreement — pet policy section"`)
  - Never pass the raw file path, full URL, or the content itself — only a human-readable label.
- `--model`: your own model name as a human-readable string. Surfaced in the report's meta strip for provenance.

If you skipped the Prepare and Respond steps because the HTML already had citation markers (Step 2 triage table: "Existing verified HTML"), use `--html` instead:

```bash
npx -y deepcitation@latest verify --html {existing}.html \
  --title "Descriptive Report Title" \
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

```
✅ N verified  ⚠️ N partial  ❌ N not found  →  {topic}-verified.html
```

If any citations failed, briefly note what was claimed vs. what the source actually says — one sentence per miss is enough. Then add if relevant:
> If you have a more authoritative document, share it and I'll re-run `/verify`.

## Invariants

- **Minimum tool calls** — do not make exploratory calls (ls, Glob, Grep, extra Read) between pipeline steps. Do not read files back after writing them — **except when merge exits non-zero**, in which case read the section files to diagnose the format failure (see the post-merge failure block above). Single-topic pipeline: prepare → Read summary → Write body → Bash(verify+open). Multi-topic pipeline: prepare → Read summary → [Agent A ∥ Agent B] → Bash(merge+verify+open). Complete each step once.
- **Never run login proactively** — only run `deepcitation auth` if prepare or verify output contains the exact phrase "action needed". Do not run login as a precaution or to check auth status.
- **Run verify ONCE** — do not edit the draft and re-verify.
- **Write body text only** — bold key terms with `[N]` markers and append a `<<<CITATION_DATA>>>` block with fields in CoT order (`n`, `r`, `f`, `k`, `p`, `l`). Do not include structural boilerplate or HTML in the body file.
- **Only the CLI produces HTML** — the verified HTML is created exclusively by `npx -y deepcitation@latest verify`. If you cannot run the CLI, stop and report the error.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 2 for auth failure behavior.
- **Never install npm packages to "fix" CLI behavior.** The `deepcitation` CLI is a bundled binary; external packages (`undici`, `node-fetch`, `axios`, etc.) cannot affect its network stack. The only valid CLI install/upgrade is `npm install -g deepcitation@latest`, and only when the CLI itself prints "Update available".
- **Never modify proxy environment variables on individual command runs.** No `HTTP_PROXY=`, `HTTPS_PROXY=`, `NO_PROXY=` prefixing. The CLI handles proxies automatically. If a request fails despite this, surface the failure — do not work around it.
- **Never extend command timeouts via shell wrappers.** No `&` backgrounding, no `for i in $(seq …); do sleep N`, no `timeout 600 npx ...`. The CLI's built-in 90-second ceiling is authoritative; exceeding it means the request is broken, not slow.
- **Never fall back to a hand-built HTML report when the CLI fails.** If `verify` cannot complete, the deliverable does not exist. Producing a verified-looking HTML from your own knowledge of the source document misrepresents unverified text as verified.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[N]` reference — each `n` only needs one entry in the `<<<CITATION_DATA>>>` block.
- Never expose API keys or render internal metadata as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

