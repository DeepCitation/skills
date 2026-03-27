# Analyze Input & Determine What to Verify

**Respond first, verify second**: If the user asked a question or requested analysis alongside `/verify`, you should have already answered it naturally in Phase 1 (see SKILL.md). This step runs in Phase 2, AFTER your natural response is complete.

**Bias for action**: DO things, don't ask questions. Scan everything available, make a plan, and execute. Only ask the user if you genuinely cannot determine what they want.

**Cached prepare ≠ verified**: If `.deepcitation/` contains `prepare-*.json` files from a prior run, that only means source content was extracted — it does NOT mean citations were built or verified. You must still run the full pipeline: build citations → keygen → verify → inject. Check for `verify-response-*.json` to determine if verification actually ran.

Before calling any API, scan all available context:

1. **Parse `$ARGUMENTS`** — file paths, URLs, or empty?
2. **Scan conversation history** (always, even when arguments are provided):
   - AI-generated content: reports, summaries, analyses, dashboards, HTML output
   - `[N]` citation markers and `<<<CITATION_DATA>>>` blocks
   - Source file mentions (PDFs, images, DOCX/XLSX/PPTX, URLs)
   - Links to generated artifacts (HTML reports, dashboards)
3. **Scan the working directory**: `.deepcitation/` artifacts from prior runs, source documents
4. **Scan for generated HTML files**: `glob .deepcitation/report-*.html` and any other HTML files mentioned in conversation

## Decision paths

**Check Phase 1 first**: If the user asked a question alongside `/verify` (e.g., "are pets allowed? /verify"), Phase 1 in SKILL.md should have already handled: identify sources → prepare → answer naturally. By the time you reach this step, the AI's claims exist in the conversation. Proceed to the matching path below.

**A) Source files provided as arguments** (`/verify report.pdf quarterly-results.docx`)
→ Prepare these files, generate a cited analysis, verify, and inject.

**B) Existing cited output found** (conversation contains `[N]` markers + `<<<CITATION_DATA>>>`)
→ Skip citation building. Extract citations and source file references, prepare any source files not yet uploaded, then verify and inject.

**C) Uncited AI-generated content with existing HTML** (substantive claims WITHOUT citation markers, but HTML output exists)
→ Identify the source documents (from conversation context, file references, or ask if truly unclear). **Ask before guessing** — especially when sources are internal/intranet URLs or documents the user may need to manually download, print to PDF, or upload for the API to access. Running the full pipeline against the wrong sources wastes time and produces misleading results. Prepare them, re-generate the content WITH citations, verify, and inject.

**D) Chat-only — AI claims but no HTML output** (conversation has answers/analysis but no HTML file was generated)
→ The most common path when `/verify` follows a Q&A or when Phase 1 just completed. The AI claims already exist — do NOT re-answer the question. Load [chat-to-html.md](./chat-to-html.md) to generate a verified output from the conversation claims. Output format: HTML for complex/multi-source content, markdown with indicators for quick Q&A (see SKILL.md "Final deliverable").

**E) A text/HTML file provided** (`/verify analysis.txt` or `/verify report.html`)
→ Read the file. If it contains `<<<CITATION_DATA>>>`, treat as path B. Otherwise, treat the file's content as the claims to verify and proceed through the full pipeline.

**F) Multiple verifiable items found** (e.g., multiple reports, multiple AI responses)
→ Verify ALL of them. Run the pipeline for each one.

**G) Nothing found — no arguments, no question, no prior claims, no source documents in working directory**
→ Only in this case, ask the user what they want to verify. This should be rare — exhaust all scanning (conversation, working directory, `.deepcitation/`) before falling back here.
