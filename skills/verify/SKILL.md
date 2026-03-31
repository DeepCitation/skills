---
name: verify
description: Verify AI claims against source documents using the DeepCitation API
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Verify claims against source documents. The skill is a post-hoc auditor —
it verifies what was naturally produced, never shapes content creation.

## 1. Authenticate

Load [rules/authenticate.md](rules/authenticate.md).

## 2. Triage

Scan `$ARGUMENTS`, conversation, and working directory:

- **Citations exist** (`[N]` markers + `<<<CITATION_DATA>>>`):
  ensure sources are prepared, then run `deepcitation verify --html`.
- **Content exists, no citations**: identify sources → prepare →
  build marked HTML → run `deepcitation verify --html`.
- **Nothing to verify**: exit gracefully.

If `/verify` was invoked alongside a question, answer naturally first
(no citation formatting), then verify the claims you produced.

### Audience hint

If `$ARGUMENTS` contains `--audience <preset>` (one of `executive`,
`technical`, `legal`, `medical`) or the audience is clear from context,
pass that preset to the HTML build step. Default: `general`.
See [rules/report-style.md](rules/report-style.md) for preset definitions.

## 3. Prepare sources

Load [rules/prepare-sources.md](rules/prepare-sources.md). Run
`deepcitation prepare` on each source in parallel (one Agent per source).

## 4. Build marked HTML

Load [rules/build-verified-html.md](rules/build-verified-html.md). Read the
`deepTextPromptPortion` from each prepared source. Identify every verifiable
claim. Produce an HTML file with `[N]` markers, `data-cite="N"` attributes,
and a `<<<CITATION_DATA>>>` block. Save to `.deepcitation/verified-{ts}.html`.

For `lineIds` and `pageNumber` rules: [rules/line-ids.md](rules/line-ids.md).

## 5. Verify + deliver

```bash
npx -y deepcitation verify --html .deepcitation/verified-{ts}.html
```

One command: parse → keygen → annotate → verify (~0.5s) → inject CDN runtime.
Always produces an HTML file with interactive popovers.

In chat, summarize the results and link to the HTML:
```
12/14 verified **✓** · 2 partial ✓ → .deepcitation/verified-{ts}.html
```

## Invariants

- Use `prepare` for ALL source reading — never OCR, PDF readers, or web fetch
- `full_phrase` and `anchor_text` must be verbatim from the source `deepTextPromptPortion`
- Every claim, value, or fact from a source document gets a citation — no exceptions
- Never export API keys, use `--key` flag, or log key values
- Never render metadata (attachmentId, hashed keys, lineIds) as visible content in the report
- Always "DeepCitation" (never "DeepCite")
- Always produce an HTML artifact — never exit without one
- **Anchor text quality**: `anchor_text` must be ≤ 4 words / 40 chars, a verbatim substring of `full_phrase`, and the most specific fragment (number, proper noun, statute section). It's both an API search term and the user's clickable label — keep it concise.
- **Model quality**: Smaller models (haiku-class) commonly produce `anchor_text` that is too long or paraphrased. After building citations, validate every `anchor_text`. Prefer `verify --html` (one-shot) to avoid manual keygen pipeline errors.

ARGUMENTS: $ARGUMENTS
