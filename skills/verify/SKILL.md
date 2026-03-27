---
name: verify
description: Verify AI claims against source documents using the DeepCitation API
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Verify claims against source documents using the DeepCitation API, saving JSON artifacts at each step.

## Prerequisites

- **Authentication**: Load [rules/authenticate.md](rules/authenticate.md) and follow it **before any other step**. Never skip login — never give up if the key is missing.
- Source files (PDF, DOCX, images, etc.) must be accessible on disk or via URL
- Accepted file types: PDF, images (JPG, PNG), Office files (DOCX, XLSX, PPTX), CSV, TSV, ODF

## Citation coverage mandate

**Every claim, value, or fact derived from source documents MUST be cited.** This includes numbers, dates, names, measurements, findings, conclusions, restated or summarized content, and any assertion a human would need to open a source document to verify. If the information came from an attachment, it gets a citation — no exceptions. Underciting defeats the purpose of verification.

## Final deliverable

The output of this skill is one of:

1. **HTML with DeepCitation popovers** (preferred) — a static HTML file with the CDN runtime injected via `npx -y deepcitation inject`. Every path that produces or already has HTML must end with an injected `.html` file opened for the user.

2. **Markdown with citation indicators** (fallback) — when the context is pure chat/markdown with no HTML artifact, report verification results inline using status indicators after each claim:
   - `✓` for `found`
   - `⚠` for `partial_text_found`, `found_anchor_text_only`, `found_on_other_page`
   - `✗` for `not_found`

   End with a **citation status summary table** listing every citation, its status, the source document, and page number.

Use HTML (option 1) when there is an existing HTML report, dashboard, or when the user's workflow involves HTML output. Use markdown (option 2) when the conversation is chat-only and generating HTML would be unnecessary overhead — e.g., a quick Q&A where the user just wants to know if the AI's claims check out.

**Both formats require full verification** — `npx -y deepcitation verify` must run regardless of output format.

## Key Rules

- **Use `prepare` for ALL source reading — never use other tools to read source content.** When this skill is active, `npx -y deepcitation prepare <file>` and `npx -y deepcitation prepare <url>` replace all other methods of extracting content from sources:
  - **Instead of OCR tools** → use `prepare` on the image/PDF
  - **Instead of PDF readers** → use `prepare` on the PDF
  - **Instead of URL crawling / web fetch tools** → use `prepare <url>` (i.e. `prepareUrl`)
  - The `deepTextPromptPortion` returned by `prepare` contains structured text with `<line id>` tags and `<page_number>` tags that are **required** for building citations. Content extracted by other tools lacks these markers and cannot be used for citation line IDs.
- **`page_id` and `line_ids` MUST come from the `deepTextPromptPortion`** — see [rules/line-ids.md](rules/line-ids.md) for details.
- **Coverage audit**: After generating citations, spawn a subagent to audit the report/chat and confirm all facts, sources, names, dates, and values have deepcitations. The subagent should flag any uncited claims.

## Two-phase flow — respond first, verify second

When `/verify` is invoked alongside a question (e.g., "are pets allowed? /verify"), or in a conversation where the user is asking you to analyze/summarize/answer something:

### Phase 1 — Prepare sources, then respond naturally

1. **Identify sources**: Scan `$ARGUMENTS`, the working directory, and conversation context for source documents (PDFs, DOCX, images, URLs). If sources are ambiguous and can't be inferred, ask the user.
2. **Prepare sources**: Run `npx -y deepcitation prepare <file>` on each source. You MUST do this first because `prepare` is the only way to read source content when this skill is active — and you need to read the sources to answer the question.
3. **Answer the question**: Using the `deepTextPromptPortion` from prepare, answer the user's question fully and freely. Do NOT add `[N]` citation markers, `<<<CITATION_DATA>>>` blocks, or any verification formatting. Just answer the question naturally, as if `/verify` weren't there.

### Phase 2 — Verify the claims you just made

Once your natural response is complete, run the verification pipeline on the claims you produced:
1. Analyze input (Step 0) — your response is now the content to verify (Path D: chat-only with AI claims)
2. Build citations (Step 2) — map each claim to source text using the `deepTextPromptPortion` you already have
3. Verify and deliver (Steps 3–5)

**Why this matters**: The purpose of verification is to check what you naturally produce — not to make you produce something artificially constrained. If the AI narrows its response because it knows verification is coming, the verification is less useful.

**When to skip Phase 1**: If the user is invoking `/verify` on content that already exists (prior conversation, existing HTML, existing files) and is NOT asking a new question, skip straight to Phase 2. The claims are already there — just verify them.

## Mandatory completion gate

Every invocation of `/verify` MUST end with one of these deliverables — no exceptions:

1. **An injected HTML file** with DeepCitation popovers embedded (the standard output), OR
2. **Markdown with citation indicators and a status summary table** — inline `✓`/`⚠`/`✗` after each claim, followed by a summary table (see `verify-and-inject.md` Option 2)

A cached `prepare` response does NOT mean verification is done. Preparing a file only extracts its content — you must still build citations, run `npx -y deepcitation verify`, and inject the results. Never treat a cached prepare artifact as proof that verification has already occurred. If `.deepcitation/` contains prepare outputs but no `verify-response-*.json`, verification has NOT been run.

## Workflow (Phase 2)

### Step 0: Analyze input

Load [rules/analyze-input.md](rules/analyze-input.md) to determine which path to follow (A–G) based on what's in the conversation, arguments, and working directory.

### Step 1: Prepare sources

Load [rules/prepare-sources.md](rules/prepare-sources.md) for CLI usage and what to retain from each prepare response. **This step can be started during Phase 1** — spawn a background subagent to prepare sources while you're still generating your natural response.

### Step 2: Build citations

Load [rules/build-citations.md](rules/build-citations.md) for the full citation-building workflow:
- **Path A**: Existing `<<<CITATION_DATA>>>` — skip to Step 3
- **Path B**: Existing HTML with claims — identify claims, build citation data, generate keys, annotate HTML
- **Path C**: Generate new cited response from scratch using the canonical citation format spec
- **Path D (chat-to-html)**: Conversation has AI claims but no HTML — load [rules/chat-to-html.md](rules/chat-to-html.md) to generate a cited HTML document from the chat

### Step 3–5: Verify, inject, validate

Load [rules/verify-and-inject.md](rules/verify-and-inject.md) for verification, HTML injection, and pre-delivery validation.

## When building citations

When dealing with `lineIds` and `pageNumber` values, load [rules/line-ids.md](rules/line-ids.md) for how sparse line IDs work and how to find the right one.

When annotating HTML with `data-citation-key` attributes, load [rules/annotate-html.md](rules/annotate-html.md) for placement rules, key-map building, and citation drawer triggers.

## Output artifacts

All artifacts are saved in `.deepcitation/`. Use `{topic}-{timestamp}` naming so re-runs don't clobber each other:

| File | Contents |
|------|----------|
| `prepare-{source}-{timestamp}.json` | Upload response with `attachmentId` and `deepTextPromptPortion` |
| `llm-output-{timestamp}.txt` | Full LLM response including `<<<CITATION_DATA>>>` block |
| `citations-{timestamp}.json` | Extracted `CitationRecord` with human-readable keys |
| `citations-keyed-{timestamp}.json` | Re-keyed citations with hashed keys (from `keygen`) |
| `key-map-{timestamp}.json` | Human-readable key → hashed key mapping |
| `annotated-{timestamp}.html` | HTML with `data-citation-key` attributes (before injection) |
| `verify-response-{timestamp}.json` | Verification results with statuses and evidence |
| `injected-{timestamp}.html` | Injected HTML with CDN runtime (Path B output) |

## Important rules

- **Product name**: Always "DeepCitation" (never "DeepCite")
- **Keep metadata out of the report**: Track `attachmentId`, hashed keys, `lineIds`, `pageNumber`, and other internal metadata in JSON artifacts and `data-` attributes — but **never render them as visible content in the HTML report** unless the user specifically requests it. The report is for end users; they should see claims and verification status, not API internals
- **Strip before display**: Use `extractVisibleText()` to remove `<<<CITATION_DATA>>>` before showing text to user
- **CitationRecord is an object**: Check emptiness with `Object.keys(citations).length === 0`
- **API key security**: Never log or display `DEEPCITATION_API_KEY`
- **Verbatim quotes**: `fullPhrase` must be copied exactly from the source — do not paraphrase

## References

- Citation format spec: `$DC_ROOT/docs/prompts/citation-format.md` (resolve `DC_ROOT` with `node -e "..."` as shown in Path C)
- SDK prompt: `$DC_ROOT/src/prompts/citationPrompts.ts`
- Citation parser: https://github.com/DeepCitation/deepcitation/blob/main/src/parsing/parseCitation.ts
- API docs: https://deepcitation.com/docs

ARGUMENTS: $ARGUMENTS
