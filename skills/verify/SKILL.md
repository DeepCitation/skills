---
name: verify
description: Verify AI claims against source documents using the DeepCitation API
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Verify claims against source documents. The skill is a post-hoc auditor —
it verifies what was naturally produced, never shapes content creation.

Three steps: **Prepare → Write → Verify**.

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
can read them directly from the bash output — no need to read the JSON file.

Without `--summary`, read the output JSON to get `deepTextPromptPortion`:
```bash
npx -y deepcitation prepare source.pdf
# then Read .deepcitation/prepare-source.json
```

Retain both `attachmentId` and `deepTextPromptPortion` — they are needed in Step 2.

If a URL fails (DNS, 403, auth required), report it clearly and continue with available sources.

## 2. Write Verification Report

Write a **markdown** file with `[N]` citation markers and a `<<<CITATION_DATA>>>` JSON block at the end. Save as `.deepcitation/draft-{timestamp}.md`.

The CLI handles all HTML conversion, styling, `data-cite` attribute wrapping, progressive disclosure structure, keygen, annotation, and CDN injection. You just write markdown with citations.

### What to write

If `/verify` was invoked alongside a question, answer naturally first (no citation formatting), then write the verification report for the claims you produced.

Structure the content with headings, tables, and lists as appropriate. **Do not change the words of any claim from the original content.** Present the same claims, only reformatted and structured.

### Choosing plain vs report style

The CLI supports two styles via `--style`:

- **`report`** (default): Progressive disclosure with DeepCitation design tokens — verdict banner, collapsible tiers, Inter + Source Code Pro typography. Use for comprehensive document analysis, multi-source verification, practitioner briefs.
- **`plain`**: Clean minimal HTML. Use for quick fact-checks, single-question verifications, or when the output will be embedded in another page.

### Citation rules

**Every claim, value, or fact from source documents gets a citation.** If a human would need to open a source to verify it, cite it.

For each cited claim, add `[N]` after the claim text (N is sequential starting from 1):

```markdown
Revenue grew 45% year-over-year to $2.3B [1]. Operating margin improved to 18.5% [2].
```

At the end of the file, append the citation data grouped by `attachmentId`:

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID_FROM_PREPARE": [
    {
      "id": 1,
      "reasoning": "why this source text backs this claim",
      "full_phrase": "verbatim quote from deepTextPromptPortion",
      "anchor_text": "most specific ≤4-word substring",
      "page_id": "page_number_N_index_I",
      "line_ids": [LINE_NUMBER]
    }
  ]
}
<<<END_CITATION_DATA>>>
```

Shorthand keys save tokens: `n`=id, `r`=reasoning, `f`=full_phrase, `k`=anchor_text, `p`=page_id, `l`=line_ids.

### Citation field rules

- **reasoning**: Brief explanation connecting the citation to the claim. Comes first — think WHY before WHAT.
- **full_phrase**: Copy text **verbatim** from the source `deepTextPromptPortion`. Keep to a single line — multi-line values degrade to `partial_text_found`.
- **anchor_text**: The 1-4 most important words from `full_phrase`. Must be a verbatim substring. Max 4 words / 40 chars. Pick the most specific fragment (number, proper noun, percentage, statute section). This is both an API search term and the user's clickable label.
- **page_id**: From `<page_number_N_index_I>` tags in `deepTextPromptPortion`. Use format `page_number_N_index_I`.
- **line_ids**: From `<line id="N">` tags in `deepTextPromptPortion`. IDs are **sparse and non-sequential**. Use the nearest tagged line. If text spans multiple tagged lines, include all.

**pageNumber is REQUIRED** — omitting it causes the API to reject the entire batch for that attachment.

### Verbatim quote requirement

`anchor_text` and `full_phrase` must be **verbatim from the source document**. Never set `anchor_text` to the displayed text to force a match — that is fabricating evidence. The markdown's displayed text can differ from `anchor_text`.

## 3. Verify

One command does everything — HTML conversion, keygen, annotation, API verification, and CDN runtime injection:

```bash
npx -y deepcitation verify --markdown .deepcitation/draft-{timestamp}.md
```

Options:
```bash
# Audience preset (general, executive, technical, legal, medical):
npx -y deepcitation verify --markdown draft.md --audience executive

# Plain style instead of report:
npx -y deepcitation verify --markdown draft.md --style plain

# Custom theme and output path:
npx -y deepcitation verify --markdown draft.md --theme dark --out report.html
```

### If you already have HTML

If the content is already an HTML file with `[N]` markers and `<<<CITATION_DATA>>>`:

```bash
npx -y deepcitation verify --html .deepcitation/existing-report.html
```

### Report results

In chat, summarize the results and link to the HTML:
```
12/14 verified · 2 partial → .deepcitation/verified-{ts}.html
```

Always produce an HTML artifact — never exit without one.

## Invariants

- Use `prepare` for ALL source reading — never OCR, PDF readers, or web fetch
- `full_phrase` and `anchor_text` must be verbatim from the source `deepTextPromptPortion`
- Every claim, value, or fact from a source document gets a citation — no exceptions
- Never export API keys, use `--key` flag, or log key values
- Never render metadata (attachmentId, hashed keys, lineIds) as visible content
- Always "DeepCitation" (never "DeepCite")
- Always produce an HTML artifact — never exit without one

ARGUMENTS: $ARGUMENTS
