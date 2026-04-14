---
name: verify
description: Use when /verify appears anywhere in the prompt, or when the user asks to verify claims, cite sources, find evidence, prove facts, check accuracy, extract OCR text, or validate content from a document or URL — with a file path, URL, user question, or existing content to work from. Triggers the full DeepCitation pipeline automatically.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Execute the pipeline below whenever `/verify` appears in the prompt.
Answer any question as part of the verification report — not as a standalone response.

## 1. Orient — state the claim and the evidence

Every `/verify` call opens with a short out-loud preamble sentence that clearly indicates these items:

- **The claim(s)** — what specifically is being verified? Quote or briefly summarize each assertion.
- **The evidence being considered** — which file(s), URL(s), or prior-message content is the authoritative source? List each one by name.
- **If no evidence was provided** — the official sources you plan to look up (legislation, regulator publications, standards bodies, peer-reviewed studies) and/or the local files you'll check.

**Emit this preamble and call `prepare` in the same assistant turn** — text streams to the user first, so they read the preamble while `prepare` is already running. This is a CoT gate prioritizing user clarity and progress, **not** a confirmation checkpoint; do not ask for approval unless Step 2's triage table says the claims-vs-evidence split is ambiguous.

## 2. Prepare

Identify the evidence document (the authoritative source — not the claims).
A claim cannot be its own evidence.

| Situation | Evidence |
|-----------|----------|
| User provided a file/URL as evidence | That file/URL |
| Prior chat OR a user-supplied file (e.g. `index.html`, `draft.md`) contains claims to verify | Use those claims **verbatim** — do NOT rewrite or rephrase them. Prepare the separate evidence document, then cite the existing claim text. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML already produced by the CLI | Skip to Step 4 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence) | Ask the user |

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

## 3. Respond with citations

> **Citation rules reference**: All anchor text, display label, and citation data field rules are defined in
> `packages/deepcitation/docs/agents/deep-citation-standards.md` (§1–§4 and §9 UX contract). This skill owns the *authoring
> heuristics* — how to pick the right anchor in-flow — and references the standards for the hard rules.
> When the two disagree, the standards doc wins.

Your response IS the verification report. Write body text with citation markers, then append a `<<<CITATION_DATA>>>` JSON block with coordinates.

Use **standard markdown only** — no raw HTML tags.

### Progressive disclosure — the scan-anchor chain

Users scan, they don't read (see `packages/deepcitation/docs/agents/deep-citation-concepts.md`). Each view state has one scan anchor; shorter and terser anchors make every state work better:

1. **`preview`** — the reader skims `claimText` (bolded terms) with a `verificationBadge` beside each. Terse `claimText` = clean scan target that doesn't dominate the sentence.
2. **`focusPopover`** — clicking `claimText` shows `sourceContext` with `sourceMatch` highlighted in amber. The `keyholeViewport` is pre-centered on `sourceMatch`. Terse `sourceMatch` = tight keyhole framing, instant confirmation. If `sourceMatch` = the entire paragraph, **no highlight is shown** — the anchor drowns in its own context.
3. **`pageView`** — the `spotlight` dims everything outside `sourceContext`, and `contextBrackets` frame the target. Terse `sourceMatch` = tight `spotlight` region, readable at a glance.

**Why shorter is safer, lighter, and more flexible:**
- **Safer**: Fewer words to match = fewer chances for OCR fragmentation, line breaks, or whitespace to break the search
- **Lighter**: A terse `claimText` reads naturally in prose — the bold term is a scan anchor, not a quote
- **More flexible**: When `claimText` is terse, existing prose doesn't need to be rewritten around it

**Hard rules** (see `packages/deepcitation/docs/agents/deep-citation-standards.md` §1 for the canonical list):
1. **Connection**: In Format 1, `claimText` (bold text) and `k` (`sourceMatch`) are identical. In Format 2, `claimText` is a short prose label and `k` is the verbatim source term — both must be terse, but they serve different roles.
2. **Brevity**: `sourceMatch` (`k`) must be **≤4 words, ≤40 chars**. Truncate longer evidence phrases per §2 of the standards doc.
3. **Context**: `l` must include the `sourceMatch` line PLUS 1–2 adjacent lines, so `sourceContext` is longer than `sourceMatch`.
4. **Verbatim**: `k` must be a contiguous substring of `sourceContext` — never a paraphrase, never with ellipsis.

**Per-citation SELF-CHECK — run this in your head before AND after writing each citation:**
0. **CoT gate — locate the source sentence first.** Before deciding any `sourceMatch`, find the sentence in the evidence that proves the claim and hold it in mind as `f` (`source_context`). You cannot pick `sourceMatch` until you have that sentence — `sourceMatch` must be a word-for-word substring of `f`. If the phrase you want doesn't appear verbatim in that sentence, your planned `sourceMatch` is a paraphrase: find the right sentence first, then extract the key term.
1. **Pick `sourceMatch` first** — the terse verbatim phrase from the source (Domain B). Shorter is safer: 1–2 words is ideal, 3–4 is acceptable. If you're at 5+, you're grabbing context that belongs in prose, not in the anchor. Drop the leading quantifier or filler adjective.
   - "six ground floor commercial units" → **ground floor commercial** (3w) — drop the number
   - "fifty-nine interior underground parking units" → **underground parking** (2w) — drop the count and modifier
2. **Decide the format.** If `sourceMatch` reads naturally as `claimText` in the prose → Format 1 (`**sourceMatch** [N]`). If the prose already has its own phrasing, or the source term doesn't read naturally → Format 2 (`[claimText](cite:N 'sourceMatch')`).
   **Format 2 trigger:** Use Format 2 whenever your natural prose phrasing would fail the CoT substring check — the phrase you want in prose doesn't appear verbatim in the source. Format 2 lets Domain A (prose) and Domain B (source) speak independently without either contorting. Examples:
   - Prose: "the meals are not fully deductible" — source: "deduct only 50%" → `[not fully deductible](cite:N '50%')`
   - Prose: "converts automatically on financing" — source: "will automatically convert into shares" → `[converts automatically](cite:N 'automatically convert')`
   - Prose: "the person's age caps the deduction" — source: "limited by the age of the individual" → `[person's age](cite:N 'age of the individual')`
3. **After writing**: recount `sourceMatch` words. If 5+, stop and shorten before moving on.
4. **Ctrl+F test**: could a reader search for this `sourceMatch` and find it uniquely in the source? If yes, proceed. If it takes 5+ words to be unique, pick the noun head, not the whole phrase.

### In-text markers — Domain A (`claimText`) and Domain B (`sourceMatch`)

The `sourceMatch` is a **Ctrl+F search key** — the 2–3 words a reader would type to locate this exact fact in the source. The prose sentence is the claim; the bold term is the evidence label. Ask before writing any anchor: *"What would I search for to find this fact in a 50-page document?"*

| Fact type | `sourceMatch` (bold this) | Not this |
|-----------|--------------------------|----------|
| Dollar amount | `USD 4,350.00` | `invoice total is USD 4,350` |
| Time limit | `two (2) weeks` | `remove pets within two weeks` |
| Party name | `Acme Corp` | `services rendered by Acme Corp` |
| Priority tier | `Senior to` | `senior to payments for Common Stock` |
| Trigger mechanism | `automatically convert` | `will automatically convert into shares` |
| Tax threshold | `$130,000 in pay` | `more than $130,000 in pay for the preceding year` |

NEVER bold a full clause that restates the claim. Bold only the fact-specific label — the number, entity, tier marker, or trigger verb. Then decide the format (below).

Every citation connects two documents (see `packages/deepcitation/docs/agents/deep-citation-concepts.md`):
- **Domain A** — the asserting document (your report). The `claimText` is what the reader sees bolded or linked.
- **Domain B** — the authoritative document (the evidence). The `sourceMatch` (`k`) is the verbatim phrase that the search locates and the `keyholeViewport` frames.

**Format 1** — when `sourceMatch` reads naturally as `claimText`:
Bold the `sourceMatch` directly. `claimText === sourceMatch` (`isVerbatim` = true). Place `[N]` after.

Example: The invoice totals **USD 4,350.00** [1] for services rendered by **Acme Corp** [2] on **March 15, 2024** [3].

**Format 2** — when the prose already has its own voice, or the source term doesn't fit:
Use `[claimText](cite:N 'sourceMatch')`. The `claimText` stays in Domain A's voice; the `sourceMatch` is independently chosen from Domain B.

Example: The company's [revenue grew](cite:1 '$4.2 million') over the prior year, with [dissolution protections](cite:2 'Dissolution Event') for minority holders.

**Default to the tersest `sourceMatch` that uniquely identifies the evidence.** Then decide whether that same phrase works as `claimText` (Format 1) or whether the prose needs its own phrasing (Format 2). One unique ID per distinct fact.

**How to truncate long `sourceContext` phrases to a terse `sourceMatch`** (canonical strategy is in `packages/deepcitation/docs/agents/deep-citation-standards.md` §2). A few worked examples for in-flow reference:

*Quantifier-drop (noun phrases):*
- "Junior to payment of outstanding indebtedness and creditor claims" → **outstanding indebtedness** (2w)
- "lower limit is the upper unfinished surface of the concrete ground floor slab" → **unfinished surface** (2w) or **concrete floor slab** (3w)
- "Each parking unit shall be used and occupied only for motor vehicle parking purposes" → **motor vehicle parking** (3w)
- "no motor vehicle which contains a propane or natural gas propulsion system shall be parked" → **natural gas propulsion** (3w)

*Clause-truncation (mechanism and priority text — cite the key verb or tier marker, NOT the full clause):*
- "will automatically convert into the number of shares of Safe Preferred Stock" → **automatically convert** (2w) [cite the trigger verb]
- "Investor will automatically be entitled to receive a portion of Proceeds" → **entitled to receive** (3w) [drop subject and object]
- "On par with payments for other Safes and/or Preferred Stock" → **On par with** (3w) [tier marker is the claim; the list of co-equal holders is context]
- "Senior to payments for Common Stock" → **Senior to** (2w) [same: the priority label is the claim — do NOT quote "for Common Stock"]
- "junior to payments described in clauses (i) and (ii) above" → **Junior to** (2w) [priority label only]
- "the applicable Proceeds will be distributed pro rata to the Investor" → **pro rata** (2w) [the distribution principle, not the full rule]
- "immediately following the earliest to occur of: (i) the issuance of Capital Stock" → **earliest to occur** (3w) or **Capital Stock** (2w)

*Formula, definition, and enumeration (cite the result or term, NOT the formula body or definition):*
- "Purchase Amount divided by the Discount Price" → **Discount Price** (2w) [cite the result/key term, not the formula — the formula is context]
- "Discount Price means the lowest price per share of Standard Preferred Stock" → **Discount Price** (2w) [cite the defined term, not the definition body]
- "Safe Price means the price per share equal to the Post-Money Valuation Cap divided by the Company Capitalization" → **Safe Price** (2w) [same: term, not definition]
- "Sections 304, 305, 306, 354, 368, 1036 and 1202 of the Internal Revenue Code" → **Section 304** (2w) or **IRC sections** (2w) [multi-value list: cite the first item or a category label; never quote the whole list]
- "pursuant to Sections 83(b), 422 and 423 of the Code" → **Section 83(b)** (2w) [first IRC section]

Common trap for formulas and definitions: the full formula phrase ("Purchase Amount divided by the Discount Price") feels load-bearing because every word seems necessary. It's not — only the *result term* (the named quantity the clause defines) is the citable fact. The formula body is prose context that belongs outside the anchor.

Pick the 2–3 words that a reader would recognize as the key term — the noun, the distinctive verb trigger, or the priority tier label. For mechanism clauses, the verb phrase (≤2 words) is usually the correct anchor, not the full operative sentence.

*Tax/regulatory value extraction (cite the number or threshold, NOT the surrounding rule):*
- "ordinary and necessary expenses incurred while carrying on your trade or business" → **ordinary and necessary** (3w) [the legal test name, not the full definition]
- "you can generally deduct only 50% of any otherwise deductible business-related meal expenses" → **50%** (1w) [cite the percentage limit]
- "58.5 cents per mile from January 1, 2022, through June 30, 2022" → **58.5 cents per mile** (4w) [cite the rate, drop the effective-date clause]
- "Received more than $130,000 in pay for the preceding year" → **$130,000 in pay** (3w) [cite the threshold and its unit]
- "$450- if that person is age 40 or younger" → **$450** (1w) [cite the dollar cap, strip trailing punctuation artifacts like the dash; let prose carry the age bracket]
- "average annual gross receipts are $27 million or less for the 3 prior tax years" → **$27 million or less** (4w) [cite the receipts threshold]
- "the character and amount of responsibility" → **responsibility** (1w) [cite the factor, not the list preamble]
- "100% business meal deduction for food or beverages provided by a restaurant" → **100%** (1w) [cite the deduction rate]

For tax/regulatory text: dollar amounts, percentages, and named legal tests are the anchors. The qualifying clause ("for the preceding year", "incurred while carrying on") is prose context — it belongs outside the bold marker. Common trap: grabbing the full regulatory condition instead of the distinctive noun head:
- BAD: `**first 5 years of employment**` (5w) → GOOD: `**5 years**` (2w)
- BAD: `**30% of the adjustable taxable income**` (6w) → GOOD: `**adjustable taxable income**` (3w)
- BAD: `**limited by the person's age**` (5w) → GOOD: `**person's age**` (2w)

**Avoid heading-only anchors.** If the same short phrase appears as a section heading and again inside the operative sentence, do **not** anchor the heading version — it will verify against the wrong place while still looking superficially correct.
- BAD: "The declaration creates exterior parking units and underground parking units." → **exterior parking units** when the evidence also contains the heading `EXTERIOR PARKING UNITS`
- GOOD: split the claim and anchor the operative clause instead: **underground parking units** or **fifty-nine (59) interior**
- BAD: "Unit 59 must be cleared for hydro vault access." → **hydro vault** when the evidence also contains the heading `Rights of Access to the Hydro Vault`
- GOOD: anchor the action phrase from the rule itself: **remove any vehicle** or **permit access**

**Never cite from index, appendix, or table-of-contents pages.** If a dollar amount, form number, or term appears in both the body text and an A-Z index or appendix, always point `p` and `l` at the **body text** page where the operative rule or definition lives. Index entries are page-number references, not evidence — they produce garbage sourceContext and fail verification.
- BAD: `"$297"` with `p` pointing to the A-Z index page → sourceContext = "A Club dues 47 F Carrying charge 25..."
- GOOD: `"$297"` with `p` pointing to the per-diem rate table in Chapter 11 → sourceContext = "the per diem rate for high-cost locations will increase to $297..."

**Prefer operative phrases over category labels.** A short noun phrase is only valid if it points at the sentence that proves the claim. If the noun phrase is just a topic label, choose the verb phrase or distinctive action instead.
- BAD: claim about restrictions → **commercial units** (category only)
- GOOD: **parking requirements** or **no right of access** (operative rule)
- BAD: claim about pet removal timing → **ordinary household pets** (topic only)
- GOOD: **two (2) weeks** or **on a leash** (the actual restriction being proved)

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

**Common failure modes** — the trap is what the model naturally writes; the fix shows how terse `sourceMatch` values work better.

| Trap (✗) | Fix (✓) | Why |
|---|---|---|
| `sourceMatch` = `"Junior to payment of outstanding indebtedness"` (6w) | `sourceMatch` = `"outstanding indebtedness"` (2w) | The distinctive noun carries the claim — quantifiers and prepositions are filler. Shorter `sourceMatch` = tighter `keyholeViewport`. |
| `claimText` = `**Equity Financing**`, `k` = `"when the company raises capital"` | `claimText` = `**Equity Financing**`, `k` = `"Equity Financing"` (Format 1) | `k` is `sourceMatch` — verbatim Domain B text. The reader clicks `claimText` and sees `sourceMatch` highlighted in the `focusPopover`. They must be connected. |
| `sourceMatch` = `"Tooth Numbers 3 9 14 19 24 30"` (7w) | `sourceMatch` = `"Tooth Numbers"` (2w) | Multi-value fields: cite **one** value. The list is `sourceContext`; the header is the citable `sourceMatch`. |
| `sourceMatch` = `"earliest to occur...prior to"` (ellipsis) | `sourceMatch` = `"earliest to occur"` (3w) | Never use `...` — `sourceMatch` must be a contiguous substring of `sourceContext`. Two pieces = two citations. |
| `sourceMatch` = `"first 5 years of employment"` (5w) | `sourceMatch` = `"5 years"` (2w) | Cite the threshold, drop the qualifying phrase. Prose carries the rest: `within the first **5 years** [3] of employment`. |
| `sourceMatch` = `"30% of the adjustable taxable income"` (6w) | `sourceMatch` = `"adjustable taxable income"` (3w) | Cite the distinctive noun, not the full clause. Prose: `capped at 30% of **adjustable taxable income** [5]`. |
| Existing prose says "the person's age limits deductions" but source says "age of the individual" | Format 2: `[person's age](cite:7 'age of the individual')` | `claimText` uses Domain A's voice, `sourceMatch` uses Domain B's exact words. Neither needs to contort. |
| Prose writes `**fully deductible**` but source says "you can deduct the cost of meals you sell to the public" — "fully deductible" isn't in `f`, so the CoT substring check fails | Format 2: `[fully deductible](cite:N 'deduct the cost')` with `k` = `"deduct the cost"` | When prose summarizes what source states operationally, Format 2 decouples the two voices. The prose claim and the verbatim anchor are independently correct. |
| Format 2 body `[converts automatically](cite:4 'automatically convert')` but CITATION_DATA has `k` = `"converts automatically"` (the claimText) | Set `k` = `"automatically convert"` (the tick-quoted sourceMatch) | In Format 2, `k` is always the tick-quoted sourceMatch from Domain B — never the prose claimText from Domain A. |

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
        parts.append(f"<page_number_{page_num}_index_{idx0}>\n{body}\n</page_number_{page_num}_index_{idx0}>\n")
    return "\n".join(parts)

Path(".deepcitation/evidence-a.txt").write_text(render_chunk(agent_a_pages))
Path(".deepcitation/evidence-b.txt").write_text(render_chunk(agent_b_pages))
```

Pass each file path to the corresponding agent. Validate both files before dispatching:
```bash
grep -c '<page_number_' .deepcitation/evidence-a.txt  # should equal Agent A's chunk size
grep -c '<page_number_' .deepcitation/evidence-b.txt  # should equal Agent B's chunk size
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
  --title "Descriptive Report Title" --out {topic}-verified.html
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
  --out {topic}-verified.html
```

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

Summarize: `12/14 verified · 2 partial → {topic}-verified.html`

If you suspect better evidence exists, add:
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

