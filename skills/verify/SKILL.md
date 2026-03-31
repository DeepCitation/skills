---
name: verify
description: Verify AI claims against source documents using the DeepCitation API
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Verify claims against source documents. The skill is a post-hoc auditor —
it verifies what was naturally produced, never shapes content creation.

Three steps: **Prepare → Write → Verify**.

## 0. Triage

Scan `$ARGUMENTS`, conversation history, and working directory:

| Situation | Action |
|-----------|--------|
| `[N]` markers + `<<<CITATION_DATA>>>` already exist in an HTML file | Ensure sources are prepared → `verify --html` (skip to Step 3) |
| Content exists with claims but no citation markers | Prepare sources → write cited markdown → `verify --markdown` |
| `/verify` invoked with a question | Answer naturally first → prepare sources → write cited markdown → `verify --markdown` |
| Nothing to verify | Exit gracefully — tell the user no verifiable content was found |

If multiple sources are present, prepare ALL of them — each produces a separate `attachmentId`.

## 1. Authenticate + Prepare Sources

### Auth

```bash
npx -y deepcitation status || npx -y deepcitation login
```

Skip if `DEEPCITATION_API_KEY` is already set.

### Prepare

Upload **every** source to the DeepCitation API. `prepare` is the **only** way
to read source content — never use OCR, PDF readers, or web fetch.

```bash
# Run all sources in parallel:
npx -y deepcitation prepare source1.pdf --summary &
npx -y deepcitation prepare source2.pdf --summary &
npx -y deepcitation prepare https://example.com/article --summary &
wait
```

`--summary` prints `attachmentId` and `deepTextPromptPortion` to stdout so you
can read them directly — no need to read the JSON file.

Retain both `attachmentId` and `deepTextPromptPortion` — they are needed in Step 2.

When multiple sources exist, launch one Agent subagent per source — all in a
single message so they execute concurrently.

If a URL fails (DNS, 403, auth required), report it clearly and continue with available sources.

## 2. Write Verification Report

Write a **markdown** file with `[N]` citation markers and a `<<<CITATION_DATA>>>`
JSON block at the end. Save as `.deepcitation/draft-{timestamp}.md`.

The CLI handles all HTML conversion, styling, `data-cite` attribute wrapping,
`data-citation-key` annotation, citation drawer trigger insertion, progressive
disclosure structure, keygen, and CDN injection. You just write markdown with
citations.

### What to write

Structure the content with headings, tables, and lists as appropriate.
**Do not change the words of any claim from the original content.** Present the
same claims, only reformatted and structured.

Match the markdown structure to the content. If the source is full of tables and
figures, use markdown tables. If the content is narrative, use paragraphs and lists.
Let the data shape the report.

**Every claim, value, or fact from source documents gets a citation.** If a human
would need to open a source to verify it, cite it.

**Common blind spots:**
- Hidden/collapsed content (accordions, toggles, `display:none` panels)
- Restated values in summaries, banners, or narrative that repeat a value from elsewhere
- Metadata: dates, identifiers, report timestamps in headers/footers
- All views: tabs, timelines, alternate panels — walk every view, not just the default

When in doubt, cite it. Overciting costs nothing; underciting defeats the purpose.

For each cited claim, add `[N]` after the claim text (N is sequential starting from 1):

```markdown
Revenue grew 45% year-over-year to $2.3B [1]. Operating margin improved to 18.5% [2].
```

### Citation data block

At the end of the file, append the citation data. Shorthand keys save tokens:

```
<<<CITATION_DATA>>>
[
  {"n":1,"a":"ATTACHMENT_ID","r":"why this backs the claim","f":"verbatim quote from deepTextPromptPortion","k":"≤4-word key","p":"page_number_N_index_I","l":[LINE_NUMBER]},
  {"n":2,"a":"ATTACHMENT_ID","r":"reason","f":"verbatim quote","k":"key","p":"page_number_N_index_I","l":[LINE_NUMBER]}
]
<<<END_CITATION_DATA>>>
```

Key mapping: `n`=id, `a`=attachment_id, `r`=reasoning, `f`=full_phrase, `k`=anchor_text, `p`=page_id, `l`=line_ids.

Longhand keys also work: `id`, `attachment_id`, `reasoning`, `full_phrase`, `anchor_text`, `page_id`, `line_ids`.

### Citation field rules

- **reasoning** (`r`): Brief explanation connecting the citation to the claim. Comes first — think WHY before WHAT.
- **full_phrase** (`f`): Copy text **verbatim** from the source `deepTextPromptPortion`. Keep to a single line.
- **anchor_text** (`k`): The 1–4 most important words from `full_phrase`. Must be a verbatim substring. Max 4 words / 40 chars. Pick the most specific fragment (number, proper noun, percentage, statute section). This is both an API search term and the user's clickable label.
- **page_id** (`p`): From `<page_number_N_index_I>` tags in `deepTextPromptPortion`. Use format `page_number_N_index_I`.
- **line_ids** (`l`): From `<line id="N">` tags in `deepTextPromptPortion`. See Line IDs section below.

### Anchor text quality

`anchor_text` serves two purposes: (1) the API searches the source for it, and (2) users see it as the clickable citation label. It should reward a click with deeper context, not repeat what's already visible.

| Quality | `full_phrase` | `anchor_text` | Why |
|---------|-------------|--------------|-----|
| Good | "Revenue grew 45% year-over-year to $2.3B" | `$2.3B` | Specific number |
| Good | "The court held that Section 4(b) was unconstitutional" | `Section 4(b)` | Legal reference |
| Good | "Recommended daily sodium intake is 2,300 mg" | `2,300 mg` | Precise value |
| Bad | "Revenue grew 45% year-over-year to $2.3B" | `Revenue grew 45%...` | Too long — repeats visible text |
| Bad | same | `unconstitutional` | Too generic |

The CLI automatically sets display labels when the visible text differs from `anchor_text`,
so you don't need to manage `displayLabel` manually.

### Verbatim quote requirement

`anchor_text` and `full_phrase` must be **verbatim from the source document**
(`deepTextPromptPortion`). The verification API searches for these exact strings.
Never set `anchor_text` to the displayed text to force a match — that is fabricating
evidence. The markdown's displayed text can differ from `anchor_text`.

### Line IDs and page numbers

`line_ids` and `page_id` come from the `deepTextPromptPortion` returned by prepare.

**Page numbers** — extract from the `<page_number_N_index_I>` tag enclosing your
cited text. Use N (the page number), not I (the index). **Always take the page
number from the tag name itself — never from any page number text visible inside
the document.** Printed page numbers (e.g. "Page 3", roman numerals) can differ
from the tag's N value when documents are concatenated or start at a non-zero offset.

Without `page_id`, the API cannot pinpoint the citation precisely — verification
becomes imprecise and cannot be scored as `verified`.

**Line IDs** — the `deepTextPromptPortion` uses `<line id="N">` tags to mark lines.
IDs are sequential. Not every line has an explicit tag — untagged lines fall between
tagged IDs, and you derive their ID by counting:

```
<page_number_1_index_0>
<line id="1">Company Overview</line>
Founded in 2015 as a healthcare technology startup   ← line 2 (untagged)
Headquarters: San Francisco, CA                      ← line 3 (untagged)
<line id="4">Total employees: 1,200</line>
...
<page_number_2_index_1>
<line id="20">Revenue grew 45% year-over-year to $2.3B</line>
Operating margin improved to 18.5%                   ← line 21 (untagged)
<line id="22">Net income: $415M, up from $290M</line>
```

"Founded in 2015" → `"l": [2]` (one after `<line id="1">`).
"Operating margin improved to 18.5%" → `"l": [21]` (one after `<line id="20">`).

An incorrect line ID causes the API to fall back to page-level search, resulting
in an imprecise match.

## 3. Verify

One command does everything — HTML conversion, keygen, annotation, API verification, and CDN runtime injection:

```bash
npx -y deepcitation verify --markdown .deepcitation/draft-{timestamp}.md
```

Options:
```bash
npx -y deepcitation verify --markdown draft.md --audience executive
npx -y deepcitation verify --markdown draft.md --style plain
```

- **`--style report`** (default): Progressive disclosure with verdict banner, collapsible tiers, design tokens.
- **`--style plain`**: Clean minimal HTML for quick fact-checks or embedding.
- **`--audience`**: `general` (default), `executive`, `technical`, `legal`, `medical`.
- **`--theme`**: `auto` (default), `light`, `dark`. Controls popover color scheme.

### If you already have HTML

If the content is already an HTML file with `[N]` markers and `<<<CITATION_DATA>>>`:

```bash
npx -y deepcitation verify --html .deepcitation/existing-report.html
```

The `--html` path also accepts the grouped-by-attachmentId citation format.

### Report results

Confirm the output HTML file exists, count statuses, summarize in chat:
```
12/14 verified ✓ · 2 partial ✓ → .deepcitation/verified-{ts}.html
```

## Invariants

- Use `prepare` for ALL source reading — never OCR, PDF readers, or web fetch
- `full_phrase` and `anchor_text` must be verbatim from the source `deepTextPromptPortion`
- Every claim, value, or fact from a source document gets a citation — no exceptions
- **Anchor text quality**: ≤ 4 words / 40 chars, verbatim substring of `full_phrase`, most specific fragment
- **Model quality**: Smaller models (haiku-class) commonly produce `anchor_text` that is too long or paraphrased. After building citations, validate every `anchor_text`.
- Never export API keys, use `--key` flag, or log key values
- Never render metadata (attachmentId, hashed keys, lineIds) as visible content
- Always "DeepCitation" (never "DeepCite")
- Always produce an HTML artifact — never exit without one

ARGUMENTS: $ARGUMENTS
