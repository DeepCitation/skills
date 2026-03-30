# Annotate HTML

After building citations and generating keys, annotate the HTML with `data-citation-key` attributes and build a key map for the CDN runtime.

## Place `data-citation-key` attributes

Use human-readable keys from `citations.json` (e.g., `cite-revenue`), NOT hashed keys. The CDN runtime resolves these via the key map.

**The attributed element must be inline** — the CDN runtime applies `display: inline-flex` to `[data-citation-key]` elements and appends a status indicator as a child. If placed on a block element (`<div>`, `<p>`, `<td>`), the indicator lands at the far right instead of beside the anchor text.

### Wrapping rule

Wrap the **anchor text** (the specific phrase being verified — typically ≤ 4 words) in an inline `<span>`, not the entire claim or its container:

```html
<!-- ✓ Correct: inline span around the anchor text -->
<p>Revenue grew <span data-citation-key="cite-revenue">45% year-over-year</span> to $2.3B.</p>

<!-- ✕ Wrong: attribute on the block element -->
<p data-citation-key="cite-revenue">Revenue grew 45% year-over-year to $2.3B.</p>

<!-- ✕ Wrong: div is a block element — use <span> instead -->
<div class="stat-value" data-citation-key="cite-revenue">$2.3B</div>
<!-- ✓ Fix: <span class="stat-value" data-citation-key="cite-revenue">$2.3B</span> -->
```

### Placement rules

- **Inline value** (e.g. `<span class="stat-value">$2.3B</span>`) → directly on the existing inline element
- **Value inside block** (e.g. `<p>Revenue grew 45%</p>`) → wrap the anchor text in `<span data-citation-key="...">`
- **Table cells** → wrap the anchor text inside the `<td>` in a `<span>`, not on the `<td>` itself
- **List items** → wrap the anchor text inside the `<li>` in a `<span>`
- **Never** on block/layout elements (`<div>`, `<p>`, `<td>`, `<section>`, `<li>`)

The CDN runtime appends a small status indicator icon next to each annotated element, inheriting the element's font size.

Write the annotated HTML to `.deepcitation/annotated-{timestamp}.html`.

## Build the key map

After running `keygen`, build a key-map JSON mapping human-readable keys to hashed keys:

```json
{
  "cite-revenue": "bfd6ec10bd261161",
  "cite-margin": "a3f7b2c1d8e9f012"
}
```

Build this by comparing `citations.json` keys with `citations-keyed.json` keys. Save as `.deepcitation/key-map-{timestamp}.json`.

## Download URLs

For each source, include a `downloadUrl` in the verification data so the popover can render a download button:

- **URL sources**: Use the original URL (e.g., `"downloadUrl": "https://example.com/report.pdf"`)
- **Local files**: omit — no remote URL is available
- **Prepared sources**: The `prepare` response's source URL is the download URL

The CDN popover header displays a download icon (revealed on hover) when `downloadUrl` is present.

## Citation drawer trigger

The CDN runtime automatically renders a `CitationDrawerTrigger` + `CitationDrawer` into any element with `data-dc-drawer-trigger`. The trigger shows per-citation status icons, the source label (auto-derived from verification data), and opens a full drawer on click.

Place an empty container where citation navigation should appear:

```html
<div data-dc-drawer-trigger></div>
```

No `onclick`, no inline styles, no button markup needed — the CDN handles everything.

**Where to place it** — use your judgement:
- **Bottom of page / footer area**: after the last content section
- **Sidebar / navigation area**: within the nav section
- **Tab content area** (e.g. "All Files" tab): at top or bottom of the tab content
- **Source/reference sections**: beside or within bibliography/sources areas

Multiple `data-dc-drawer-trigger` containers are supported — each renders its own trigger.
