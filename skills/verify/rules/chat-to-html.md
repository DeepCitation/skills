# Chat to Verified Output — Generate a Cited Response

Use this path when the conversation contains a chat-style exchange (questions + AI answers) and you need to produce a verified output with DeepCitation. This is common when a user runs `/verify` after a back-and-forth conversation that referenced source documents.

## When does this apply?

- The conversation has AI-generated claims (answers, analysis, summaries) but **no existing HTML output**
- Source documents were discussed or attached in the conversation

## Choose the output format

- **HTML** (default for complex reports): Generate a standalone HTML document, then verify, inject, and open. Best when the user wants a shareable artifact or the content has structure (tables, sections, multiple sources).
- **Markdown with indicators** (for quick Q&A): When the conversation is a short exchange and HTML would be overkill, verify the claims and report results inline with `✓`/`⚠`/`✗` indicators plus a summary table. See [verify-and-inject.md](./verify-and-inject.md) Option 2.

When in doubt, prefer HTML — it provides the richer verification experience with popovers.

## Workflow

### 1. Identify claims and sources

Scan the full conversation for:
- **Claims**: every factual assertion, value, date, name, measurement, or conclusion the AI produced
- **Sources**: every file path, URL, or document referenced — these are what back the claims

If sources are ambiguous (e.g. the user mentioned a document but didn't attach it), ask which files to use. Do not guess at internal/intranet sources.

### 2. Prepare all sources

Follow [prepare-sources.md](./prepare-sources.md) for each source document. Every source must be prepared — skipping one means its claims go unverified.

### 3. Generate cited HTML

Build an HTML document that:
1. **Presents the claims** in a clean, readable layout (not a raw chat transcript)
2. **Restructures** the conversation content into a coherent document — group related claims, use headings, and make it presentable as a standalone report. Do not introduce new claims or rephrase conclusions — present the same claims from the natural response, only reformatted. The content stays the same; only the structure and format change.
3. **Cites every claim** using the `<<<CITATION_DATA>>>` format from Path C in [build-citations.md](./build-citations.md)

Use the canonical citation format spec:
```bash
DC_ROOT="$(node -e "console.log(require('path').resolve(require('path').dirname(require.resolve('deepcitation')), '..'))")"
cat "$DC_ROOT/docs/prompts/citation-format.md"
```

Every factual claim gets a `[N]` marker and a corresponding entry in the `<<<CITATION_DATA>>>` block. Think out loud for each citation — reason about which document, page, and line supports the claim.

### 4. Extract citations, generate keys, annotate

After generating the HTML with `<<<CITATION_DATA>>>`:

1. **Parse** the `<<<CITATION_DATA>>>` block into a `CitationRecord` object
2. **Save** as `.deepcitation/citations-{timestamp}.json`
3. **Generate keys**: `npx -y deepcitation keygen --citations .deepcitation/citations-{timestamp}.json`
4. **Annotate** the HTML with `data-citation-key` attributes per [annotate-html.md](./annotate-html.md)
5. **Build the key map** per [annotate-html.md](./annotate-html.md)

### 5. Verify and inject

Follow [verify-and-inject.md](./verify-and-inject.md) to verify all citations, inject the CDN runtime, and validate before delivering.

## HTML structure guidelines

- Use a self-contained HTML document (inline styles or `<style>` block — no external CSS)
- Clean, professional layout — think report, not chat log
- Group related findings under headings
- Include a title/header describing the topic
- Add a citation drawer trigger in the footer or a references section (see [annotate-html.md](./annotate-html.md))
- Ensure all content is visible without JavaScript (the CDN runtime adds verification indicators but the content should be readable without it)
