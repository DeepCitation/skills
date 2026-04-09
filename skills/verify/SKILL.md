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
| Prior chat OR a user-supplied file (e.g. `index.html`, `draft.md`) contains claims to verify | Use those claims **verbatim** — do NOT rewrite or rephrase them. Prepare the separate evidence document, then cite the existing claim text. |
| Claims about public/official subjects, no evidence | Web-search for primary sources (legislation, official reports, studies) |
| Existing verified HTML already produced by the CLI | Skip to Step 3 with `verify --html` |
| You prepared the claims file as evidence | Web-search for primary sources and re-prepare |
| Ambiguous (unclear which file is claims vs evidence) | Ask the user |

`prepare` is the **only** way to read evidence — it has built-in PDF, OCR, and web readers.

```bash
mkdir -p .deepcitation && npx -y deepcitation@latest prepare <file-or-url> --text > .deepcitation/<name>.txt 2>&1
```

Multiple sources: run all in parallel with `&` + `wait`.

If the output contains the literal phrase "action needed", authenticate. Auth failure is **recoverable**, not a hard stop. Use this exact command — it forces a pseudo-TTY so the browser OAuth flow works even when the shell has no TTY:

```bash
script -q -c "npx -y deepcitation@latest auth" /dev/null
```

`script` wraps the process in a pseudo-TTY, making `process.stdin.isTTY` return `true` inside Node. The browser opens via `explorer.exe`/`xdg-open`, completes the OAuth callback, and writes credentials to `~/.deepcitation/credentials.json`. Use a generous timeout (≥180s) because OAuth waits on a human. After it returns, **retry the same prepare command**.

**Do NOT stop and ask the user to authenticate.** This command is self-sufficient — run it yourself.

If `script` is unavailable or the above still prints `Non-interactive environment detected` (rare — cloud sandboxes with `DC_NON_INTERACTIVE=1`), fall back to the manual-key path:

1. Show the URL (`https://deepcitation.com/cli-auth?manual=true`) to the user **verbatim** and ask them to paste an `sk-dc-…` API key.
2. Once they paste `<the-key>`, run `npx -y deepcitation@latest auth --key '<the-key>'` to save it.
3. **Retry the original prepare command exactly once.** If it still fails, stop.

If the output contains "Update available", run `npm install -g deepcitation@latest`, then retry the command.

**Only stop completely if all of the above fail.** Show the full error and end your response. Reports require verified evidence from `prepare`.

Never use `DEEPCITATION_API_KEY=...` env-var prefixing in commands. Never print key values in chat.

### Environment notes — cloud sandboxes (Claude Cowork, etc.)

If you are running inside a cloud sandbox (detect via `$CLAUDE_CODE_REMOTE == "true"` for Cowork), the following constraints apply. Read this section once before invoking any `deepcitation` command in such an environment.

**The CLI is a single bundled binary.** `deepcitation` is published to npm with all of its HTTP transport (including `undici`) bundled inside. Installing additional packages (`npm install undici`, `npm install -g undici`, `npm install node-fetch`, etc.) **cannot affect** the bundled CLI's network behavior. Do not attempt this workaround under any circumstances — it will waste time and resolve nothing.

**Do not modify proxy environment variables.** Cowork sets `HTTP_PROXY` / `HTTPS_PROXY` to route egress through a sandbox-managed proxy. The bundled CLI auto-detects this and routes through it correctly. Overriding `HTTP_PROXY=""`, `HTTPS_PROXY=""`, or `NO_PROXY=api.deepcitation.com` on individual command invocations is **not a supported workaround** and is more likely to break the request than fix it.

**Expected command timing.** Use these as your "is this hung?" baseline:

| Command | Typical | Worst case | If exceeded |
|---------|---------|------------|-------------|
| `prepare` PDF | ~1 s | ~5 s | Almost certainly hung — abort and report |
| `prepare` URL or office file | ~5 s | ~30 s | Wait up to 60 s, then abort |
| `verify --markdown` | ~0.5 s | ~5 s | Almost certainly hung — abort and report |
| `auth --key '<key>'` | <1 s | ~2 s | Abort and report |

The CLI itself enforces a 90-second hard ceiling on every request and exits with a clear timeout error. **Do not extend this** by backgrounding the command with `&`, wrapping it in `for i in $(seq 1 24); do sleep 10`, `timeout 600 npx ...`, or any similar pattern. If the CLI hits its own timeout, the request is genuinely stuck — additional retries against the same endpoint will not succeed.

**When a command times out in a sandbox, the failure mode is the network layer, not the CLI logic.** Do not "simplify the input" (smaller markdown, fewer citations, blanker templates) hoping the API will respond — the API never received the request, or the response never reached you. Stop after one failure, surface the error verbatim, and let the user decide whether to retry, switch networks, or contact support.

**You may NOT fall back to building a "verified-looking" HTML report from your own knowledge of the document.** If `verify` cannot complete, the deliverable is not producible, full stop. Returning a hand-built HTML that mimics the verified format is worse than reporting the failure honestly — it presents unverified text as verified.

**Recognize structured CLI errors.** When the CLI fails with a transport-layer issue, it emits a final line on stderr beginning with `__DC_ERROR__` followed by JSON (e.g. `__DC_ERROR__ {"type":"timeout","phase":"response_headers","retryable":false,"recoverable":false,...}`). If `recoverable: false`, treat it as a hard stop — do not retry, do not try workarounds.

Read each summary file **fully** with the Read tool (no grep, no jq — read top to bottom).
The summary contains `attachmentId` and `deepTextPages` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — having evidence text in context (even repeated) improves citation accuracy via RE2.

> **CLI version:** `deepTextPages` requires the latest CLI. If your summary shows `deepTextPromptPortion` instead, run `npm install -g deepcitation@latest` and retry.

## 2. Respond with citations

Your response IS the verification report. Write body text with citation markers, then append a `<<<CITATION_DATA>>>` JSON block with coordinates.

Use **standard markdown only** — no raw HTML tags.

### Progressive disclosure

The reader experiences citations in three layers — each adds detail:

1. **Scan** — they skim the bolded terms to grasp the key facts. The bold text IS the verbatim source phrase — 1–4 exact words from the evidence.
2. **Highlight** — they click the bold term and see THOSE SAME WORDS highlighted in yellow in the evidence popover. The popover shows the full evidence paragraph (from `l` line IDs) with the anchor (`k`) highlighted in amber within it. If `k` = the entire paragraph, **no highlight is shown** — the anchor drowns in its own context.
3. **Explore** — the keyhole strip shows the anchor region in the original PDF image at readable size. Short anchors (1–4 words) stay crisp; very long anchors spread across the image and may lose readability.

**Hard rules** (all three must be satisfied — no trade-offs):
1. **Connection**: bold text and `k` must be identical (Format 1). The reader clicks the bold term and sees those exact words highlighted.
2. **Brevity**: bold text and `k` must be **≤4 words**. This is a HARD LIMIT, not a suggestion. When the evidence phrase is longer, truncate to the 2–3 most distinctive words — see examples below.
3. **Context**: `l` must include the anchor's line PLUS 1–2 adjacent lines, so the evidence paragraph is longer than the anchor. This makes the highlight visible within surrounding text.

### In-text markers

**Bold** 1–4 verbatim words from the evidence. The bold text must appear verbatim in the source — but you pick only the shortest distinctive substring (≤4 words), not the full phrase. Place `[N]` immediately after. One unique ID per distinct fact.

Example: The invoice totals **USD 4,350.00** [1] for services rendered by **Acme Corp** [2] on **March 15, 2024** [3].

**How to truncate long evidence phrases to ≤4 words:**
- "Junior to payment of outstanding indebtedness and creditor claims" → pick **Junior to payment** (3w) or **outstanding indebtedness** (2w) — the distinctive core
- "immediately following the earliest to occur of" → pick **earliest to occur** (3w)
- "without relieving the Company of any obligations arising from a prior breach" → pick **prior breach** (2w)
- "due and payable to the Investor immediately prior to the consummation" → pick **due and payable** (3w)
- "general assignment for the benefit of the Company's creditors" → pick **general assignment** (2w)
- "lower limit is the upper unfinished surface of the concrete ground floor slab" → pick **unfinished surface** (2w) or **concrete floor slab** (3w)
- "upper limit is the lower unfinished surface of the concrete slab above the Unit" → pick **slab above** (2w) or **unfinished surface** (2w)
- "backside surfaces of the drywall on the exterior walls of each unit" → pick **backside surfaces** (2w) or **exterior walls** (2w)
- "Owners and tenants of commercial units are responsible to ensure that they review the parking requirements" → pick **parking requirements** (2w)
- "the exclusive use of the interior east-west corridor and stairwell immediately north of the commercial units" → pick **east-west corridor** (3w) or **exclusive use** (2w)
- "Each parking unit shall be used and occupied only for motor vehicle parking purposes" → pick **motor vehicle parking** (3w) or **parking purposes** (2w)
- "no motor vehicle which contains a propane or natural gas propulsion system shall be parked" → pick **propane or natural gas** (4w) or **natural gas propulsion** (3w)

Pick the 2-3 words that a reader would recognize as the key term — the noun/concept, not the full clause.

### Citation data block

After the body text, append a `<<<CITATION_DATA>>>` block. **`k` must equal the bold text exactly** — they are the same 1–4 verbatim words from the evidence. NEVER more than 4 words in either bold or `k`.

Keys:

- **n**: Citation id (integer, matches `[N]` in text)
- **k**: Must equal the bold text in the body exactly — 1–4 verbatim words. NEVER more than 4.
  - BAD: bold = `"Junior to payment of outstanding indebtedness"` (6 words) — too long
  - GOOD: bold = `"outstanding indebtedness"` and k = `"outstanding indebtedness"` (identical, 2w, verbatim) ✓
  - BAD: bold = `"Equity Financing"` but k = `"when the company raises capital"` (bold ≠ k, different words)
  - GOOD: bold = `"Equity Financing"` and k = `"Equity Financing"` (identical) ✓
  - BAD: bold = `"lower limit is the upper unfinished surface of the concrete ground floor slab"` (13 words) — full clause, far too long
  - GOOD: bold = `"unfinished surface"` and k = `"unfinished surface"` (2w, verbatim, picks the distinctive noun) ✓
  - BAD: bold = `"shall be used and occupied only for motor vehicle parking purposes"` (11 words) — full clause
  - GOOD: bold = `"motor vehicle parking"` and k = `"motor vehicle parking"` (3w, verbatim) ✓
- **p**: Compact page id `"N_I"` (from `<page_number_N_index_I>` tag)
- **l**: Array of line IDs (from `<line id="N">` tags). **Include the anchor's line PLUS 1–2 adjacent lines** so the evidence paragraph has context around the highlight. If the anchor is on line 20, use `[19, 20, 21]` or at minimum `[19, 20]`. A single-line `l` risks the anchor filling the entire paragraph — which renders with **no visible highlight**.

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID": [
    {"n": 1, "k": "USD 4,350.00", "p": "1_0", "l": [13, 14, 15]},
    {"n": 2, "k": "Acme Corp", "p": "1_0", "l": [2, 3, 4]},
    {"n": 3, "k": "March 15, 2024", "p": "1_0", "l": [4, 5, 6]}
  ]
}
<<<END_CITATION_DATA>>>
```

Use the `attachmentId` from the prepare output as the group key.

### Parallel generation — REQUIRED when the question has 2+ distinct sections

**When to use:** The question asks about 2 or more distinct topics. If the expected output has two or more top-level section headings, use parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

Spawn two agents simultaneously. Pass the full evidence text (copied verbatim from the prepare output) into each agent's prompt.

Each sub-agent prompt must include:
- Their assigned section topic and the user's original question
- The full `deepTextPages` evidence text from the prepare output (copy it in full)
- Citation format: **bold** 1–4 verbatim words from the evidence — the exact source phrase. Place `[N]` after each bolded term. **`k` in CITATION_DATA must equal the bold text exactly** — they are the same verbatim phrase. The reader clicks the bold term and sees those same words highlighted. Example: `The invoice totals **USD 4,350.00** [1] for services by **Acme Corp** [2].` After the body, append a `<<<CITATION_DATA>>>` block with `n` (citation id), `k` (must equal bold text — 1–4 verbatim words, NEVER more than 4, NEVER a paraphrase), `p` (page id as `"N_I"` from `<page_number_N_index_I>`), `l` (line id array — include the anchor's line PLUS 1–2 adjacent lines for context, e.g. `[19, 20, 21]`). One unique ID per distinct fact. **Do NOT wrap the JSON in a markdown code fence** (no ```` ```json ```` ... ```` ``` ````). The `<<<CITATION_DATA>>>` / `<<<END_CITATION_DATA>>>` delimiters are the only wrappers the parser recognizes — a fence confuses the repair heuristic and produces a silent empty parse that breaks merge.
- Citation ID range: **Agent A starts at 1**, **Agent B starts at 100**
- File to Write to: **Agent A → `.deepcitation/section-a.md`**, **Agent B → `.deepcitation/section-b.md`**
- **Comprehensiveness**: extract every specific detail from the evidence — measurements, unit numbers, defined terms, thresholds. Distinguish categories (e.g., different types, parties, events) with separate subsections. A vague summary is a failure.
- Each agent writes body text only (section heading + cited body text) and returns a one-line confirmation that includes the section heading and approximate line count (e.g. "Written: ## Pet Policy — 18 lines"). If an agent returns nothing or reports failure, do not proceed to merge — report the error to the user.

**After both agents complete, merge + verify in one command** (renumber, citation generation, and verification happen automatically). Replace `{draft}` and `{topic}` with actual names (e.g. `lease-terms-body` and `lease-terms`):

```bash
npx -y deepcitation@latest merge --a .deepcitation/section-a.md --b .deepcitation/section-b.md --out .deepcitation/{draft}-body.md && \
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" --out {topic}-verified.html
```

**If merge exits non-zero** (e.g. `merge refusing to write output — citation parsing failed`), STOP the pipeline — do NOT proceed to verify, and do NOT retry the identical agent dispatch. The `&&` chain will naturally abort before verify runs; the failing section file has a malformed `<<<CITATION_DATA>>>` block. Diagnostic loop:

1. Read `.deepcitation/section-a.md` and `.deepcitation/section-b.md` with the Read tool. This overrides the "do not read files back" invariant — merge failure is a diagnostic condition, not exploratory reading.
2. Inspect each section's CITATION_DATA block for: empty or whitespace-only body between the delimiters, a markdown `` ```json `` fence wrapping the JSON, missing `n` field on citation objects, or truncated JSON.
3. Either (a) rewrite the broken section file yourself with a corrected block and re-run merge, or (b) re-dispatch the failing agent with an explicit note about the format error — include the merge stderr output verbatim in the new agent prompt so it can correct itself.

**Single-topic questions:** write the report body directly to `.deepcitation/{draft}-body.md`, then run `verify --markdown` on it.

### Comprehensiveness — answer every part of the question

**Cover ALL parts of the question equally.** Multi-part questions (e.g., "What are X? What about Y?") require thorough answers for each part — not a deep answer for the easy part and a shallow answer for the harder part. Before writing, scan the full evidence for every section/schedule/appendix that addresses each sub-question.

**Extract specific details.** Vague summaries fail. If the evidence contains measurements, unit numbers, defined terms, thresholds, or formulas — include them with citations. A response that says "boundaries are defined" without stating the actual boundary definitions is incomplete.

**Use structured sections.** If the evidence distinguishes categories (e.g., different unit types, different event types, different parties), your response must mirror those distinctions with separate subsections or table rows — not collapse them into a single vague paragraph.

Structure with headings, tables, and lists matching the evidence. If evidence seems incomplete for the question, note what's covered and suggest the user share additional documents.

**What goes in each file:**
- **Body file** (your output or from agents): markdown prose with `**bold term** [N]` markers and an appended `<<<CITATION_DATA>>>` block.
- **Your response to the user**: The full markdown report body — prose only.

## 3. Verify

Pick a clean output name matching the topic — the report lives in CWD, not `.deepcitation/`:

```bash
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" \
  --out {topic}-verified.html
```

If you skipped Step 1–2 because the HTML already had citation markers (triage row above), use `--html` instead:

```bash
npx -y deepcitation@latest verify --html {existing}.html \
  --title "Descriptive Report Title" \
  --out {topic}-verified.html
```

Run verify ONCE — do not edit the draft and re-verify. The API handles partial matches gracefully. If an anchor cannot be located in the evidence, the CLI flags it in output as unmatched — check the summary for typos or shorten the `k` value to a more distinctive term.

Do not use `verify --citations` directly — it is low-level and skips format normalization.

Options: `--style plain|report` (default: `report`), `--audience general|executive|technical|legal|medical` (default: `general`), `--theme auto|light|dark` (default: `auto`).

If the output contains "action needed", authenticate via the recovery flow in Step 1 (run `deepcitation auth`, TTY → browser, non-TTY → ask user for a key, then retry).

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

- **Minimum tool calls** — do not make exploratory calls (ls, Glob, Grep, extra Read) between pipeline steps. Do not read files back after writing them — **except when merge exits non-zero**, in which case read the section files to diagnose the format failure (see the post-merge failure block above). Single-topic pipeline: prepare → Read summary → Write body → Bash(verify+open). Multi-topic pipeline: prepare → Read summary → [Agent A ∥ Agent B] → Bash(merge+verify+open). Complete each step once.
- **Never run login proactively** — only run `deepcitation auth` if prepare or verify output contains the exact phrase "action needed". Do not run login as a precaution or to check auth status.
- **Run verify ONCE** — do not edit the draft and re-verify.
- **Write body text only** — bold key terms with `[N]` markers and append a `<<<CITATION_DATA>>>` block with coordinates (`n`, `k`, `p`, `l`). Do not include structural boilerplate or HTML in the body file.
- **Only the CLI produces HTML** — the verified HTML is created exclusively by `npx -y deepcitation@latest verify`. If you cannot run the CLI, stop and report the error.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Never install npm packages to "fix" CLI behavior.** The `deepcitation` CLI is a bundled binary; external packages (`undici`, `node-fetch`, `axios`, etc.) cannot affect its network stack. The only valid CLI install/upgrade is `npm install -g deepcitation@latest`, and only when the CLI itself prints "Update available".
- **Never modify proxy environment variables on individual command runs.** No `HTTP_PROXY=`, `HTTPS_PROXY=`, `NO_PROXY=` prefixing. The CLI handles proxies automatically. If a request fails despite this, surface the failure — do not work around it.
- **Never extend command timeouts via shell wrappers.** No `&` backgrounding, no `for i in $(seq …); do sleep N`, no `timeout 600 npx ...`. The CLI's built-in 90-second ceiling is authoritative; exceeding it means the request is broken, not slow.
- **Never fall back to a hand-built HTML report when the CLI fails.** If `verify` cannot complete, the deliverable does not exist. Producing a verified-looking HTML from your own knowledge of the source document misrepresents unverified text as verified.
- **Citation density** — one citation per distinct claim; let the content and question drive the count. Avoid redundant citations for the same fact by reusing an existing `[N]` reference — each `n` only needs one entry in the `<<<CITATION_DATA>>>` block.
- Never expose API keys or render internal metadata as visible content
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
