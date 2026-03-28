# Report Style

Self-contained HTML with inline `<style>`. No external CSS, no Tailwind.
JavaScript is fine — the CDN runtime injects Preact for citation popovers.

## Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| paper-white | `#FDFBF7` | Page background |
| zinc-900 | `#18181B` | Primary text |
| zinc-600 | `#52525B` | Secondary text |
| zinc-400 | `#A1A1AA` | Muted text, placeholders |
| zinc-200 | `#E4E4E7` | Borders, rules |
| zinc-100 | `#F4F4F5` | Alternate section background |
| white | `#FFFFFF` | Cards, elevated surfaces |
| accent-blue | `#3B82F6` | Links only — not decoration |
| verified | `#10B981` | bg: `rgba(16,185,129,0.1)` |
| hallucinated | `#EF4444` | bg: `rgba(239,68,68,0.1)` |
| partial | `#D97706` | bg: `rgba(217,119,6,0.1)` |

Neutrals carry 90% of visual weight. Blue is for links. Status colors for
verification states only.

### Typography

```css
font-family: "Inter", system-ui, sans-serif;  /* body + headings */
font-family: "Source Code Pro", monospace;     /* metrics, IDs, counts */
```

| Element | Size | Weight |
|---------|------|--------|
| Report title | 24px | 600 |
| Section heading | 18px | 600 |
| Body | 16px / 1.6 | 400 |
| Small / meta | 14px | 400 |
| Mono metrics | 14px | 500 |

No serif fonts in reports. No Playfair Display.

### Shape

`border-radius: 0` on everything (sharp corners — verification is rigid, not soft).

## Progressive Disclosure

Structure every report in three tiers using native `<details>/<summary>`.

### Tier 1 — Verdict (always visible)

Title, date, verdict banner, 3-5 key findings. This is the "executive scan."

```html
<header>
  <h1>Report Title</h1>
  <p class="meta">Source: document.pdf · 2026-03-28</p>
</header>
<div class="verdict">
  <span class="v-found">■ 25 verified</span>
  <span class="v-partial">■ 4 partial</span>
  <span class="v-miss">■ 2 not found</span>
</div>
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

## Audience Presets

Parse from `$ARGUMENTS`: `--audience <preset>` or infer from context.
Default: `general`.

| Preset | Width | Tier 2 | Tier 3 | Variant | Indicator | Tone |
|--------|-------|--------|--------|---------|-----------|------|
| `general` | 960px | open | collapsed | `text` | `icon` | Balanced, plain language |
| `executive` | 720px | collapsed | collapsed | `footnote` | `icon` | Confident, no jargon, "confirmed" not "verified" |
| `technical` | 960px | open | open | `linter` | `dot` | Precise, mono metrics, match-status table |
| `legal` | 840px | open | open | `brackets` | `icon` | Formal register, sequential numbering, "The source states…" |
| `medical` | 840px | open | collapsed | `linter` | `dot` | Clinical: Findings → Assessment → Plan structure |

### Preset details

**executive** — Verdict banner is the hero. Findings as numbered plain-language
bullets. Claim tables collapsed. No code blocks or raw data. Narrower width.

**technical** — Full metrics visible. Include a match-status breakdown table
(found / partial / not_found counts and percentages). Source details open.
Per-citation status in monospace.

**legal** — Every claim on its own numbered line. Source provenance section
open (document title, date, article/section references). Formal: "The
declaration provides at Article 5.02…" not "We found that…". Brackets
make citation markers explicit.

**medical** — Structure as Findings → Assessment → Plan. Clinical language.
Tables for lab values / measurements. Findings section uses `linter` underlines
for inline verification status.

## Verdict Banner CSS

```css
.verdict {
  display: flex; gap: 1.5rem; padding: 1rem 0;
  border-top: 1px solid #E4E4E7; border-bottom: 1px solid #E4E4E7;
  font-family: "Source Code Pro", monospace; font-size: 14px;
}
.v-found  { color: #10B981; }
.v-partial { color: #D97706; }
.v-miss   { color: #EF4444; }
```

Use `■` (filled square) as the status indicator — not dots (Bass's Constant).
