# Chat to Verified Output — Clone and Cite

Use this path when the conversation contains a chat-style exchange (questions + AI answers) and you need to produce a verified output with DeepCitation. This is common when a user runs `/verify` after a back-and-forth conversation that referenced source documents.

## When does this apply?

- The conversation has AI-generated claims (answers, analysis, summaries) but **no existing HTML output**
- Source documents were discussed or attached in the conversation

## Output

Always produce an HTML file — even for quick chat Q&A. In chat, summarize the results and link to the HTML for inspection.

## Workflow

### 1. Identify claims and sources

Scan the full conversation for:
- **Claims**: every factual assertion, value, date, name, measurement, or conclusion the AI produced
- **Sources**: every file path, URL, or document referenced — these are what back the claims

If sources are ambiguous (e.g. the user mentioned a document but didn't attach it), ask which files to use. Do not guess at internal/intranet sources.

### 2. Prepare all sources

Follow [prepare-sources.md](./prepare-sources.md) for each source document. Every source must be prepared — skipping one means its claims go unverified. Use parallel preparation when multiple sources exist.

### 3. Clone content into cited HTML

Convert the chat response into a clean HTML document with citation markers. This is the same `[N]` + `<<<CITATION_DATA>>>` format used by `citationPrompts.ts` — one pattern for everything.

1. **Structure**: Wrap in a self-contained HTML document with inline styles. Restructure the conversation content into a coherent document — group related claims under headings, use tables where appropriate. Do **not** change the words of any claim — present the same claims from the natural response, only reformatted. The content stays the same; only the structure and format change.

2. **Mark claims**: For each factual claim sourced from an attachment:
   - Add `data-cite="N"` to the element containing the claim
   - Add `[N]` after the claim text

   Where N is a sequential integer starting from 1. Every distinct piece of information needs its own unique marker number.

3. **Append citation data**: At the end of the file (after `</html>`), add the citation block grouped by `attachmentId`:

   ```
   <<<CITATION_DATA>>>
   {
     "ATTACHMENT_ID_FROM_PREPARE": [
       {
         "id": 1,
         "reasoning": "why this source text backs this claim",
         "full_phrase": "verbatim quote from deepTextPromptPortion",
         "anchor_text": "1-3 key words from full_phrase",
         "page_id": "page_number_N_index_I",
         "line_ids": [LINE_ID]
       }
     ]
   }
   <<<END_CITATION_DATA>>>
   ```

   Follow the CoT ordering: `reasoning` first (think WHY before WHAT), then `full_phrase` (verbatim from source), then `anchor_text` (extracted from full_phrase). For `page_id` and `line_ids`, see [line-ids.md](./line-ids.md).

4. **Save** as `.deepcitation/marked-{timestamp}.html`

### 4. Verify (one command)

```bash
npx -y deepcitation verify --html .deepcitation/marked-{timestamp}.html
```

This single command: parses the citation data, generates deterministic keys, maps `data-cite` attributes to `data-citation-key` hashes, verifies all citations against the API (~0.5s), and injects the CDN runtime. Output: `.deepcitation/cited-{timestamp}.html`

Open the result for the user.

## HTML structure guidelines

- Use a self-contained HTML document (inline styles or `<style>` block — no external CSS)
- Clean, professional layout — think report, not chat log
- Group related findings under headings
- Include a title/header describing the topic
- Include a references section listing source documents in the footer
- Ensure all content is visible without JavaScript (the CDN runtime adds verification indicators but the content should be readable without it)
