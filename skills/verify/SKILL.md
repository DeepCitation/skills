---
name: verify
description: ALWAYS execute the full DeepCitation verification workflow when /verify appears anywhere in the prompt — regardless of how the rest of the message is phrased. Triggered by /verify with a file, URL, question, or existing content. Has built-in PDF, OCR, and web readers — always use prepare to read evidence files.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Execute the pipeline below whenever `/verify` appears in the prompt.
Answer any question as part of the verification report — not as a standalone response.

## 1. Prepare

Identify the evidence document (the authoritative source — not the claims).
A claim cannot be its own evidence.

| Situation | Evidence |
|-----------|----------|
| User provided a file/URL as evidence | That file/URL |
| Prior chat already has claims to verify | Use existing claims as-is — do NOT rewrite them. Prepare evidence, then cite the existing text. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML already produced by the CLI | Skip to Step 3 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, and web readers.

```bash
mkdir -p .deepcitation && npx -y deepcitation@latest prepare <file-or-url> --text > .deepcitation/<name>.txt 2>&1
```

Multiple sources: run all in parallel with `&` + `wait`.

If the output contains "action needed", authenticate:

```bash
npx -y deepcitation@latest login --browser
```

This opens the browser for OAuth and waits for the callback (up to 120s).
If the user pastes a key instead, run `npx -y deepcitation@latest login --key '<the-key>'`.
After login succeeds, **retry the same prepare command**.

If the output contains "Update available", run `npm install -g deepcitation@latest`, then retry the command.

**If authentication fails after attempting login, STOP COMPLETELY.**
Show the error and end your response. Reports require verified evidence from `prepare`.

Never use `DEEPCITATION_API_KEY=...` env-var prefixing in commands. Never print key values in chat.

Read each summary file **fully** with the Read tool (no grep, no jq — read top to bottom).
The summary contains `attachmentId` and `deepTextPages` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — having evidence text in context (even repeated) improves citation accuracy via RE2.

> **CLI version:** `deepTextPages` requires the latest CLI. If your summary shows `deepTextPromptPortion` instead, run `npm install -g deepcitation@latest` and retry.

## 2. Respond with citations

Your response IS the verification report. Write body text with citation markers, then append a `<<<CITATION_DATA>>>` JSON block with coordinates.

Use **standard markdown only** — no raw HTML tags.

### Progressive disclosure

The reader experiences citations in three layers — each adds detail:

1. **Scan** — they skim the bolded terms to grasp the key facts. The bold text IS the verbatim source phrase — 1–4 exact words from the evidence.
2. **Highlight** — they click the bold term and see THOSE SAME WORDS highlighted in yellow in the evidence popover. The popover shows the full evidence paragraph (from `l` line IDs) with the anchor (`k`) highlighted in amber within it. If `k` = the entire paragraph, **no highlight is shown** — the anchor drowns in its own context.
3. **Explore** — the keyhole strip shows the anchor region in the original PDF image at readable size. Short anchors (1–4 words) stay crisp; very long anchors spread across the image and may lose readability.

**Hard rules** (all three must be satisfied — no trade-offs):
1. **Connection**: bold text and `k` must be identical (Format 1). The reader clicks the bold term and sees those exact words highlighted.
2. **Brevity**: bold text and `k` must be **≤4 words**. This is a HARD LIMIT, not a suggestion. When the evidence phrase is longer, truncate to the 2–3 most distinctive words — see examples below.
3. **Context**: `l` must include the anchor's line PLUS 1–2 adjacent lines, so the evidence paragraph is longer than the anchor. This makes the highlight visible within surrounding text.

### In-text markers

**Bold** 1–4 verbatim words from the evidence. The bold text must appear verbatim in the source — but you pick only the shortest distinctive substring (≤4 words), not the full phrase. Place `[N]` immediately after. One unique ID per distinct fact.

Example: The invoice totals **USD 4,350.00** [1] for services rendered by **Acme Corp** [2] on **March 15, 2024** [3].

**How to truncate long evidence phrases to ≤4 words:**
- "Junior to payment of outstanding indebtedness and creditor claims" → pick **Junior to payment** (3w) or **outstanding indebtedness** (2w) — the distinctive core
- "immediately following the earliest to occur of" → pick **earliest to occur** (3w)
- "without relieving the Company of any obligations arising from a prior breach" → pick **prior breach** (2w)
- "due and payable to the Investor immediately prior to the consummation" → pick **due and payable** (3w)
- "general assignment for the benefit of the Company's creditors" → pick **general assignment** (2w)

Pick the 2-3 words that a reader would recognize as the key term — the noun/concept, not the full clause.

### Citation data block

After the body text, append a `<<<CITATION_DATA>>>` block. **`k` must equal the bold text exactly** — they are the same 1–4 verbatim words from the evidence. NEVER more than 4 words in either bold or `k`.

Keys:

- **n**: Citation id (integer, matches `[N]` in text)
- **k**: Must equal the bold text in the body exactly — 1–4 verbatim words. NEVER more than 4.
  - BAD: bold = `"Junior to payment of outstanding indebtedness"` (6 words) — too long
  - GOOD: bold = `"outstanding indebtedness"` and k = `"outstanding indebtedness"` (identical, 2w, verbatim) ✓
  - BAD: bold = `"Equity Financing"` but k = `"when the company raises capital"` (bold ≠ k, different words)
  - GOOD: bold = `"Equity Financing"` and k = `"Equity Financing"` (identical) ✓
- **p**: Compact page id `"N_I"` (from `<page_number_N_index_I>` tag)
- **l**: Array of line IDs (from `<line id="N">` tags). **Include the anchor's line PLUS 1–2 adjacent lines** so the evidence paragraph has context around the highlight. If the anchor is on line 20, use `[19, 20, 21]` or at minimum `[19, 20]`. A single-line `l` risks the anchor filling the entire paragraph — which renders with **no visible highlight**.

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID": [
    {"n": 1, "k": "USD 4,350.00", "p": "1_0", "l": [13, 14, 15]},
    {"n": 2, "k": "Acme Corp", "p": "1_0", "l": [2, 3, 4]},
    {"n": 3, "k": "March 15, 2024", "p": "1_0", "l": [4, 5, 6]}
  ]
}
<<<END_CITATION_DATA>>>
```

Use the `attachmentId` from the prepare output as the group key.

### Parallel generation — REQUIRED when the question has 2+ distinct sections

**When to use:** The question asks about 2 or more distinct topics. If the expected output has two or more top-level section headings, use parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

Spawn two agents simultaneously. Pass the full evidence text (copied verbatim from the prepare output) into each agent's prompt.

Each sub-agent prompt must include:
- Their assigned section topic and the user's original question
- The full `deepTextPages` evidence text from the prepare output (copy it in full)
- Citation format: **bold** 1–4 verbatim words from the evidence — the exact source phrase. Place `[N]` after each bolded term. **`k` in CITATION_DATA must equal the bold text exactly** — they are the same verbatim phrase. The reader clicks the bold term and sees those same words highlighted. Example: `The invoice totals **USD 4,350.00** [1] for services by **Acme Corp** [2].` After the body, append a `<<<CITATION_DATA>>>` block with `n` (citation id), `k` (must equal bold text — 1–4 verbatim words, NEVER more than 4, NEVER a paraphrase), `p` (page id as `"N_I"` from `<page_number_N_index_I>`), `l` (line id array — include the anchor's line PLUS 1–2 adjacent lines for context, e.g. `[19, 20, 21]`). One unique ID per distinct fact.
- Citation ID range: **Agent A starts at 1**, **Agent B starts at 100**
- File to Write to: **Agent A → `.deepcitation/section-a.md`**, **Agent B → `.deepcitation/section-b.md`**
- **Comprehensiveness**: extract every specific detail from the evidence — measurements, unit numbers, defined terms, thresholds. Distinguish categories (e.g., different types, parties, events) with separate subsections. A vague summary is a failure.
- Each agent writes body text only (section heading + cited body text) and returns a one-line confirmation that includes the section heading and approximate line count (e.g. "Written: ## Pet Policy — 18 lines"). If an agent returns nothing or reports failure, do not proceed to merge — report the error to the user.

**After both agents complete, merge + verify in one command** (renumber, citation generation, and verification happen automatically). Replace `{draft}` and `{topic}` with actual names (e.g. `lease-terms-body` and `lease-terms`):

```bash
npx -y deepcitation@latest merge --a .deepcitation/section-a.md --b .deepcitation/section-b.md --out .deepcitation/{draft}-body.md && \
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" --out {topic}-verified.html
```

**Single-topic questions:** write the report body directly to `.deepcitation/{draft}-body.md`, then run `verify --markdown` on it.

### Comprehensiveness — answer every part of the question

**Cover ALL parts of the question equally.** Multi-part questions (e.g., "What are X? What about Y?") require thorough answers for each part — not a deep answer for the easy part and a shallow answer for the harder part. Before writing, scan the full evidence for every section/schedule/appendix that addresses each sub-question.

**Extract specific details.** Vague summaries fail. If the evidence contains measurements, unit numbers, defined terms, thresholds, or formulas — include them with citations. A response that says "boundaries are defined" without stating the actual boundary definitions is incomplete.

**Use structured sections.** If the evidence distinguishes categories (e.g., different unit types, different event types, different parties), your response must mirror those distinctions with separate subsections or table rows — not collapse them into a single vague paragraph.

Structure with headings, tables, and lists matching the evidence. If evidence seems incomplete for the question, note what's covered and suggest the user share additional documents.

**What goes in each file:**
- **Body file** (your output or from agents): markdown prose with `**bold term** [N]` markers and an appended `<<<CITATION_DATA>>>` block.
- **Your response to the user**: The full markdown report body — prose only.

## 3. Verify

Pick a clean output name matching the topic — the report lives in CWD, not `.deepcitation/`:

```bash
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" \
  --out {topic}-verified.html
```

If you skipped Step 1–2 because the HTML already had citation markers (triage row above), use `--html` instead:

```bash
npx -y deepcitation@latest verify --html {existing}.html \
  --title "Descriptive Report Title" \
  --out {topic}-verified.html
```

Run verify ONCE — do not edit the draft and re-verify. The API handles partial matches gracefully. If an anchor cannot be located in the evidence, the CLI flags it in output as unmatched — check the summary for typos or shorten the `k` value to a more distinctive term.

Do not use `verify --citations` directly — it is low-level and skips format normalization.

Options: `--style plain|report` (default: `report`), `--audience general|executive|technical|legal|medical` (default: `general`), `--theme auto|light|dark` (default: `auto`).

If the output contains "action needed", authenticate as in Step 1 and re-run.

Open the output (WSL first — most users run in WSL on Windows; macOS/Linux fallbacks are silent):

```bash
explorer.exe "$(wslpath -w "{topic}-verified.html")" 2>/dev/null || \
xdg-open "{topic}-verified.html" 2>/dev/null || \
open "{topic}-verified.html" 2>/dev/null || \
echo "Open: $(pwd)/{topic}-verified.html"
```

Summarize: `12/14 verified · 2 partial → {topic}-verified.html`

If you suspect better evidence exists, add:
> If you have a more authoritative document, share it and I'll re-run `/verify`.

## Invariants

- **Minimum tool calls** — do not make exploratory calls (ls, Glob, Grep, extra Read) between pipeline steps. Do not read files back after writing them. Single-topic pipeline: prepare → Read summary → Write body → Bash(verify+open). Multi-topic pipeline: prepare → Read summary → [Agent A ∥ Agent B] → Bash(merge+verify+open). Complete each step once.
- **Never run login proactively** — only run `deepcitation auth` if prepare or verify output contains the exact phrase "action needed". Do not run login as a precaution or to check auth status.
- **Run verify ONCE** — do not edit the draft and re-verify.
- **Write body text only** — bold key terms with `[N]` markers and append a `<<<CITATION_DATA>>>` block with coordinates (`n`, `k`, `p`, `l`). Do not include structural boilerplate or HTML in the body file.
- **Only the CLI produces HTML** — the verified HTML is created exclusively by `npx -y deepcitation@latest verify`. If you cannot run the CLI, stop and report the error.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[N]` reference — each `n` only needs one entry in the `<<<CITATION_DATA>>>` block.
- Never expose API keys or render internal metadata as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
