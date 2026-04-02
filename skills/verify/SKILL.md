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
The summary contains `attachmentId` and `deepTextPromptPortion` (evidence text with
`<page_number_N_index_I>` and `<line id="N">` tags). Reading it into context IS the
mechanism — this mirrors `wrapCitationPrompt()` injecting evidence into the prompt.
Having evidence text in context (even repeated) improves citation accuracy via RE2.

## 2. Respond with citations

Your response IS the verification report. The citation format is below — do NOT run `verify --prompt`.

Use **standard markdown only** — no raw HTML tags (`<p>`, `<br>`, `<strong>`, etc.).
The CLI's markdown→HTML converter handles formatting; raw tags render as literal text.

Wrap the key phrase in citation link syntax: `[anchor text](cite:N)` — the link label must be identical to the `anchorText` value in the JSON block below.

`N` is the citation's sequential **id** (1, 2, 3…) from the JSON block below — NOT
an evidence line number.

- GOOD: `"The [Discount Rate](cite:2) is applied to the conversion price."`
- GOOD: `"- [Junior to](cite:9) payment of outstanding indebtedness"`
- GOOD: `"A [Dissolution Event](cite:13) means a liquidation..."` — article before term is fine; cite wraps the term
- BAD: `"The Discount Rate is applied to the conversion price. [2]"` (old format)
- BAD: `"The [Discount Rate is applied to the conversion price](cite:2)."` (anchor too long — use 1–3 word key term, not the whole clause)
- BAD: `"The [discount rate](cite:2) is applied to the conversion price."` (label casing differs from `anchorText` "Discount Rate" — link label must match exactly)
- BAD: `"- [Junior to payment of outstanding indebtedness](cite:9)"` (entire bullet over-anchored — cite wraps the key term only, not the full clause)
- BAD: `"A [13] Dissolution Event means..."` or `"a [2] Purchase Amount on..."` — marker placed BEFORE the term; the cite link must wrap the term itself
- BAD: `"[[2]] Purchase Amount"` or `"[[Dissolution Event](cite:13)]"` — never double-bracket the marker or the link

Multiple facts in one sentence: `"The [Discount Rate](cite:2) is multiplied by the [lowest price](cite:3)."`

At the end, append the citation data block grouped by `attachmentId`:

```
<<<CITATION_DATA>>>
{
  "ATTACHMENT_ID": [
    {"id": 1, "reasoning": "why", "fullPhrase": "verbatim quote", "anchorText": "key phrase", "pageId": "page_number_N_index_I", "lineIds": [12]}
  ]
}
<<<END_CITATION_DATA>>>
```

For each citation, think in this order (CoT):
1. **reasoning** — why does this support the claim?
2. **fullPhrase** — copy 1–2 sentences VERBATIM from evidence (≤250 chars).
   Must be significantly longer than anchorText — it provides the surrounding context.
3. **anchorText** — pick **1–3 words** from your fullPhrase. **Max 4 words.** This is
   the clickable label highlighted in the evidence. It must be a contiguous verbatim
   substring of fullPhrase. Pick the **distinctive noun or term**, not the surrounding
   verb phrase.

   Examples — always pick the short distinctive core:
   - "multiplied by the Discount Rate" → **"Discount Rate"** (not the verb phrase)
   - "Purchase Amount divided by the Discount Price" → **"Discount Price"**
   - "Junior to payment of outstanding indebtedness" → **"Junior to"**
   - "a voluntary termination of operations" → **"voluntary termination"**
   - "distributed pro rata in proportion to..." → **"pro rata"**
   - "this Safe will automatically convert into..." → **"automatically convert"**
   - "a Change of Control, a Direct Listing or an IPO" → **"Change of Control"**
   - "not entitled, as a holder of this Safe, to vote" → **"not entitled"** (not "not entitled...to vote" — words must be adjacent)
   - "receive a portion of Proceeds equal to the Cash-Out Amount" → **"Cash-Out Amount"** (the distinctive label, not the verb phrase)
   - "Neither this Safe nor the rights in this Safe are transferable or assignable" → **"transferable or assignable"** ✓ | ~~"not transferable"~~ ✗ ("not" is far away from "transferable")
   - "SAFE (Simple Agreement for Future Equity)" → **"SAFE"** ✓ | ~~"Simple Agreement for Future Equity"~~ ✗ (use the abbreviation, not the 5-word expansion)

   **Never** use the entire fullPhrase as the anchor. Never invent labels not in the text.
   **Never** use `...` or ellipsis to skip words — the anchor must be contiguous.

Use `pageId` from `<page_number_N_index_I>` tags and `lineIds` from `<line id="N">` tags.

Be comprehensive — cite **every** specific detail. Structure with headings,
tables, and lists matching the evidence. If evidence seems incomplete for the
question, note what's covered and suggest the user share additional documents.

Choose a descriptive report filename based on the topic (e.g., `yc-safe-analysis.md`,
`q4-revenue-review.md`). Save the draft in `.deepcitation/` (scratch space).

**What the user sees vs. what the file contains:**
- **Print to the user**: Only the markdown report body (headings, paragraphs, citation links). No JSON.
- **Save to the file**: Report body + `<<<CITATION_DATA>>>` JSON block at the end.
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

- **Run verify ONCE** — do not edit the draft and re-verify. Do not programmatically validate fullPhrase lengths.
- **Never generate citations without evidence** — if auth or network fails, show the error and stop. See Step 1 for auth failure behavior.
- **Citation ids must be consistent in both directions** — every `id` (1, 2, 3…) in `<<<CITATION_DATA>>>` must have a corresponding `[anchor](cite:N)` link in the body, and every `cite:N` link in the body must have a matching `id` in the JSON block. No orphaned citations in either direction.
- Never print/log key values; never render metadata (attachmentId, keys, lineIds) as visible content
- Never output `<<<CITATION_DATA>>>` JSON in your response to the user — it goes ONLY in the saved draft file
- Always "DeepCitation" (not "DeepCite"); always produce an HTML artifact

ARGUMENTS: $ARGUMENTS
