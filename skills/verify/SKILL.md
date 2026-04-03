---
name: verify
description: ALWAYS execute the full DeepCitation verification workflow when /verify appears anywhere in the prompt — regardless of how the rest of the message is phrased. Triggered by /verify with a file, URL, question, or existing content. Has built-in PDF, OCR, and web readers — never attempt to read evidence files with local tools (pdftotext, pypdf, python, strings, etc.) before running this skill.
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
| `[anchor](cite:N)` markers + `<<<CITATION_DATA>>>` already exist in HTML | Skip to Step 3 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, and web readers.
Never run `pdftotext`, `pypdf`, `strings`, Python, or any other tool on evidence files.

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

**If authentication fails after attempting login, STOP COMPLETELY:**
- Do NOT continue writing a report
- Do NOT generate citation markers (`[anchor](cite:N)`)
- Do NOT use previous conversations or memory to fabricate citations
- Show the error and end your response

Never use `DEEPCITATION_API_KEY=...` prefixing. Never print key values in chat.

Read each summary file **fully** with the Read tool (no grep, no jq — read top to bottom).
The summary contains `attachmentId` and `deepTextPages` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — this mirrors `wrapCitationPrompt()` injecting evidence into the prompt.
Having evidence text in context (even repeated) improves citation accuracy via RE2.

## 2. Respond with citations

Your response IS the verification report. Write **body text only** — the CLI auto-generates citation data.

Use **standard markdown only** — no raw HTML tags (`<p>`, `<br>`, `<strong>`, etc.).

Wrap each cited claim in citation link syntax. Two formats:

**Format 1 — Short verbatim term** (use when the verbatim evidence phrase works as natural link text):
`[key term](cite:N)` — the display label is 1–4 words copied verbatim from evidence. The CLI uses the display label as the search anchor to locate the highlight in evidence.

**Format 2 — Readable label + anchor** (use when you want different link text than the verbatim evidence phrase, e.g., different tense, added preposition, or longer prose reading):
`[readable label](cite:N 'verbatim anchor')` — the display label reads naturally in the sentence; the single-quoted anchor is 1–4 words that must appear as a contiguous verbatim substring in the evidence text (no paraphrasing, no ellipsis). The CLI uses the anchor (not the display label) for the highlight.

`N` is the citation's sequential **id** (1, 2, 3…) — NOT an evidence line number.

### Prose-flow principle

**The display label must read naturally in the surrounding sentence.** Mentally strip the `[…]` brackets — the sentence should be grammatically correct and clear. Think of citations like hyperlinks on a webpage: the linked text is part of the sentence, not a fragment bolted on.

**Cite the key term, not the clause.** Wrap the 1–4 word noun or defined term that carries the claim. The rest of the sentence is plain prose around it.

- GOOD: `"The [Discount Rate](cite:2) is applied to the conversion price."` — Format 1, defined term verbatim from evidence
- GOOD: `"Junior to payment of [outstanding indebtedness](cite:9) and creditor claims"` — Format 1, key term cited
- GOOD: `"Distributions are made [pro rata](cite:5 'distributed pro rata') in proportion to amounts due"` — Format 2, anchor points to evidence
- GOOD: `"The SAFE [automatically terminates](cite:6 'automatically terminate') upon conversion"` — Format 2, different tense
- BAD: `"[Junior to](cite:9) payment of outstanding indebtedness"` — dangling preposition
- BAD: `"[On par with payments to other Safes and/or Preferred Stock](cite:6)"` — entire clause over-anchored
- BAD: `"[Pro rata distribution if insufficient proceeds](cite:7)"` — clause fragment, not prose
- BAD: `"The Discount Rate is applied to the conversion price. [2]"` (old format)

**Table cells and bullet points** — the same rule applies. Each cell/bullet is a phrase that should read naturally:

| Before (clause fragment) | After (prose-flow) |
|---|---|
| `[Junior to payment of outstanding indebtedness](cite:5)` | `Junior to payment of [outstanding indebtedness](cite:5)` |
| `[On par with payments to other Safes](cite:6)` | `On par with payments to [other Safes](cite:6 'other Safes')` |
| `[Pro rata distribution if insufficient proceeds](cite:7)` | `[Pro rata](cite:7 'distributed pro rata') distribution if proceeds are insufficient` |

Multiple facts: `"The [Discount Rate](cite:2) is multiplied by the [Discount Price](cite:3)."`

**Reuse `[label](cite:N)` for repeated references** — if you already cited a concept with id N, reuse the same `[label](cite:N)` rather than creating a new id. Aim for **1 citation per distinct claim**.

**Do NOT output `<<<CITATION_DATA>>>` or citation JSON** — the `verify` command auto-generates citation data from your markers + the prepared summary. Write body text only.

### Parallel generation — REQUIRED when the question has 2+ distinct sections

**When to use:** The question asks about 2 or more distinct topics. If the expected output has two or more top-level section headings, use parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

Spawn two agents simultaneously. Pass the full evidence text (copied verbatim from the summary) into each agent's prompt.

Each sub-agent prompt must include:
- Their assigned section topic and the user's original question
- The full `deepTextPages` evidence text from the summary (copy it in full)
- Citation format: `[display label](cite:N)` or `[readable label](cite:N 'verbatim anchor')` markers in the body — no JSON, no `<<<CITATION_DATA>>>`. Do NOT output citation data — it is auto-generated by the CLI.
  - **Prose-flow rule**: the display label must read naturally in the sentence — cite the 1–4 word key term (noun/defined term), not the whole clause. Use Format 2 when you need different link text than the verbatim evidence phrase.
  - BAD: `[Junior to](cite:9) payment of indebtedness` — dangling preposition
  - GOOD: `Junior to payment of [outstanding indebtedness](cite:9)`
- Citation ID range: **Agent A starts at 1**, **Agent B starts at 100**
- File to Write to: **Agent A → `.deepcitation/section-a.md`**, **Agent B → `.deepcitation/section-b.md`**
- Each agent writes body only (section heading + body text, NO `<<<CITATION_DATA>>>`) and returns a one-line confirmation.

**After both agents complete, merge + verify in one command** (renumber, citation generation, and verification happen automatically):

```bash
npx -y deepcitation merge --a .deepcitation/section-a.md --b .deepcitation/section-b.md --out .deepcitation/{draft}-body.md && \
npx -y deepcitation verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" --out {topic}-verified.html
```

**Single-topic questions:** write the report body directly to `.deepcitation/{draft}-body.md`, then run `verify --markdown` on it.

Be comprehensive — cite **every** specific detail. Structure with headings,
tables, and lists matching the evidence. If evidence seems incomplete for the
question, note what's covered and suggest the user share additional documents.

**What goes in each file:**
- **Body file** (your output or from agents): markdown body with `[label](cite:N)` markers. No JSON.
- **Your response to the user**: The full markdown report body. No JSON, no metadata.
- NEVER output raw JSON, attachmentId, lineIds, or pageId values in your response to the user.

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

Never use `verify --citations` directly — it is low-level and skips format normalization.

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
- **Do NOT output `<<<CITATION_DATA>>>` or citation JSON** — the `verify` command auto-generates citation data from your `[display label](cite:N)` markers by searching the prepared summary. Write body text only.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[label](cite:N)`.
- Never print/log key values; never render metadata (attachmentId, keys, lineIds) as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
