---
name: verify
description: ALWAYS execute the full DeepCitation verification workflow when /verify appears anywhere in the prompt — regardless of how the rest of the message is phrased. Triggered by /verify with a file, URL, question, or existing content. Has built-in PDF, OCR, and web readers — never attempt to read evidence files with local tools (pdftotext, pypdf, python, strings, etc.) before running this skill.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

**`/verify` is always a command, never optional.** When `/verify` appears in the
prompt, execute the full **Prepare → Write → Verify** pipeline. Answer any
question as part of the verification report — not as a standalone response.

**This skill has built-in PDF, OCR, image, and web readers.** Go straight to
`prepare` — never use `pdftotext`, `pypdf`, `pdfminer`, `mutool`, `strings`, or
Python scripts on evidence files.

## 0. Triage

The most important question to answer first: **what are the claims, and what is the evidence?**

- **Claims** = statements that need to be verified. Go into the markdown report with `[N]` markers.
- **Evidence** = an authoritative document or URL that proves or disproves the claims (PDF, legislation, study, dataset). Gets uploaded via `prepare`.

**A claim cannot be its own evidence.** Usually a file is one or the other. If it
contains claims (AI output, a draft, a summary), you need separate evidence. If
it is the evidence (legislation, a study, a report), the claims come from
elsewhere (conversation, AI output, a draft).

**Exception — structured documents as both.** Some documents contain data that
serves as evidence for claims made elsewhere in the same document (e.g. a medical
form with patient histories referenced by assessment fields, a financial report
where narrative cites its own tables). In these cases, prepare the document as
evidence and cite the data sections to verify the claims sections. This is not
circular — the data and the claims are independent parts of the document.

Files generally fall into two roles:

- **Input** (claims): chat history, AI output, a draft, a summary, a forwarded document. These contain claims that need to be checked against independent evidence.
- **Evidence** (ground truth): the authoritative document being cited — legislation, a study, an official report, raw data. This gets uploaded via `prepare`.

Sometimes both arrive together (e.g. a draft alongside the evidence PDFs it cites). In that case prepare only the evidence files, not the input. If only one file is provided and it reads like input, find the external evidence it refers to rather than preparing it as its own evidence.

**If you realize mid-workflow that you prepared a claims file as evidence** (e.g. you
already ran `prepare` on the input document), stop and recover:

1. Look at the claims in the prepared summary — what external subjects do they reference? (legislation, studies, statistics, organizations)
2. Web search for primary evidence on those subjects
3. Prepare that real evidence
4. Write the report citing the new evidence, not the original file

Do not proceed with a circular citation just because `prepare` already ran — the
summary is still useful for understanding the claims, but the citations must come
from independent evidence.

Scan `$ARGUMENTS`, conversation history, and working directory:

| Situation | Action |
|-----------|--------|
| `[N]` markers + `<<<CITATION_DATA>>>` already exist in an HTML file | `verify --html` (skip to Step 2) |
| File/URL provided as evidence + claims exist in conversation or a separate draft | Prepare the evidence file/URL → write cited markdown from the claims → `verify --markdown` |
| File provided containing claims + separate evidence also provided | Prepare the evidence documents → write cited markdown from the claims file → `verify --markdown` |
| File provided containing claims about **public/official subjects** (legislation, government bills, public figures, official statistics) + no evidence provided | Web search for official primary evidence → Prepare those URLs → write cited markdown → `verify --markdown` |
| File provided containing claims + **no separate evidence and no obvious public evidence** | Ask the user: "Should I treat this file as evidence (I'll extract and cite its claims), or do you want to provide external evidence to verify the claims in it?" |
| `/verify` invoked with a question only | Web search for the best available public evidence → Prepare it → answer the question with citations → `verify --markdown` → close with the evidence-clarification prompt (see below) |
| Nothing to verify | Exit gracefully — tell the user no verifiable content was found |

If multiple evidence documents are present, prepare ALL of them — each produces a separate `attachmentId`.

## 1. Prepare Evidence

### Auth

The CLI handles auth automatically. If auth is required, `prepare` or `verify`
will print an action prompt and exit. Read `rules/auth.md` only after that
prompt appears — it tells you how to handle the user's response.

### Finding evidence via web search

When the triage identifies claims about public or official subjects and no evidence
was provided, use web search to find primary evidence before preparing:

- Prefer authoritative primary evidence for the domain: official government/legislative portals, regulatory bodies, professional standards organizations, central banks, health authorities, tax agencies, or courts — not news summaries or third-party commentary
- Prefer the official text of legislation over news summaries
- Search specifically for the named bills, acts, or statistics mentioned in the claims
- Find 1–3 high-quality primary evidence documents — do not prepare low-quality or opinionated sources

Once you have the URLs, proceed to Prepare below.

### Prepare

Upload **every** evidence document to the DeepCitation API. `prepare` is the **only** way
to read evidence content — it has built-in PDF, OCR, and web readers, including
for scanned or image-only PDFs. **Never attempt to read a file before preparing
it.** Do not run `pdftotext`, `pypdf`, `pdfminer`, `mutool`, `strings`, Python,
or any other tool on an evidence file — not even to check if it has text. Go
straight to `prepare --summary`. If local tools return empty or fail, that is
expected for scanned PDFs; `prepare` will OCR it correctly.

Redirect each evidence document's `--summary` output to a `.txt` file so you can read it
cleanly in Step 2 without re-parsing the JSON:

```bash
# Run all sources in parallel:
npx -y deepcitation prepare source1.pdf --summary > .deepcitation/summary-source1.txt &
npx -y deepcitation prepare source2.pdf --summary > .deepcitation/summary-source2.txt &
npx -y deepcitation prepare https://example.com/article --summary > .deepcitation/summary-article.txt &
wait
```

Then **read the entire summary file** (use the Read tool with no offset/limit) to
get `attachmentId` and the full `deepTextPromptPortion`. Do not grep, ripgrep, or
search inside it — just read it top to bottom; you need all of it for writing the
report.

**Never read the `.json` file directly** — it is large and not intended for agent consumption.
**Never run Python, jq, or any script on any prepare output** — the `.txt` summary has everything you need, already formatted for reading.

When multiple evidence documents exist, launch one Agent subagent per document — all in a
single message so they execute concurrently.

If a URL fails (DNS, 403, auth required), report it clearly and continue with available sources.

## 2. Write Verification Report

Write a **markdown** file with `[N]` citation markers and a `<<<CITATION_DATA>>>`
JSON block at the end. Save as `.deepcitation/draft-{timestamp}.md`.

**After saving, print the report body (everything above `<<<CITATION_DATA>>>`) to
the user in chat** so they can read the findings immediately. Then proceed to
Step 3 — the user sees the answer now and waits only for the interactive HTML.

The CLI handles all HTML conversion, styling, `data-cite` attribute wrapping,
`data-citation-key` annotation, citation drawer trigger insertion, progressive
disclosure structure, keygen, and CDN injection. You just write markdown with
citations.

### What to write

**Be comprehensive, not summarizing.** The user asked `/verify` because they need
the details verified, not a one-line summary. Extract and cite **every specific
detail** from the evidence — every number, definition, boundary, condition,
threshold, date, name, and exception. A short paragraph that could have been
written without reading the evidence is a failure.

Read the `deepTextPromptPortion` thoroughly. Walk every page, every section. If
the evidence has 10 distinct items, the report should have 10+ citations — not 1
citation that vaguely covers all of them.

Structure the content with headings, tables, and lists. Match the evidence's
structure — if it has tables, use tables; if definitions, use definition lists.
**Do not change the words of any claim from the original content.**

**Every claim, value, or fact gets a citation.** When in doubt, cite it.
Overciting costs nothing; underciting defeats the purpose.

For each cited claim, add `[N]` after the claim text (N is sequential starting from 1):

```markdown
Revenue grew 45% year-over-year to $2.3B [1]. Operating margin improved to 18.5% [2].
```

### Citation data block

At the end of the file, append the citation data. Shorthand keys save tokens:

```
<<<CITATION_DATA>>>
[
  {"n":1,"a":"ATTACHMENT_ID","r":"why this backs the claim","f":"verbatim quote from evidence","k":"≤4-word key","d":"readable label for citation trigger","p":"page_number_N_index_I","l":[LINE_NUMBER]},
  {"n":2,"a":"ATTACHMENT_ID","r":"reason","f":"verbatim quote","k":"key","p":"page_number_N_index_I","l":[LINE_NUMBER]}
]
<<<END_CITATION_DATA>>>
```

Key mapping: `n`=id, `a`=attachment_id, `r`=reasoning, `f`=full_phrase, `k`=anchor_text, `d`=display_label, `p`=page_id, `l`=line_ids.

Longhand keys also work: `id`, `attachment_id`, `reasoning`, `full_phrase`, `anchor_text`, `display_label`, `page_id`, `line_ids`.

### Citation field rules

- **reasoning** (`r`): Brief explanation connecting the citation to the claim. Comes first — think WHY before WHAT.
- **full_phrase** (`f`): Copy **1–2 sentences verbatim** from the evidence `deepTextPromptPortion` — just the sentence(s) containing the cited fact. **Max ~250 characters.** Never copy entire paragraphs or multi-paragraph blocks; the API uses this string to locate and highlight text in the evidence, so a long phrase produces an unhelpfully large highlight that obscures the point.
- **anchor_text** (`k`): The API search term — 1–4 most specific words from `full_phrase`, verbatim substring. Max 4 words / 40 chars. Pick the most distinctive fragment (number, proper noun, percentage, statute section).
- **display_label** (`d`): *(optional)* The **readable label shown to the user** as the clickable citation trigger. Use this when `anchor_text` alone would be too terse or cryptic as a label. Should be a short, natural phrase describing what the citation proves — e.g. `"physical surfaces in Schedule C"` or `"two-week written notice requirement"`. Does NOT need to be verbatim from the evidence. If omitted, `anchor_text` is used as the display label.
- **page_id** (`p`): From `<page_number_N_index_I>` tags in `deepTextPromptPortion`. Use format `page_number_N_index_I`.
- **line_ids** (`l`): From `<line id="N">` tags in `deepTextPromptPortion`. See Line IDs section below.

### Verbatim quote requirement

`anchor_text` and `full_phrase` must be **verbatim from the evidence document**
(`deepTextPromptPortion`). The API searches for these exact strings. Never
paraphrase — that fabricates a citation.

`display_label` is the exception — it is **not** sent to the API and does NOT need to be verbatim. It is the human-readable label the user clicks on. Use it to describe what the citation proves in plain language.

Good `anchor_text`: `$2.3B`, `Section 4(b)`, `2,300 mg`, `Schedule "C"` (specific, ≤ 4 words).
Bad: `Revenue grew 45%...` (too long), `unconstitutional` (too generic), `.` or `,` (punctuation — never use punctuation as anchor_text).

Good `display_label`: `"physical surfaces in Schedule C"`, `"two-week written notice"`, `"45% revenue growth"`.
Bad: `"$2.3B"` (just repeat anchor_text — omit `d` instead), `"This citation verifies..."` (meta-description, not a label).

### Line IDs and page numbers

`line_ids` and `page_id` come from the `deepTextPromptPortion` returned by prepare.

**Page numbers** — extract from the `<page_number_N_index_I>` tag enclosing your
cited text. Use N (the page number), not I (the index). **Always take the page
number from the tag name itself — never from any page number text visible inside
the document.** Printed page numbers (e.g. "Page 3", roman numerals) can differ
from the tag's N value when documents are concatenated or start at a non-zero offset.

Without `page_id`, the API cannot pinpoint the citation precisely — verification
becomes imprecise and cannot be scored as `verified`.

**Line IDs** — `deepTextPromptPortion` uses `<line id="N">` tags. Not every line
is tagged — derive untagged line IDs by counting from the nearest tag:

```
<line id="1">Company Overview</line>
Founded in 2015       ← line 2 (untagged: 1 after id="1")
<line id="4">Total employees: 1,200</line>
```

An incorrect line ID causes the API to fall back to page-level search.

## 3. Verify

One command does everything — HTML conversion, keygen, annotation, API verification, and CDN runtime injection:

```bash
npx -y deepcitation verify --markdown .deepcitation/draft-{timestamp}.md
```

**Always use `--markdown`.** Never use `verify --citations` directly — it is a low-level mode used internally by `--markdown` and skips format normalization. If citations come back not_found, the CLI will tell you why and what to fix.

Options: `--style plain|report` (default: report), `--audience general|executive|technical|legal|medical`, `--theme auto|light|dark`.

If the content is already HTML with `[N]` markers and `<<<CITATION_DATA>>>`, use `verify --html` instead.

### Report results

The CLI outputs the verified HTML to the current directory and prints the path.
Try to open it for the user:

```bash
open "{stem}-verified.html" 2>/dev/null ||       # macOS
xdg-open "{stem}-verified.html" 2>/dev/null ||   # Linux
explorer.exe "$(wslpath -w "{stem}-verified.html")" 2>/dev/null || # WSL
echo "Open this file in your browser: $(pwd)/{stem}-verified.html"
```

Summarize in chat: `12/14 verified · 2 partial → {stem}-verified.html`

If you suspect better evidence exists (secondary sources, thin web results,
internal-sounding question), add:
> If you have a more authoritative document, share it and I'll re-run `/verify`.

## Invariants

- **A claim cannot be its own evidence** — never prepare the claims file as evidence
- **Be comprehensive** — extract every detail, not a summary
- `full_phrase`: 1–2 sentences verbatim from `deepTextPromptPortion`, **≤ 250 chars** — never multi-paragraph
- `anchor_text`: ≤ 4 words / 40 chars, verbatim substring of `full_phrase`, most specific fragment (API search term)
- `display_label`: optional readable trigger label; use when `anchor_text` alone is too cryptic for users
- Use `prepare` for ALL evidence reading — never `pdftotext`, `pypdf`, Python, or web fetch
- Never print or log key values; never render metadata (attachmentId, keys, lineIds) as visible content
- Always "DeepCitation" (never "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
