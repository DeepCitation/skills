# Citation anchor heuristics

This is the heavy reference for citation anchor authoring in the /verify skill.
The parent `SKILL.md` has the brief Format 1 / Format 2 summary and the three
hard rules; this file has the truncation strategies, anti-patterns, and common
failure modes.

> **Note on cross-package paths**: references to `packages/deepcitation/docs/agents/` throughout
> this file point to the separate `deepcitation` package (not this `skills` repo). When installing
> this skill standalone, treat those paths as external documentation — the hard rules and
> truncation strategies in this file are self-contained.

## When to read this file

Open this file **before writing citations** whenever:

- You are unsure whether to use Format 1 or Format 2 for a specific claim
- Your candidate `sourceMatch` is ≥5 words and you need truncation guidance
- The source is a formula, definition, enumeration, or tax/regulatory value
- The evidence has section headings that duplicate body text phrases
- The evidence has an A–Z index, appendix, or table of contents
- An anchor "feels wrong" and you want to check known failure patterns

In **read-only mode** (text extraction without citations), skip this file entirely.

## Progressive disclosure — the scan-anchor chain

Users scan, they don't read (see `packages/deepcitation/docs/agents/deep-citation-concepts.md`).
Each view state has one scan anchor; shorter and terser anchors make every state
work better:

1. **`preview`** — the reader skims `claimText` (bolded terms) with a `verificationBadge` beside each. Terse `claimText` = clean scan target that doesn't dominate the sentence.
2. **`focusPopover`** — clicking `claimText` shows `sourceContext` with `sourceMatch` highlighted in amber. The `keyholeViewport` is pre-centered on `sourceMatch`. Terse `sourceMatch` = tight keyhole framing, instant confirmation. If `sourceMatch` equals the entire paragraph, **no highlight is shown** — the anchor drowns in its own context.
3. **`pageView`** — the `spotlight` dims everything outside `sourceContext`, and `contextBrackets` frame the target. Terse `sourceMatch` = tight `spotlight` region, readable at a glance.

**Why shorter is safer, lighter, and more flexible:**

- **Safer** — fewer words to match = fewer chances for OCR fragmentation, line breaks, or whitespace to break the search
- **Lighter** — a terse `claimText` reads naturally in prose; the bold term is a scan anchor, not a quote
- **More flexible** — when `claimText` is terse, existing prose doesn't need to be rewritten around it

## Hard rules (canonical list in `packages/deepcitation/docs/agents/deep-citation-standards.md` §1)

1. **Connection** — In Format 1, `claimText` (bold text) and `k` (`sourceMatch`) are identical. In Format 2, `claimText` is a short prose label and `k` is the verbatim source term; both must be terse, but they serve different roles.
2. **Brevity** — `sourceMatch` (`k`) must be **≤4 words, ≤40 chars**.
3. **Context** — `l` must include the `sourceMatch` line PLUS 1–2 adjacent lines, so `sourceContext` is longer than `sourceMatch`.
4. **Verbatim** — `k` must be a contiguous substring of `sourceContext` — never a paraphrase, never with ellipsis.

## Per-citation SELF-CHECK

Run this in your head **before AND after** writing each citation:

0. **CoT gate — locate the source sentence first.** Before deciding any `sourceMatch`, find the sentence in the evidence that proves the claim and hold it in mind as `f` (`source_context`). You cannot pick `sourceMatch` until you have that sentence — `sourceMatch` must be a word-for-word substring of `f`. If the phrase you want doesn't appear verbatim in that sentence, your planned `sourceMatch` is a paraphrase: find the right sentence first, then extract the key term.
1. **Pick `sourceMatch` first** — the terse verbatim phrase from the source (Domain B). Shorter is safer: 1–2 words is ideal, 3–4 is acceptable. If you're at 5+, you're grabbing context that belongs in prose, not in the anchor. Drop the leading quantifier or filler adjective.
   - "six ground floor commercial units" → **ground floor commercial** (3w) — drop the number
   - "fifty-nine interior underground parking units" → **underground parking** (2w) — drop the count and modifier
2. **Decide the format.** If `sourceMatch` reads naturally as `claimText` in the prose → Format 1 (`**sourceMatch** [N]`). If the prose already has its own phrasing, or the source term doesn't read naturally → Format 2 (`[claimText](cite:N 'sourceMatch')`).
   - **Format 2 trigger:** your natural prose phrasing would fail the CoT substring check — the phrase you want in prose doesn't appear verbatim in the source. Examples:
     - Prose: "the meals are not fully deductible" — source: "deduct only 50%" → `[not fully deductible](cite:N '50%')`
     - Prose: "converts automatically on financing" — source: "will automatically convert into shares" → `[converts automatically](cite:N 'automatically convert')`
     - Prose: "the person's age caps the deduction" — source: "limited by the age of the individual" → `[person's age](cite:N 'age of the individual')`
3. **After writing** — recount `sourceMatch` words. If 5+, stop and shorten before moving on.
4. **Ctrl+F test** — could a reader search for this `sourceMatch` and find it uniquely in the source? If yes, proceed. If it takes 5+ words to be unique, pick the noun head, not the whole phrase.

## In-text markers — Domain A (`claimText`) and Domain B (`sourceMatch`)

The `sourceMatch` is a **Ctrl+F search key** — the 2–3 words a reader would type to locate this exact fact in the source. The prose sentence is the claim; the bold term is the evidence label. Ask before writing any anchor: *"What would I search for to find this fact in a 50-page document?"*

| Fact type | `sourceMatch` (bold this) | Not this |
|-----------|---------------------------|----------|
| Dollar amount | `USD 4,350.00` | `invoice total is USD 4,350` |
| Time limit | `two (2) weeks` | `remove pets within two weeks` |
| Party name | `Acme Corp` | `services rendered by Acme Corp` |
| Priority tier | `Senior to` | `senior to payments for Common Stock` |
| Trigger mechanism | `automatically convert` | `will automatically convert into shares` |
| Tax threshold | `$130,000 in pay` | `more than $130,000 in pay for the preceding year` |

**NEVER bold a full clause that restates the claim.** Bold only the fact-specific label — the number, entity, tier marker, or trigger verb.

Every citation connects two documents (see `packages/deepcitation/docs/agents/deep-citation-concepts.md`):

- **Domain A** — the asserting document (your report). The `claimText` is what the reader sees bolded or linked.
- **Domain B** — the authoritative document (the evidence). The `sourceMatch` (`k`) is the verbatim phrase the search locates and the `keyholeViewport` frames.

**Format 1 example:** The invoice totals **USD 4,350.00** [1] for services rendered by **Acme Corp** [2] on **March 15, 2024** [3].

**Format 2 example:** The company's [revenue grew](cite:1 '$4.2 million') over the prior year, with [dissolution protections](cite:2 'Dissolution Event') for minority holders.

**Default to the tersest `sourceMatch` that uniquely identifies the evidence.** Then decide whether that same phrase works as `claimText` (Format 1) or whether the prose needs its own phrasing (Format 2). One unique ID per distinct fact.

## Truncation strategies

Canonical strategy is in `packages/deepcitation/docs/agents/deep-citation-standards.md` §2.
The worked examples below are for in-flow reference.

### Quantifier-drop (noun phrases)

- "Junior to payment of outstanding indebtedness and creditor claims" → **outstanding indebtedness** (2w)
- "lower limit is the upper unfinished surface of the concrete ground floor slab" → **unfinished surface** (2w) or **concrete floor slab** (3w)
- "Each parking unit shall be used and occupied only for motor vehicle parking purposes" → **motor vehicle parking** (3w)
- "no motor vehicle which contains a propane or natural gas propulsion system shall be parked" → **natural gas propulsion** (3w)

### Clause-truncation (mechanism and priority text)

Cite the key verb or tier marker, **NOT** the full clause:

- "will automatically convert into the number of shares of Safe Preferred Stock" → **automatically convert** (2w) — cite the trigger verb
- "Investor will automatically be entitled to receive a portion of Proceeds" → **entitled to receive** (3w) — drop subject and object
- "On par with payments for other Safes and/or Preferred Stock" → **On par with** (3w) — tier marker is the claim; the list of co-equal holders is context
- "Senior to payments for Common Stock" → **Senior to** (2w) — priority label is the claim; do NOT quote "for Common Stock"
- "junior to payments described in clauses (i) and (ii) above" → **Junior to** (2w) — priority label only
- "the applicable Proceeds will be distributed pro rata to the Investor" → **pro rata** (2w) — the distribution principle, not the full rule
- "immediately following the earliest to occur of: (i) the issuance of Capital Stock" → **earliest to occur** (3w) or **Capital Stock** (2w)

### Formula, definition, enumeration

Cite the **result or term**, NOT the formula body or definition:

- "Purchase Amount divided by the Discount Price" → **Discount Price** (2w) — cite the result/key term, not the formula
- "Discount Price means the lowest price per share of Standard Preferred Stock" → **Discount Price** (2w) — cite the defined term, not the definition body
- "Safe Price means the price per share equal to the Post-Money Valuation Cap divided by the Company Capitalization" → **Safe Price** (2w)
- "Sections 304, 305, 306, 354, 368, 1036 and 1202 of the Internal Revenue Code" → **Section 304** (2w) or **IRC sections** (2w) — multi-value list: cite the first item or a category label; never quote the whole list
- "pursuant to Sections 83(b), 422 and 423 of the Code" → **Section 83(b)** (2w) — first IRC section

**Common trap for formulas and definitions:** the full formula phrase ("Purchase Amount divided by the Discount Price") feels load-bearing because every word seems necessary. It's not — only the *result term* (the named quantity the clause defines) is the citable fact. The formula body is prose context that belongs outside the anchor.

Pick the 2–3 words that a reader would recognize as the key term — the noun, the distinctive verb trigger, or the priority tier label. For mechanism clauses, the verb phrase (≤2 words) is usually the correct anchor, not the full operative sentence.

### Tax/regulatory value extraction

Cite the **number or threshold**, NOT the surrounding rule:

- "ordinary and necessary expenses incurred while carrying on your trade or business" → **ordinary and necessary** (3w) — the legal test name, not the full definition
- "you can generally deduct only 50% of any otherwise deductible business-related meal expenses" → **50%** (1w) — cite the percentage limit
- "58.5 cents per mile from January 1, 2022, through June 30, 2022" → **58.5 cents per mile** (4w) — cite the rate, drop the effective-date clause
- "Received more than $130,000 in pay for the preceding year" → **$130,000 in pay** (3w) — cite the threshold and its unit
- "$450- if that person is age 40 or younger" → **$450** (1w) — cite the dollar cap, strip trailing punctuation artifacts like the dash; let prose carry the age bracket
- "average annual gross receipts are $27 million or less for the 3 prior tax years" → **$27 million or less** (4w) — cite the receipts threshold
- "the character and amount of responsibility" → **responsibility** (1w) — cite the factor, not the list preamble
- "100% business meal deduction for food or beverages provided by a restaurant" → **100%** (1w) — cite the deduction rate

For tax/regulatory text: dollar amounts, percentages, and named legal tests are the anchors. The qualifying clause ("for the preceding year", "incurred while carrying on") is prose context — it belongs outside the bold marker.

**Common trap — grab the distinctive noun head, not the full regulatory condition:**

- BAD: `**first 5 years of employment**` (5w) → GOOD: `**5 years**` (2w)
- BAD: `**30% of the adjustable taxable income**` (6w) → GOOD: `**adjustable taxable income**` (3w)
- BAD: `**limited by the person's age**` (5w) → GOOD: `**person's age**` (2w)

## Anti-patterns

### Avoid heading-only anchors

If the same short phrase appears as a section heading AND inside the operative sentence, do **not** anchor the heading version — it will verify against the wrong place while still looking superficially correct.

- BAD: "The declaration creates exterior parking units and underground parking units." → **exterior parking units** when the evidence also contains the heading `EXTERIOR PARKING UNITS`
- GOOD: split the claim and anchor the operative clause instead: **underground parking units** or **fifty-nine (59) interior**
- BAD: "Unit 59 must be cleared for hydro vault access." → **hydro vault** when the evidence also contains the heading `Rights of Access to the Hydro Vault`
- GOOD: anchor the action phrase from the rule itself: **remove any vehicle** or **permit access**

### Never cite from index, appendix, or table-of-contents pages

If a dollar amount, form number, or term appears in both the body text and an A–Z index or appendix, always point `p` and `l` at the **body text** page where the operative rule or definition lives. Index entries are page-number references, not evidence — they produce garbage `sourceContext` and fail verification.

- BAD: `"$297"` with `p` pointing to the A–Z index page → sourceContext = "A Club dues 47 F Carrying charge 25..."
- GOOD: `"$297"` with `p` pointing to the per-diem rate table in Chapter 11 → sourceContext = "the per diem rate for high-cost locations will increase to $297..."

### Prefer operative phrases over category labels

A short noun phrase is only valid if it points at the sentence that **proves** the claim. If the noun phrase is just a topic label, choose the verb phrase or distinctive action instead.

- BAD: claim about restrictions → **commercial units** (category only)
- GOOD: **parking requirements** or **no right of access** (operative rule)
- BAD: claim about pet removal timing → **ordinary household pets** (topic only)
- GOOD: **two (2) weeks** or **on a leash** (the actual restriction being proved)

## Common failure modes — trap → fix table

The left column is what the model naturally writes under pressure; the right is the terse correct form.

| Trap (✗) | Fix (✓) | Why |
|---|---|---|
| `sourceMatch` = `"Junior to payment of outstanding indebtedness"` (6w) | `sourceMatch` = `"outstanding indebtedness"` (2w) | The distinctive noun carries the claim — quantifiers and prepositions are filler. Shorter `sourceMatch` = tighter `keyholeViewport`. |
| `claimText` = `**Equity Financing**`, `k` = `"when the company raises capital"` | `claimText` = `**Equity Financing**`, `k` = `"Equity Financing"` (Format 1) | `k` is `sourceMatch` — verbatim Domain B text. The reader clicks `claimText` and sees `sourceMatch` highlighted in the `focusPopover`. They must be connected. |
| `sourceMatch` = `"Tooth Numbers 3 9 14 19 24 30"` (7w) | `sourceMatch` = `"Tooth Numbers"` (2w) | Multi-value fields: cite **one** value. The list is `sourceContext`; the header is the citable `sourceMatch`. |
| `sourceMatch` = `"earliest to occur...prior to"` (ellipsis) | `sourceMatch` = `"earliest to occur"` (3w) | Never use `...` — `sourceMatch` must be a contiguous substring of `sourceContext`. Two pieces = two citations. |
| `sourceMatch` = `"first 5 years of employment"` (5w) | `sourceMatch` = `"5 years"` (2w) | Cite the threshold, drop the qualifying phrase. Prose carries the rest: `within the first **5 years** [3] of employment`. |
| `sourceMatch` = `"30% of the adjustable taxable income"` (6w) | `sourceMatch` = `"adjustable taxable income"` (3w) | Cite the distinctive noun, not the full clause. Prose: `capped at 30% of **adjustable taxable income** [5]`. |
| Existing prose says "the person's age limits deductions" but source says "age of the individual" | Format 2: `[person's age](cite:7 'age of the individual')` | `claimText` uses Domain A's voice, `sourceMatch` uses Domain B's exact words. Neither needs to contort. |
| Prose writes `**fully deductible**` but source says "you can deduct the cost of meals you sell to the public" — "fully deductible" isn't in `f`, so the CoT substring check fails | Format 2: `[fully deductible](cite:N 'deduct the cost')` with `k` = `"deduct the cost"` | When prose summarizes what source states operationally, Format 2 decouples the two voices. |
| Format 2 body `[converts automatically](cite:4 'automatically convert')` but CITATION_DATA has `k` = `"converts automatically"` (the claimText) | Set `k` = `"automatically convert"` (the tick-quoted sourceMatch) | In Format 2, `k` is always the tick-quoted sourceMatch from Domain B — never the prose claimText from Domain A. |
