# Build Marked HTML

Produce a single self-contained HTML file with `[N]` citation markers, `data-cite="N"` attributes, and a `<<<CITATION_DATA>>>` block. This is the only deliverable.

Always produce HTML -- even for chat Q&A. In chat, summarize the results and link to the HTML for inspection.

## 1. Read sources

Follow [prepare-sources.md](./prepare-sources.md) for every source document. Each produces an `attachmentId` and `deepTextPromptPortion`. Prepare ALL of them -- skipping one means its claims go unverified.

## 2. Identify verifiable claims

Scan the entire content for factual assertions. **Every claim, value, or fact from source documents gets a citation.** If a human would need to open a source to verify it, cite it -- values, dates, names, measurements, findings, percentages, scores, and any restated or summarized content.

**Common blind spots:**
- Hidden/collapsed content (accordions, toggles, `display:none` panels)
- Restated values in summaries or banners (each instance is a separate claim)
- Metadata: dates, identifiers, timestamps in headers/footers
- All views: tabs, timelines, alternate panels -- walk every view

When in doubt, cite it. Overciting costs nothing; underciting defeats the purpose.

## 3. Build the HTML

Structure the content as a self-contained HTML document:
- Follow [report-style.md](./report-style.md) for design tokens, progressive disclosure tiers, and audience presets
- Inline styles or a `<style>` block -- no external CSS
- Group related findings under headings; use tables where appropriate
- Include a title/header and verdict banner describing the topic
- JavaScript is fine — the CDN runtime injects Preact for citation components

Do **not** change the words of any claim from the original content. Present the same claims, only reformatted and structured.

## 4. Mark claims

For each factual claim sourced from an attachment:
1. Add `data-cite="N"` to the element containing the claim
2. Add `[N]` after the claim text

N is a sequential integer starting from 1. Every distinct piece of information gets its own unique number.

### `data-cite="N"` placement rules

Place on the **most specific** element containing the claim:

- **Single value** (`<span>$2.3B</span>`) -- directly on the value element
- **Value + label** (`Revenue: $2.3B`) -- on the value element, not the label
- **Compound claim** (`Revenue grew 45% to $2.3B`) -- on the container holding the full claim
- **Table cells** -- on the `<td>` with the verifiable value
- **List items** -- on the `<li>` or inline element wrapping the claim
- **Never** on wrapper/layout elements (`<div class="card">`, `<section>`)

### Anchor text rules

- **Structured/tabular data**: short anchor text (1-3 words) is fine
- **Narrative prose**: use **5+ word** distinctive anchor text

Examples:
- Good (structured): `full_phrase: "Revenue grew 45% year-over-year to $2.3B"`, `anchor_text: "$2.3B"`
- Good (narrative): `full_phrase: "The court held that Section 4(b) was unconstitutional"`, `anchor_text: "Section 4(b) was unconstitutional"`
- Bad (narrative): `anchor_text: "unconstitutional"` -- too short, often results in `partial_text_found`

### Verbatim quote requirement

`anchor_text` and `full_phrase` must be **verbatim from the source document** (`deepTextPromptPortion`). The verification API searches for these exact strings. Never set `anchor_text` to the HTML's displayed text to force a match -- that is fabricating evidence.

## 5. Append citation data

After `</html>`, add the citation block grouped by `attachmentId`:

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID_FROM_PREPARE": [
    {
      "id": 1,
      "reasoning": "why this source text backs this claim",
      "full_phrase": "verbatim quote from deepTextPromptPortion",
      "anchor_text": "key words from full_phrase",
      "page_id": "page_number_N_index_I",
      "line_ids": [LINE_NUMBER]
    }
  ]
}
<<<END_CITATION_DATA>>>
```

Field order: `reasoning` first (think WHY before WHAT), then `full_phrase`, then `anchor_text`.

For `page_id` and `line_ids` rules, see [line-ids.md](./line-ids.md).

## 6. Save and verify

Save as `.deepcitation/marked-{timestamp}.html`

Save then run `npx -y deepcitation verify --html`
