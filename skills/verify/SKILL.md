---
name: verify
description: ALWAYS execute the full DeepCitation verification workflow when /verify appears anywhere in the prompt — regardless of how the rest of the message is phrased. Triggered by /verify with a file, URL, question, or existing content. Has built-in PDF, OCR, and web readers — always use prepare to read evidence files.
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, Agent
---

# /verify — DeepCitation Verification

Execute the pipeline below whenever `/verify` appears in the prompt.
Answer any question as part of the verification report — not as a standalone response.

## 1. Prepare

Identify the evidence document (the authoritative source — not the claims).
A claim cannot be its own evidence.

| Situation | Evidence |
|-----------|----------|
| User provided a file/URL as evidence | That file/URL |
| Prior chat already has claims to verify | Use existing claims as-is — do NOT rewrite them. Prepare evidence, then cite the existing text. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML with `[anchor](cite:N)` citation markers | Skip to Step 3 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, and web readers.

```bash
mkdir -p .deepcitation && npx -y deepcitation prepare <file-or-url> --summary > .deepcitation/summary-<name>.txt 2>&1
```

Multiple sources: run all in parallel with `&` + `wait`.

If the output contains "action needed", authenticate:

```bash
npx -y deepcitation login --browser
```

This opens the browser for OAuth and waits for the callback (up to 120s).
If the user pastes a key instead, run `npx -y deepcitation login --key '<the-key>'`.
After login succeeds, **retry the same prepare command**.

**If authentication fails after attempting login, STOP COMPLETELY.**
Show the error and end your response. Reports require verified evidence from `prepare`.

Never expose API keys in commands or output.

Read each summary file **fully** with the Read tool (no grep, no jq — read top to bottom).
The summary contains `attachmentId` and `deepTextPages` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — having evidence text in context (even repeated) improves citation accuracy via RE2.

## 2. Respond with citations

Your response IS the verification report. Write **body text only** — the CLI auto-generates citation data.

Use **standard markdown only** — no raw HTML tags.

Wrap each cited claim in citation link syntax. The **display label** is what readers see in the prose — keep it short (1–4 words). The **anchor** is what the CLI uses to locate the highlight in evidence — it can be longer and must be verbatim.

**Format 1 — Short verbatim term** (most common — when 1–4 verbatim evidence words work as natural link text):
`[key term](cite:N)` — display label is copied verbatim from evidence; the CLI uses it as the search anchor.
- `the limit is [1.80 metres](cite:N) above the slab`
- `[Breeding of pets for sale](cite:N) is not permitted`
- `[ordinary household pets](cite:N) may be kept in residential units`

**Format 2 — Short label + longer anchor** (use when the specific claim is a long phrase — separate what readers see from what the search uses):
`[short label](cite:N 'verbatim anchor phrase')` — display label is 1–4 words; anchor is the longer verbatim phrase from evidence that pinpoints the highlight.
- `the lower limit is [concrete slab surface](cite:N 'upper unfinished surface of the concrete floor slab')` — display: 3 words; anchor: specific phrase
- `residential units span [Levels 2–9](cite:N 'Units 1–11 on Level 2, Units 1–10 on Levels 3')` — display: 2 words; anchor: specific enumeration
- `[pro rata](cite:N 'distributed pro rata among holders')` — display differs from evidence phrase

`N` is the citation's sequential **id** (1, 2, 3…) — NOT an evidence line number.

### Citation placement rules

**Display labels must be 1–4 words.** Count the words before writing. If the display label would exceed 4 words, you must use Format 2 — put the longer specific phrase as the anchor, keep the display label to 4 words or fewer.

**The label names the thing, not the claim.** Strip the brackets mentally — if the result is a complete sentence, the label is too large.
- `[X](cite:N) is not permitted` — "X" names the thing; the claim stays in prose
- `[X is not permitted](cite:N)` — strip brackets → complete sentence; label too large
- `the limit is [1.80 metres](cite:N) above the slab` — the value is the claim
- `[the limit is 1.80 metres above the slab](cite:N)` — strip brackets → complete sentence; too large
- `Junior to payment of [senior obligations](cite:N)` — noun cited
- `[Junior to](cite:N) payment of senior obligations` — dangling preposition; wrong

**One ID per fact.** N distinct claims → IDs 1…N. Never reuse an ID for a different claim, even from the same source. Reuse an ID only to re-reference the *exact same* fact later in the text.

**No ranges.** `(cite:8)` and `(cite:9)` are two citations, never `(cite:8-9)`.

**Write body text only** — citation data is auto-generated from your markers and the prepared summary.

### Parallel generation — REQUIRED when the question has 2+ distinct sections

**When to use:** The question asks about 2 or more distinct topics. If the expected output has two or more top-level section headings, use parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

Spawn two agents simultaneously. Pass the full evidence text (copied verbatim from the summary) into each agent's prompt.

Each sub-agent prompt must include:
- Their assigned section topic and the user's original question
- The full `deepTextPages` evidence text from the summary (copy it in full)
- Citation format: `[display label](cite:N)` or `[short label](cite:N 'verbatim anchor')` markers in the body. Write body text only — citation data is auto-generated by the CLI.
  - **Citation rules**: display labels must be 1–4 words. For long specific phrases (definitions, enumerations), use Format 2 with a short display label and the longer verbatim phrase as the anchor. Cite the distinctive noun — not the predicate. Close the bracket before the verb: `[X](cite:N) is not permitted`, not `[X is not permitted](cite:N)`. One unique ID per distinct fact.
- Citation ID range: **Agent A starts at 1**, **Agent B starts at 100**
- File to Write to: **Agent A → `.deepcitation/section-a.md`**, **Agent B → `.deepcitation/section-b.md`**
- **Comprehensiveness**: extract every specific detail from the evidence — measurements, unit numbers, defined terms, thresholds. Distinguish categories (e.g., different types, parties, events) with separate subsections. A vague summary is a failure.
- Each agent writes body text only (section heading + cited body text) and returns a one-line confirmation.

**After both agents complete, merge + verify in one command** (renumber, citation generation, and verification happen automatically):

```bash
npx -y deepcitation merge --a .deepcitation/section-a.md --b .deepcitation/section-b.md --out .deepcitation/{draft}-body.md && \
npx -y deepcitation verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" --out {topic}-verified.html
```

**Single-topic questions:** write the report body directly to `.deepcitation/{draft}-body.md`, then run `verify --markdown` on it.

### Comprehensiveness — answer every part of the question

**Cover ALL parts of the question equally.** Multi-part questions (e.g., "What are X? What about Y?") require thorough answers for each part — not a deep answer for the easy part and a shallow answer for the harder part. Before writing, scan the full evidence for every section/schedule/appendix that addresses each sub-question.

**Extract specific details.** Vague summaries fail. If the evidence contains measurements, unit numbers, defined terms, thresholds, or formulas — include them with citations. A response that says "boundaries are defined" without stating the actual boundary definitions is incomplete.

**Use structured sections.** If the evidence distinguishes categories (e.g., different unit types, different event types, different parties), your response must mirror those distinctions with separate subsections or table rows — not collapse them into a single vague paragraph.

Structure with headings, tables, and lists matching the evidence. If evidence seems incomplete for the question, note what's covered and suggest the user share additional documents.

**What goes in each file:**
- **Body file** (your output or from agents): markdown prose with `[label](cite:N)` markers.
- **Your response to the user**: The full markdown report body — prose only.

## 3. Verify

Pick a clean output name matching the topic — the report lives in CWD, not `.deepcitation/`:

```bash
npx -y deepcitation verify --markdown .deepcitation/{draft}.md \
  --title "Descriptive Report Title" \
  --out {topic}-verified.html
```

If you skipped Step 1–2 because the HTML already had citation markers (triage row above), use `--html` instead:

```bash
npx -y deepcitation verify --html {existing}.html \
  --title "Descriptive Report Title" \
  --out {topic}-verified.html
```

Run verify ONCE — do not edit the draft and re-verify. The API handles partial matches gracefully.

Options: `--style plain|report` (default: `report`), `--audience general|executive|technical|legal|medical` (default: `general`), `--theme auto|light|dark` (default: `auto`).

If the output contains "action needed", authenticate as in Step 1 and re-run.

Open the output (WSL first — most users run in WSL on Windows; macOS/Linux fallbacks are silent):

```bash
explorer.exe "$(wslpath -w "{topic}-verified.html")" 2>/dev/null || \
xdg-open "{topic}-verified.html" 2>/dev/null || \
open "{topic}-verified.html" 2>/dev/null || \
echo "Open: $(pwd)/{topic}-verified.html"
```

Summarize: `12/14 verified · 2 partial → {topic}-verified.html`

If you suspect better evidence exists, add:
> If you have a more authoritative document, share it and I'll re-run `/verify`.

## Invariants

- **Minimum tool calls** — do not make exploratory calls (ls, Glob, Grep, extra Read) between pipeline steps. Do not read files back after writing them. Single-topic pipeline: prepare → Read summary → Write body → Bash(verify+open). Multi-topic pipeline: prepare → Read summary → [Agent A ∥ Agent B] → Bash(merge+verify+open). Complete each step once.
- **Never run login proactively** — only run `deepcitation login` if prepare or verify output contains the exact phrase "action needed". Do not run login as a precaution or to check auth status.
- **Run verify ONCE** — do not edit the draft and re-verify.
- **Write body text only** — the `verify` command auto-generates citation data from your `[display label](cite:N)` markers by searching the prepared summary.
- **Only the CLI produces HTML** — the verified HTML is created exclusively by `npx deepcitation verify`. If you cannot run the CLI, stop and report the error.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[label](cite:N)`.
- Never expose API keys or render internal metadata as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
