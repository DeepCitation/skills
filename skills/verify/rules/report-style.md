# Report Style

Self-contained HTML with inline `<style>`. The CLI injects the CDN runtime
(Preact popovers, status indicators, theme tokens) — you only need to produce
clean semantic HTML with `[N]` citation markers and a `<<<CITATION_DATA>>>` block.

## Progressive Disclosure

Structure every report in three tiers using native `<details>/<summary>`.

### Tier 1 — Verdict (always visible)

Title, date, verdict banner, 3-5 key findings. This is the "executive scan."

```html
<header>
  <h1>Report Title</h1>
  <p class="meta">Source: document.pdf · 2026-03-28</p>
</header>
<section class="findings">
  <h2>Key Findings</h2>
  <ul><!-- 3-5 bullets summarizing the most important cited claims --></ul>
</section>
```

### Tier 2 — Full Report (open by default)

The main claim-by-claim body, grouped by topic under `<h2>` headings.
Tables, lists, and paragraphs with `data-cite="N"` and `[N]` markers.

### Tier 3 — Deep Detail (collapsed)

Wrap in `<details>` (closed by default):
- Source document listing (names, page counts, preparation IDs)
- Methodology notes
- Per-citation reasoning breakdown
- Raw supplementary data

```html
<details>
  <summary>Source Documents & Methodology</summary>
  <table><!-- source docs, page counts --></table>
</details>
```

## Good HTML Rules

- Use semantic elements (`<header>`, `<section>`, `<table>`, `<details>`)
- No external CSS or Tailwind — inline `<style>` only for layout
- Keep layout minimal; the CLI owns colors, typography, and citation styling
- No serif fonts. No Playfair Display.
- Sharp corners (`border-radius: 0`) — verification is rigid, not soft

## Presenting Content Well

Match the HTML structure to the content. If the source is full of tables and
figures, use `<table>` elements — don't flatten everything into prose. If the
content is narrative, use paragraphs and lists. Let the data shape the report.

### Anchor text

`anchor_text` should read naturally in the flow of the sentence. Choose
the most specific fragment (a number, proper noun, statute section) that
also works as a good API search term. The CLI automatically sets display
labels when the visible text differs from `anchorText`, so you don't need
to manage `displayLabel` manually.
