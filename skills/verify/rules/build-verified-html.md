# Build Verified HTML

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
- Follow [report-style.md](./report-style.md) for progressive disclosure tiers and HTML structure guidance
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

**The attributed element must be inline.** The CDN runtime applies `display: inline-flex` to cited elements and appends a status indicator as a child. If placed on a block element, the indicator lands at the far right of the block instead of beside the anchor text.

Wrap the **anchor text** in an inline `<span>` — never attribute a block element:

```html
<!-- ✓ Correct: span wraps the anchor text inside the paragraph -->
<p>Revenue grew <span data-cite="1">45% year-over-year</span> to $2.3B. [1]</p>

<!-- ✕ Wrong: attribute on the paragraph -->
<p data-cite="1">Revenue grew 45% year-over-year to $2.3B. [1]</p>

<!-- ✕ Wrong: cite element appended after the sentence — duplicates visible text -->
<p>Revenue grew 45% year-over-year to $2.3B. [1] <cite data-cite="1">45% year-over-year</cite></p>
```

- **Existing inline element** (`<span>$2.3B</span>`) -- add `data-cite` directly
- **Text inside a block** -- wrap the anchor text in `<span data-cite="N">`
- **Table cells** -- wrap the anchor text inside the `<td>` in a `<span>`
- **List items** -- wrap the anchor text inside the `<li>` in a `<span>`
- **Never** on block/layout elements (`<div>`, `<p>`, `<td>`, `<li>`, `<section>`)

### Anchor text — concise label, not a summary

`anchor_text` serves two purposes:
1. **Verification**: The API searches the source for this exact string
2. **UI label**: Users see it as the clickable citation label — it should reward a click with deeper context, not repeat what's already visible

**Hard constraints:**
- Maximum 4 words / 40 characters
- Must be a verbatim substring of `full_phrase`
- Must be the most specific, information-dense fragment (a number, proper noun, percentage, date, statute section — not generic verbs or adjectives)

**The progressive disclosure test:** If the user can already see the claim on the page, `anchor_text` should be the part that makes them curious — "where exactly does this come from?" A good `anchor_text` is a keyhole into the source document.

| Quality | `full_phrase` | `anchor_text` | Why |
|---------|-------------|--------------|-----|
| Good | "Revenue grew 45% year-over-year to $2.3B" | `$2.3B` | Specific number — click reveals source context |
| Good | "The court held that Section 4(b) was unconstitutional" | `Section 4(b)` | Legal reference — click shows the court's reasoning |
| Good | "Recommended daily sodium intake is 2,300 mg" | `2,300 mg` | Precise value — click reveals the guideline source |
| Good | "Form 1040 Schedule C line 31" | `Schedule C line 31` | Specific form reference |
| Bad | "Revenue grew 45% year-over-year to $2.3B" | `Revenue grew 45% year-over-year to $2.3B` | Repeats full_phrase — adds nothing |
| Bad | same | `unconstitutional` | Too generic — appears in many contexts |
| Bad | same | `the revenue was about two point three billion` | Paraphrased — not verbatim, will fail API match |

**If `anchor_text` exceeds 40 characters or 4 words, shorten it.** Find the most distinctive substring.

### Verbatim quote requirement

`anchor_text` and `full_phrase` must be **verbatim from the source document** (`deepTextPromptPortion`). The verification API searches for these exact strings. Never set `anchor_text` to the HTML's displayed text to force a match -- that is fabricating evidence.

The HTML element's text content acts as the display label — it can differ from `anchor_text`. The CDN runtime (`window.DeepCitationPopover.init()`) binds to `data-citation-key` attributes and does not compare the element text against `anchor_text`. Only the verification API uses `anchor_text` for source matching.

Example: a source says `"$0.00"` but your HTML displays "Free":

```html
<span data-cite="3">Free [3]</span>
```
```json
{ "id": 3, "anchor_text": "$0.00", "full_phrase": "Base plan is $0.00 per month" }
```

`anchor_text` stays verbatim (`"$0.00"`) while the HTML shows whatever is clearest to the reader.

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
      "anchor_text": "most specific ≤4-word substring",
      "page_id": "page_number_N_index_I",
      "line_ids": [LINE_NUMBER]
    }
  ]
}
<<<END_CITATION_DATA>>>
```

Field order: `reasoning` first (think WHY before WHAT), then `full_phrase`, then `anchor_text`.

For `page_id` and `line_ids` rules, see [line-ids.md](./line-ids.md).

### Source download URLs

For each attachment group in the citation data, include the source's download URL so the verified report can offer a download button in the popover header:

- **URL sources** prepared with `deepcitation prepare <url>`: use the original URL
- **Local file sources**: omit (no remote URL available)

The `verify` command propagates `downloadUrl` into the verification response per-citation. The CDN popover header shows a download icon (revealed on hover) when a download URL is present.

## 6. Citation drawer trigger

Place an empty `<div data-dc-drawer-trigger></div>` where readers should be able to browse all citations (footer, sources section, sidebar). The CDN runtime renders a `CitationDrawerTrigger` (status icons + source label + chevron) into it automatically.

```html
<!-- Place near the end of the report, before </body> -->
<div data-dc-drawer-trigger></div>
```

No `onclick`, no inline styles, no button markup needed — the CDN handles everything.

**Where to place it** — use your judgement:
- **Bottom of page / footer area**: after the last content section
- **Sidebar / navigation area**: within the nav section
- **Tab content area** (e.g. "All Files" tab): at top or bottom of the tab content
- **Source/reference sections**: beside or within bibliography/sources areas

Multiple containers are supported — each renders its own trigger.

## 7. Save and verify

Save as `.deepcitation/verified-{timestamp}.html`

Save then run `npx -y deepcitation verify --html .deepcitation/verified-{timestamp}.html`
