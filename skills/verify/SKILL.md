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
| Prior chat OR a user-supplied file (e.g. `index.html`, `draft.md`) contains claims to verify | Use those claims **verbatim** — do NOT rewrite or rephrase them. Prepare the separate evidence document, then cite the existing claim text. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML already produced by the CLI | Skip to Step 3 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, and web readers.

```bash
mkdir -p .deepcitation && npx -y deepcitation@latest prepare <file-or-url> --text > .deepcitation/<name>.txt 2>&1
```

Multiple sources: run all in parallel with `&` + `wait`.

If the output contains the literal phrase "action needed", authenticate. Auth failure is **recoverable**, not a hard stop. Use this exact command — it forces a pseudo-TTY so the browser OAuth flow works even when the shell has no TTY:

```bash
script -q -c "npx -y deepcitation@latest auth" /dev/null
```

`script` wraps the process in a pseudo-TTY, making `process.stdin.isTTY` return `true` inside Node. The browser opens via `explorer.exe`/`xdg-open`, completes the OAuth callback, and writes credentials to `~/.deepcitation/credentials.json`. Use a generous timeout (≥180s) because OAuth waits on a human. After it returns, **retry the same prepare command**.

**Do NOT stop and ask the user to authenticate.** This command is self-sufficient — run it yourself.

If `script` is unavailable or the above still prints `Non-interactive environment detected` (rare — cloud sandboxes with `DC_NON_INTERACTIVE=1`), fall back to the manual-key path:

1. Show the URL (`https://deepcitation.com/cli-auth?manual=true`) to the user **verbatim** and ask them to paste an `sk-dc-…` API key.
2. Once they paste `<the-key>`, run `npx -y deepcitation@latest auth --key '<the-key>'` to save it.
3. **Retry the original prepare command exactly once.** If it still fails, stop.

If the output contains "Update available", run `npm install -g deepcitation@latest`, then retry the command.

**Only stop completely if all of the above fail.** Show the full error and end your response. Reports require verified evidence from `prepare`.

Never use `DEEPCITATION_API_KEY=...` env-var prefixing in commands. Never print key values in chat.

### Environment notes — cloud sandboxes (Claude Cowork, etc.)

If you are running inside a cloud sandbox (detect via `$CLAUDE_CODE_REMOTE == "true"` for Cowork), the following constraints apply. Read this section once before invoking any `deepcitation` command in such an environment.

**The CLI is a single bundled binary.** `deepcitation` is published to npm with all of its HTTP transport (including `undici`) bundled inside. Installing additional packages (`npm install undici`, `npm install -g undici`, `npm install node-fetch`, etc.) **cannot affect** the bundled CLI's network behavior. Do not attempt this workaround under any circumstances — it will waste time and resolve nothing.

**Do not modify proxy environment variables.** Cowork sets `HTTP_PROXY` / `HTTPS_PROXY` to route egress through a sandbox-managed proxy. The bundled CLI auto-detects this and routes through it correctly. Overriding `HTTP_PROXY=""`, `HTTPS_PROXY=""`, or `NO_PROXY=api.deepcitation.com` on individual command invocations is **not a supported workaround** and is more likely to break the request than fix it.

**Expected command timing.** Use these as your "is this hung?" baseline:

| Command | Typical | Worst case | If exceeded |
|---------|---------|------------|-------------|
| `prepare` PDF | ~1 s | ~5 s | Almost certainly hung — abort and report |
| `prepare` URL or office file | ~5 s | ~30 s | Wait up to 60 s, then abort |
| `verify --markdown` | ~0.5 s | ~5 s | Almost certainly hung — abort and report |
| `auth --key '<key>'` | <1 s | ~2 s | Abort and report |

The CLI itself enforces a 90-second hard ceiling on every request and exits with a clear timeout error. **Do not extend this** by backgrounding the command with `&`, wrapping it in `for i in $(seq 1 24); do sleep 10`, `timeout 600 npx ...`, or any similar pattern. If the CLI hits its own timeout, the request is genuinely stuck — additional retries against the same endpoint will not succeed.

**When a command times out in a sandbox, the failure mode is the network layer, not the CLI logic.** Do not "simplify the input" (smaller markdown, fewer citations, blanker templates) hoping the API will respond — the API never received the request, or the response never reached you. Stop after one failure, surface the error verbatim, and let the user decide whether to retry, switch networks, or contact support.

**You may NOT fall back to building a "verified-looking" HTML report from your own knowledge of the document.** If `verify` cannot complete, the deliverable is not producible, full stop. Returning a hand-built HTML that mimics the verified format is worse than reporting the failure honestly — it presents unverified text as verified.

**Recognize structured CLI errors.** When the CLI fails with a transport-layer issue, it emits a final line on stderr beginning with `__DC_ERROR__` followed by JSON (e.g. `__DC_ERROR__ {"type":"timeout","phase":"response_headers","retryable":false,"recoverable":false,...}`). If `recoverable: false`, treat it as a hard stop — do not retry, do not try workarounds.

Read each summary file **fully** with the Read tool (no grep, no jq — read top to bottom).
The summary contains `attachmentId` and `deepTextPages` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — having evidence text in context (even repeated) improves citation accuracy via RE2.

> **CLI version:** `deepTextPages` requires the latest CLI. If your summary shows `deepTextPromptPortion` instead, run `npm install -g deepcitation@latest` and retry.

## 2. Respond with citations

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
Data:   {"n": 4, "r": "states the conversion trigger", "f": "this Safe will automatically convert into the number of shares of Safe Preferred Stock.", "k": "automatically convert", "p": "1_0", "l": [20, 21]}
                                                                                                          k = tick-quoted sourceMatch ("automatically convert"), NOT prose claimText ("converts automatically")
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

Spawn two agents simultaneously. Pass the full evidence text (copied verbatim from the prepare output) into each agent's prompt.

Each sub-agent prompt must include:
- Their assigned section topic and the user's original question
- The full `deepTextPages` evidence text from the prepare output (copy it in full)
- Citation format: two formats available. **Format 1** (when sourceMatch works naturally as prose): bold the verbatim source term and place `[N]` after — `**sourceMatch** [N]`. **Format 2** (when prose has its own voice): `[claimText](cite:N 'sourceMatch')` where claimText is Domain A prose and sourceMatch is the verbatim Domain B term. After the body, append a `<<<CITATION_DATA>>>` block with fields in CoT order — **write them in this sequence**: `n` (citation id), `r` (one phrase: *why* this fact supports the claim), `f` (`sourceContext` — verbatim sentence(s) from the evidence, the full quote `k` is drawn from), `k` (`sourceMatch` — 1–4 verbatim words extracted from `f`, **must be a substring of `f`**, NEVER a paraphrase, NEVER more than 4 words. **Format 1:** `k` equals the bold term. **Format 2:** `k` equals the tick-quoted sourceMatch — NOT the prose claimText), `p` (`page_number_N_index_I` — copy from `<page_number_N_index_I>` tags), `l` (line IDs — `sourceMatch` line ± 1–2 adjacent lines, e.g. `[19, 20, 21]`). One unique ID per distinct fact. Example Format 1 entry: `{"n": 1, "r": "states invoice total", "f": "The invoice total is USD 4,350.00 for services rendered.", "k": "USD 4,350.00", "p": "page_number_1_index_0", "l": [13, 14, 15]}`. Example Format 2 entry (body: `[converts automatically](cite:2 'automatically convert')`): `{"n": 2, "r": "states the conversion trigger", "f": "this Safe will automatically convert into the number of shares of Safe Preferred Stock.", "k": "automatically convert", "p": "page_number_1_index_0", "l": [20, 21]}` — note `k` is the tick-quoted sourceMatch, not "converts automatically". **Do NOT wrap the JSON in a markdown code fence** — the `<<<CITATION_DATA>>>` / `<<<END_CITATION_DATA>>>` delimiters are the only wrappers the parser recognizes.
- **CoT gate (runs first)**: before writing any `**bold term**`, locate the sentence in the evidence that proves the claim and write it as `f` (`sourceContext`). Then extract `k` (`sourceMatch`) from that sentence. If your planned key phrase doesn't appear word-for-word in `f`, it's a paraphrase — fix `f` first, then re-derive `k`.
- **Terse `sourceMatch` gate**: count `k` words — "1 – 2 – 3 – 4 – stop." 1–2 words is ideal; 3–4 acceptable; 5+ means you're grabbing context that belongs in prose. Drop the leading quantifier/adjective, keep the noun head or key verb. For mechanism clauses, cite the key verb phrase (≤2 words) — NOT the full clause. Examples: "will automatically convert into shares" → `k` = `"automatically convert"`; "On par with payments for other Safes" → `k` = `"On par with"`.
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

If the output contains "action needed", authenticate via the recovery flow in Step 1 (run `deepcitation auth`, TTY → browser, non-TTY → ask user for a key, then retry).

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
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Never install npm packages to "fix" CLI behavior.** The `deepcitation` CLI is a bundled binary; external packages (`undici`, `node-fetch`, `axios`, etc.) cannot affect its network stack. The only valid CLI install/upgrade is `npm install -g deepcitation@latest`, and only when the CLI itself prints "Update available".
- **Never modify proxy environment variables on individual command runs.** No `HTTP_PROXY=`, `HTTPS_PROXY=`, `NO_PROXY=` prefixing. The CLI handles proxies automatically. If a request fails despite this, surface the failure — do not work around it.
- **Never extend command timeouts via shell wrappers.** No `&` backgrounding, no `for i in $(seq …); do sleep N`, no `timeout 600 npx ...`. The CLI's built-in 90-second ceiling is authoritative; exceeding it means the request is broken, not slow.
- **Never fall back to a hand-built HTML report when the CLI fails.** If `verify` cannot complete, the deliverable does not exist. Producing a verified-looking HTML from your own knowledge of the source document misrepresents unverified text as verified.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[N]` reference — each `n` only needs one entry in the `<<<CITATION_DATA>>>` block.
- Never expose API keys or render internal metadata as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
