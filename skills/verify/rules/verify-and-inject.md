# Verify and Inject

## Preferred: `deepcitation verify --html` (one-shot)

If the HTML has `[N]` markers, `data-cite="N"` attributes, and a `<<<CITATION_DATA>>>` block, use the one-shot command instead of the steps below:

```bash
npx -y deepcitation verify --html .deepcitation/marked-{timestamp}.html
```

This handles keygen, annotation, verification (~0.5s), and injection in a single command. The separate steps below are only needed when you require finer control.

## Verify citations (manual path)

The CLI handles grouping by `attachmentId` and merging responses automatically:

```bash
npx -y deepcitation verify \
  --citations .deepcitation/citations-keyed-{timestamp}.json \
  --out .deepcitation/verify-response-{timestamp}.json
```

Use the same `{timestamp}` as the rest of this run's artifacts. Contains verification statuses and evidence images.

Also save the extracted citations as `.deepcitation/citations-{timestamp}.json` — the `CitationRecord` (object keyed by citation key, NOT an array).

## Deliver results — always HTML

After verification completes, the HTML file with injected CDN runtime is the deliverable. In chat, summarize the results and link to the HTML file for inspection:

```
12/14 citations verified ✓ · 2 partial ⚠
→ .deepcitation/verified-{timestamp}.html
```

### Manual inject (fine control only)

When using the separate commands instead of `verify --html`, inject the CDN runtime manually.

This requires an annotated HTML file with `data-citation-key` attributes and a key-map.

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

## Keep metadata out of the report

The HTML report is for end users. **Never render internal metadata as visible content** — this includes `attachmentId`, hashed citation keys, `lineIds`, `pageNumber`, `page_id`, and raw JSON structures. These belong in JSON artifacts and `data-` attributes only.

The user should see claims and their verification status (via the variant/indicator UI), not API internals. Only surface metadata in the report if the user explicitly requests it.

## Validate before declaring done

Do not tell the user the report is ready until you've confirmed:

1. The output HTML file was produced (check `.deepcitation/` for the latest `*.html`)
2. Open the HTML and verify `data-citation-key` attributes are present on cited elements
3. Count verifications and their statuses (found / partial / not_found)

If using the manual path, also check for orphans (data-citation-key values with no key-map entry) and missing verifications.

**Then open the result:**
```bash
ls -t .deepcitation/*.html | head -1 | xargs open   # macOS
ls -t .deepcitation/*.html | head -1 | xargs xdg-open  # Linux
```

## Mandatory completion — no silent exits

Every `/verify` invocation MUST produce an HTML artifact. In chat, summarize results and link to the file. Never exit silently.

## Verification status reference

| Status | Display | Meaning |
|--------|---------|---------|
| `found` | ✓ Verified | Exact match in source |
| `partial_text_found` | ⚠ Partial | Full phrase found, anchor text missed |
| `found_anchor_text_only` | ⚠ Partial | Only anchor text matched |
| `found_on_other_page` | ⚠ Partial | Found on different page |
| `not_found` | ✗ Not Found | Could not verify |
