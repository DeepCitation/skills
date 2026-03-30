# Build Citations

**Every claim, value, or fact from source documents gets a citation.** This applies to ALL paths below. If a human would need to open a source document to verify it, cite it. This includes values, dates, names, measurements, findings, diagnoses, reference ranges, percentages, scores, and any restated or summarized content. Underciting defeats the purpose — when in doubt, cite it.

This step depends on what the [analyze-input](./analyze-input.md) step found.

## Path A: Existing cited output with `<<<CITATION_DATA>>>`

Skip this step — go directly to verification.

## Path B: Existing HTML with claims but no citation markers

### 1. Identify and prepare ALL source files

Read the HTML and extract every referenced source document from `href` attributes, inline references, data attributes, and link text. Resolve relative paths against the HTML file's location.

Prepare ALL of them — not just one. Each produces a separate `attachmentId` + `deepTextPromptPortion`. Deduplicate identical files, but never skip a unique source.

### 2. Identify verifiable claims — exhaustive coverage

Scan the **entire** HTML for factual assertions. Every uncited claim is something the user still has to verify manually.

**What to cite:** Every claim, value, or fact from attachments. If a human would need to open a source document to verify it, cite it. This includes values, dates, names, measurements, findings, diagnoses, reference ranges, and any restated or summarized content.

**Common blind spots:**

1. **Hidden/collapsed content.** Accordions, toggles, `display:none` panels — all values inside need citations.
2. **Restated values.** Summaries, banners, or narrative that repeats a value from elsewhere — each instance is a separate claim.
3. **Metadata.** Dates, identifiers, report timestamps in headers/footers.
4. **All views.** Tabs, timelines, alternate panels — walk every view, not just the default.
5. **Source/reference areas.** If the HTML has a references section, file list, or source links, add a citation drawer trigger there (see [annotate-html.md](./annotate-html.md)).

**Signals that something needs a citation:**
- It's a value (number, measurement, percentage, date, score)
- There are citation links nearby (e.g. `<a href="report.pdf">`)
- It restates or summarizes source document content
- A human would need to open a PDF to verify it

When in doubt, cite it — overciting costs nothing, underciting defeats the purpose. After citation generation, spawn a subagent to audit coverage: walk every section and confirm all facts, sources, names, dates, and values have deepcitations.

**Walk every section explicitly.** After building your initial list, enumerate every `<h2>` section and count citations per section. Any section with zero citations means the user has to check it manually.

**Multi-source awareness.** A single HTML page often draws from many sources. Each claim must be traced to its specific source document. Follow the proximity of `href` links as a signal for which source backs which claims.

### 3. Build citation data

Create a citation record mapping each claim to its source. Each citation must use the `attachmentId` of the specific source document that backs it.

For lineIds and pageNumber rules, read [line-ids.md](./line-ids.md).

For each claim, add `data-cite="N"` to the element containing the claim and `[N]` after the claim text (N is a sequential integer starting from 1). Then append a `<<<CITATION_DATA>>>` block after `</html>`:

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID_FROM_STEP_1": [
    {
      "id": 1,
      "reasoning": "why this source text backs this claim",
      "full_phrase": "Revenue grew 45% year-over-year to $2.3B",
      "anchor_text": "$2.3B",
      "page_id": "page_number_2_index_0",
      "line_ids": [20]
    }
  ]
}
<<<END_CITATION_DATA>>>
```

Save as `.deepcitation/marked-{timestamp}.html`.

**Anchor text — concise label, not a summary.** `anchor_text` serves two purposes:

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
| Bad | "Revenue grew 45% year-over-year to $2.3B" | `Revenue grew 45% year-over-year to $2.3B` | Repeats full_phrase — adds nothing on click |
| Bad | same | `unconstitutional` | Too generic — appears in many contexts |
| Bad | same | `the revenue was about two point three billion` | Paraphrased — not verbatim, will fail API match |

**If `anchor_text` exceeds 40 characters or 4 words, shorten it.** Find the most distinctive substring.

Keep `full_phrase` to a single line from the `deepTextPromptPortion` — multi-line values often degrade to `partial_text_found`.

**`anchor_text` and `full_phrase` must be verbatim from the source document (`deepTextPromptPortion`).** The verification API searches the source for these exact strings. **Always cite using source text as `anchor_text`** — even when the HTML displays a different value. The popover shows the user the verification status, surrounding context, and variant matches the API attempted. A ⚠ or ✗ next to a claim is more useful than no indicator at all.

Never:
- Set `anchor_text` to the HTML's displayed text to force a match — that's fabricating evidence
- Add interpretive text or annotations near cited elements — the popover is the sole visual signal
- Assume a value in the HTML matches the source without checking the `deepTextPromptPortion`

### 4. Verify

```bash
npx -y deepcitation verify --html .deepcitation/marked-{timestamp}.html
```

One command handles keygen, annotation, verification, and CDN injection. For finer control over individual steps, see [verify-and-inject.md](./verify-and-inject.md).

## Path D: Chat to verified output

Load [chat-to-html.md](./chat-to-html.md). The agent clones chat content into HTML with `[N]` markers, `data-cite="N"` attributes, and `<<<CITATION_DATA>>>`, then runs `deepcitation verify` which handles keygen + verify + inject in one shot.

**Path D vs Path C:**
- **Path D**: Content already exists (prior chat, existing HTML). Clone it, mark claims, run `verify`. Never alter the original claim text — only add markers and restructure layout.
- **Path C**: New content from scratch. The LLM generates inline with markers (same format, but part of the generation, not post-hoc).

Both paths use the same `[N]` + `<<<CITATION_DATA>>>` format. Both end with `deepcitation verify` for the mechanical pipeline.

## Path C: Generate new cited response from scratch

You ARE the LLM. Read the canonical citation format spec:

```bash
DC_ROOT="$(node -e "console.log(require('path').resolve(require('path').dirname(require.resolve('deepcitation')), '..'))")"
cat "$DC_ROOT/docs/prompts/citation-format.md"
```

This is the single source of truth for field rules, format, and examples.

1. Read the `deepTextPromptPortion` from the saved prepare JSON
2. Read the citation format spec from the deepcitation package (see above)
3. Generate your response as HTML with:
   - `data-cite="N"` on elements containing claims
   - `[N]` markers after each claim sourced from the documents — **every claim, value, or fact from attachments gets a sequential integer marker like [1], [2], [3] at the end of the claim. Each distinct piece of information needs its own unique marker number.**
   - A `<<<CITATION_DATA>>>` block at the end with structured citation metadata grouped by `attachmentId`

**Think out loud** for each citation — reason about which document, page, and line supports the claim before placing the marker.

`page_id` and `line_ids` MUST come from the `deepTextPromptPortion` — see [line-ids.md](./line-ids.md).

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID_FROM_STEP_1": [
    {
      "id": 1,
      "reasoning": "why this citation is correct",
      "full_phrase": "exact verbatim quote from source",
      "anchor_text": "1-3 key words from the phrase",
      "page_id": "page_number_N_index_I",
      "line_ids": [LINE_NUMBER]
    }
  ]
}
<<<END_CITATION_DATA>>>
```

4. Save as `.deepcitation/marked-{timestamp}.html`
5. Run `npx -y deepcitation verify --html .deepcitation/marked-{timestamp}.html`

The `verify` command handles the rest — no need to manually extract citations, run keygen, annotate, or inject.
