# Analyze Input & Determine What to Verify

**Respond first, verify second**: If the user asked a question or requested analysis alongside `/verify`, you should have already answered it naturally in Phase 1 (see SKILL.md). This step runs in Phase 2, AFTER your natural response is complete.

**Bias for action**: DO things, don't ask questions. Scan everything available, make a plan, and execute. Only ask the user if you genuinely cannot determine what they want.

**Always run the full pipeline**: build citations → verify → inject. Finding cached artifacts from a prior run does not mean the job is done.

Before calling any API, scan all available context:

1. **Parse `$ARGUMENTS`** — file paths, URLs, or empty?
2. **Scan conversation history** (always, even when arguments are provided):
   - AI-generated content: reports, summaries, analyses, dashboards, HTML output
   - `[N]` citation markers and `<<<CITATION_DATA>>>` blocks
   - Source file mentions (PDFs, images, DOCX/XLSX/PPTX, URLs)
   - Links to generated artifacts (HTML reports, dashboards)
3. **Scan the working directory**: source documents, HTML files mentioned in conversation

## Decision paths

**Check Phase 1 first**: If the user asked a question alongside `/verify` (e.g., "are pets allowed? /verify"), Phase 1 let the conversation develop naturally without intervention. By the time you reach this step, the AI's claims exist in the conversation. Source preparation happens now, as part of Phase 2 — identify the sources that back the claims, then prepare them.

**A) Source files provided as arguments** (`/verify report.pdf quarterly-results.docx`)
→ Prepare these files, generate a cited analysis, verify, and inject.

**B) Existing cited output found** (conversation contains `[N]` markers + `<<<CITATION_DATA>>>`)
→ Skip citation building. Extract citations and source file references, prepare any source files not yet uploaded, then verify and inject.

**C) Uncited AI-generated content with existing HTML** (substantive claims WITHOUT citation markers, but HTML output exists)
→ Identify the source documents (from conversation context, file references, or ask if truly unclear). **Ask before guessing** — especially when sources are internal/intranet URLs or documents the user may need to manually download, print to PDF, or upload for the API to access. Running the full pipeline against the wrong sources wastes time and produces misleading results. Prepare them, re-generate the content WITH citations, verify, and inject.

**D) Chat-only — AI claims but no HTML output** (conversation has answers/analysis but no HTML file was generated)
→ The most common path when `/verify` follows a Q&A. The AI claims already exist — do NOT re-answer the question. Load [chat-to-html.md](./chat-to-html.md) to generate a verified HTML from the conversation claims. Always produce an HTML file — in chat, summarize results and link to it.

**E) A text/HTML file provided** (`/verify analysis.txt` or `/verify report.html`)
→ Read the file. If it contains `<<<CITATION_DATA>>>`, treat as path B. Otherwise, treat the file's content as the claims to verify and proceed through the full pipeline.

**F) Multiple verifiable items found** (e.g., multiple reports, multiple AI responses)
→ Verify ALL of them. Run the pipeline for each one.

**G) Nothing found — no arguments, no question, no prior claims, no source documents in working directory**
→ There is nothing to verify. The skill is not useful here — exit gracefully. Do not ask the user what they want to verify; if they need verification, they'll invoke `/verify` when there's content to check.
