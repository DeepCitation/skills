# Verify and Inject

## Verify citations

The CLI handles grouping by `attachmentId` and merging responses automatically:

```bash
npx -y deepcitation verify \
  --citations .deepcitation/citations-keyed-{timestamp}.json \
  --out .deepcitation/verify-response-{timestamp}.json
```

Use the same `{timestamp}` as the rest of this run's artifacts. Contains verification statuses and evidence images.

Also save the extracted citations as `.deepcitation/citations-{timestamp}.json` — the `CitationRecord` (object keyed by citation key, NOT an array).

## Deliver results — HTML or markdown

After verification completes, deliver results in the appropriate format (see SKILL.md "Final deliverable" for when to use which):

### Option 1: Inject into HTML (preferred)

When an HTML artifact exists or was generated, inject the CDN runtime to produce the final deliverable.

This requires an annotated HTML file with `data-citation-key` attributes and a key-map. If you don't have these yet, go back to [annotate-html.md](./annotate-html.md) and build them first.

```bash
npx -y deepcitation inject \
  --html .deepcitation/annotated.html \
  --verify-response .deepcitation/verify-response.json \
  --key-map .deepcitation/key-map.json \
  --out .deepcitation/injected.html
```

The `--key-map` flag embeds a `<script id="dc-key-map">` block that the CDN runtime uses to resolve human-readable `data-citation-key` values to hashed keys at runtime.

This injects before `</body>`:
- Verification JSON (`<script id="dc-data">`)
- The CDN runtime bundle (Preact + React popover components + Tailwind CSS)
- Auto-init script that resolves human-readable `data-citation-key` values to hashed keys via the key map, then wires up click handlers

## Customize the auto-init (variant & indicator)

The injected auto-init script calls `window.DeepCitationPopover.init({...})`. After injection, you can edit the init call in the output HTML to pass additional options. Choose a **variant** (how the citation wraps the claim text) and an **indicator** (the small status icon).

### Citation variants

| Variant | Description | Best for |
|---------|-------------|----------|
| `text` | Plain text, inherits surrounding styling | Default — blends into any layout |
| `linter` | Inline text with semantic underline (green/yellow/red) | Reports where you want subtle inline highlighting |
| `chip` | Pill/badge with neutral gray background | Dashboards, structured data |
| `brackets` | `[text ✓]` with brackets around the claim | Academic or legal documents |
| `superscript` | Small raised footnote-style marker `[1]` after claim | Traditional footnote style |
| `footnote` | Clean footnote number marker | Formal reports |
| `block` | Sharp, square-bordered inline box | Technical documents |

### Status indicators

| Indicator | Description |
|-----------|-------------|
| `icon` | Check mark (✓) or X — **default** |
| `dot` | Small colored circle (green/yellow/red) |
| `caret` | Dropdown caret arrow |
| `none` | No indicator (popover still works on click) |

### How to customize

After running `inject`, edit the auto-init `<script>` in the output HTML:

```html
<!-- Default (text variant, icon indicator) -->
<script>window.DeepCitationPopover&&window.DeepCitationPopover.init({theme:"auto"});</script>

<!-- Customized (linter variant, dot indicator) -->
<script>window.DeepCitationPopover&&window.DeepCitationPopover.init({theme:"auto",variant:"linter",indicatorVariant:"dot"});</script>
```

Pick the variant and indicator that best match the report's style. If unsure, `text` + `icon` (the defaults) work well for most reports.

### Option 2: Markdown with inline indicators (fallback)

When the context is pure chat/markdown with no HTML artifact, report verification results inline. After running `npx -y deepcitation verify`, parse `verify-response.json` and present results as:

1. **Inline indicators** — restate each claim with a status indicator:
   - `✓` — `found` (exact match in source)
   - `⚠` — `partial_text_found`, `found_anchor_text_only`, or `found_on_other_page`
   - `✗` — `not_found`

   Example:
   ```
   Revenue grew 45% year-over-year to $2.3B ✓
   The company plans to expand into 12 new markets ✗
   Operating margin improved to 28.5% ⚠ (found on different page)
   ```

2. **Citation status summary** — end with a table:
   ```
   | # | Claim | Status | Source | Page |
   |---|-------|--------|--------|------|
   | 1 | Revenue grew 45% YoY to $2.3B | ✓ found | quarterly-results.pdf | 2 |
   | 2 | Expand into 12 new markets | ✗ not_found | quarterly-results.pdf | — |
   | 3 | Operating margin improved to 28.5% | ⚠ found_on_other_page | quarterly-results.pdf | 5→8 |
   ```

This format gives the user full visibility into what was verified and what wasn't, without requiring an HTML artifact.

## Keep metadata out of the report

The HTML report is for end users. **Never render internal metadata as visible content** — this includes `attachmentId`, hashed citation keys, `lineIds`, `pageNumber`, `page_id`, and raw JSON structures. These belong in JSON artifacts and `data-` attributes only.

The user should see claims and their verification status (via the variant/indicator UI), not API internals. Only surface metadata in the report if the user explicitly requests it.

## Validate before declaring done

Do not tell the user the report is ready until you've checked the resolution chain. Use the timestamped filenames from this run:

1. Count `data-citation-key` elements in the annotated HTML
2. Count key-map entries
3. Count verifications and their statuses (found / partial / not_found)
4. Check for orphans (data-citation-key values with no key-map entry) and missing verifications (key-map entries with no verification result)

If orphans or missing verifications are found, fix them before injecting.

**Then open the result:**
```bash
ls -t .deepcitation/*.html | head -1 | xargs open   # macOS
ls -t .deepcitation/*.html | head -1 | xargs xdg-open  # Linux
```

## Mandatory completion — no silent exits

Every `/verify` invocation MUST reach this file and produce output. If you find cached `.deepcitation/prepare-*.json` files, that does NOT mean verification is complete — `prepare` only extracts content. You must still:

1. Build citations (Step 2)
2. Run `npx -y deepcitation verify` (this step)
3. Deliver results — inject into HTML (Option 1) or output markdown with indicators (Option 2)

Never exit silently or assume cached artifacts mean the job is done. If HTML injection fails for any reason, fall back to Option 2 (markdown with inline indicators and summary table).

## Verification status reference

| Status | Display | Meaning |
|--------|---------|---------|
| `found` | ✓ Verified | Exact match in source |
| `partial_text_found` | ⚠ Partial | Full phrase found, anchor text missed |
| `found_anchor_text_only` | ⚠ Partial | Only anchor text matched |
| `found_on_other_page` | ⚠ Partial | Found on different page |
| `not_found` | ✗ Not Found | Could not verify |
