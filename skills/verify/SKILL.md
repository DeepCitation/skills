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

Wrap each cited claim in `[display label](cite:N)` syntax. Choose display labels that are **short phrases (1–5 words) appearing verbatim or near-verbatim in the evidence**. The `verify` tool auto-searches the evidence for your display label to locate the correct line. Verbatim labels produce the best highlights; light paraphrasing also works (the tool tries progressively shorter prefixes until a match is found).

`N` is the citation's sequential **id** (1, 2, 3…) — NOT an evidence line number.

- GOOD: `"The [Discount Rate](cite:2) is applied to the conversion price."` — verbatim from doc
- GOOD: `"- [Junior to](cite:9) payment of outstanding indebtedness"` — verbatim from doc
- GOOD: `"[pro rata distribution](cite:5)"` — doc says "distributed pro rata"; tool finds "pro rata" via truncation
- GOOD: `"[SAFE automatically terminates](cite:6)"` — doc says "automatically terminate"; tool finds it via truncation
- BAD: `"The Discount Rate is applied to the conversion price. [2]"` (old format)
- BAD: `"The [Discount Rate is applied to the conversion price](cite:2)."` (display label too long — keep to 1–5 words)
- BAD: `"- [Junior to payment of outstanding indebtedness](cite:9)"` (entire bullet over-anchored)
- BAD: `"A [13] Dissolution Event means..."` (marker before term)
- BAD: `"[[2]] Purchase Amount"` (double-bracket)

Multiple facts: `"The [Discount Rate](cite:2) is multiplied by the [lowest price](cite:3)."`

**Reuse `(cite:N)` for repeated references** — if you already used `[label](cite:N)` for a concept, reuse `(cite:N)` rather than creating a new marker. Aim for **1 citation per distinct claim**.

**Do NOT output `<<<CITATION_DATA>>>` or citation JSON** — the `verify` command auto-generates citation data from your markers + the prepared summary. Write body text only.

### Parallel generation — REQUIRED when the question has 2+ distinct sections

**When to use:** The question asks about 2 or more distinct topics. If the expected output has two or more top-level section headings, use parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

Spawn two agents simultaneously. Pass the full evidence text (copied verbatim from the summary) into each agent's prompt.

Each sub-agent prompt must include:
- Their assigned section topic and the user's original question
- The full `deepTextPages` evidence text from the summary (copy it in full)
- Citation format: `[display label](cite:N)` markers in the body — no JSON, no `<<<CITATION_DATA>>>`. Labels should be 1–5 words verbatim or near-verbatim from the evidence. Do NOT output citation data — it is auto-generated by the CLI.
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
- **Do not output citation JSON** — no `<<<CITATION_DATA>>>` block, no JSON data. The `verify` command auto-generates citation data from your `[display label](cite:N)` markers by searching the prepared summary. Write body text only.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reuse of an existing `(cite:N)`.
- Never print/log key values; never render metadata (attachmentId, keys, lineIds) as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
