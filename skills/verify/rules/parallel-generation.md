# Parallel Generation

Use this pipeline when the evidence has **100 or more pages** AND the question spans **2 or more distinct topics**.

## When to use

If the expected output has two or more top-level section headings and the document is 100+ pages, spawn parallel agents. **You MUST use the parallel path when the Agent tool is available.**

**If the Agent tool is unavailable**, write both sections yourself in sequence.

## How to split and write tagged evidence files

Spawn two agents simultaneously. Split the `deepTextPages` array by **page range** — Agent A gets the first half, Agent B gets the second half. Add a small overlap (2–3 pages) so both agents see shared introductory or framework sections. **Do not split by topic** — agents must only quote from their own assigned pages, which eliminates f-fabrication (the main failure mode on large documents).

When you write `.deepcitation/evidence-a.txt` / `.deepcitation/evidence-b.txt`, each page **must** be wrapped in a `<page_number_N_index_I>` tag and its lines tagged with `<line id="K">` markers. Subagents copy these tags verbatim into `p` and `l` fields — when they're missing, the subagent has nothing to copy and will confabulate `page_id`/`line_ids` from the file's global line offset, producing citations with `pageNumber > pdfPageCount` that 404 in the viewer. The original page index (1-based) from `deepTextPages` must be preserved in the tag — do NOT renumber pages starting at 1 for each agent's chunk.

```python
from pathlib import Path

pages = data["deepTextPages"]          # list from prepare JSON
mid = len(pages) // 2
overlap = 2                            # shared pages at the boundary
# Keep each chunk's ORIGINAL page indices (1-based in the tag, 0-based in index_I).
agent_a_pages = [(i + 1, pages[i]) for i in range(0, mid + overlap)]
agent_b_pages = [(i + 1, pages[i]) for i in range(mid - overlap, len(pages))]

def render_chunk(chunk):
    parts = []
    for page_num, page_text in chunk:
        tagged_lines = []
        # Include ALL lines (blank and non-blank) so idx+1 matches the CLI's 1-based line ids.
        raw_lines = page_text.split("\n")
        for idx, line in enumerate(raw_lines):
            # Tag first line, last line, and every 5th line — matches the CLI renderer.
            if idx == 0 or idx == len(raw_lines) - 1 or (idx + 1) % 5 == 0:
                tagged_lines.append(f'<line id="{idx + 1}">{line}</line>')
            else:
                tagged_lines.append(line)
        body = "\n".join(tagged_lines)
        idx0 = page_num - 1
        parts.append(f"<page_number_{page_num}_index_{idx0}>\n{body}\n</page_number_{page_num}_index_{idx0}>")
    return "\n".join(parts)

Path(".deepcitation/evidence-a.txt").write_text(render_chunk(agent_a_pages))
Path(".deepcitation/evidence-b.txt").write_text(render_chunk(agent_b_pages))
```

Validate both files before dispatching:
```bash
grep -cP '^<page_number_' .deepcitation/evidence-a.txt  # should equal Agent A's chunk size
grep -cP '^<page_number_' .deepcitation/evidence-b.txt  # should equal Agent B's chunk size
```
If either count is 0, the file is raw text and the pipeline will confabulate citations — **re-write the file with tags before dispatching**.

## Agent prompt requirements

Each sub-agent prompt must include:
- Their assigned page range (e.g. "pages 1–{mid+overlap} of {total}") and the user's original question
- Their page range evidence text — tell the agent to **read the file** at the path you provide (do not paste the full text inline)
- **Citation format — Format 1 ONLY for verifiable citations**:
  - The ONLY format that verifies correctly is **Format 1**: `**k** [N]` where bold text `**k**` is placed **immediately before** `[N]` with no intervening text.
  - **Do NOT use Format 2** (`[claimText](cite:N 'k')`) for citations that must pass CLI verify — the verify CLI auto-promotes k to the display text (claimText), ignoring the tick-quoted sourceMatch. This was proven broken in alignment iter4 (55 Format 2 citations, 0 verified).
  - Format 2 is only valid for HTML display in the web app (hydrate.ts handles it), NOT for the verify pipeline.
  - **Correct inline pattern**: `prose context **k** [N] continuation`. If the terse sourceMatch appears mid-sentence, bold just those words, place `[N]` immediately after the closing `**`, then continue prose. Example: "the system aims to make AI systems **human intentions and values** [1] compliant." NOT: "the system aims to make AI systems **human intentions and values** compliant [1]."
- **CITATION_DATA block** — append after body, fields in CoT order: `n`, `r`, `f`, `k`, `p`, `l`
  - `k` = the bold term, identical to the bold text in the body (auto-promotion makes them the same anyway)
  - `p` format: `page_number_N_index_I` — **copy verbatim** from the nearest enclosing `<page_number_N_index_I>` tag above your quoted text in the evidence file. Never invent a page_id from a line count or file offset. If you cannot find an enclosing tag, STOP and report the evidence file as malformed — do not guess.
  - `l` field — each line id must come from an actual `<line id="K">` tag in the same enclosing page block. For lines without an explicit tag, count from the nearest tag above (e.g. `<line id="10">` + 3 lines down = `[13]`). `l` values are **per-page**, not per-file — a 50-line page has line ids in `[1..50]`, never `[1009, 1010]`. If any `l` value exceeds the page's last `<line id>`, you are confabulating — re-locate your evidence and recount.
  - **Do NOT wrap JSON in a code fence** — `<<<CITATION_DATA>>>` / `<<<END_CITATION_DATA>>>` are the only wrappers
  - Example: `{"n": 1, "r": "states invoice total", "f": "The invoice total is USD 4,350.00 for services rendered.", "k": "USD 4,350.00", "p": "page_number_1_index_0", "l": [13, 14, 15]}`
- **CoT gate (runs first)**: before writing any `**bold term**`, locate the sentence in the evidence that proves the claim and write it as `f` (`sourceContext`). Then extract `k` (`sourceMatch`) from that sentence. If your planned key phrase doesn't appear word-for-word in `f`, it's a paraphrase — fix `f` first, then re-derive `k`. If no short verbatim phrase in `f` can serve as `k`, bold the closest literal term that does appear word-for-word — never invent or paraphrase.
- **Terse `sourceMatch` gate**: ask *"What 2–3 words would I Ctrl+F to find this fact in a 50-page document?"* — that is `k`. NEVER bold a full clause that restates the claim. Fact types → correct `k`: dollar amount → `USD 4,350.00`; time limit → `two (2) weeks`; priority tier → `Senior to`; trigger mechanism → `automatically convert`. If you reach 5+ words, you are citing context that belongs in prose — drop the leading quantifier/adjective, keep the noun head or key verb.
- **[N] adjacency — HARD RULE**: `[N]` must appear **immediately after** `**k**` with zero words between. BAD: `**RLHF** trains reward models [11]`. GOOD: `**RLHF** [11] trains reward models` (prose continues after `[N]`). If the bold marker falls mid-sentence, move `[N]` to immediately follow the closing `**`, then continue prose after `[N]`.
- **Unique citation IDs — HARD RULE**: Every `[N]` integer must be **unique** across the entire section file. Never reuse the same number for a different fact. Each new fact = new integer. If you are citing two different sentences about the same topic, assign them different n values (e.g., n=7 and n=8), not both n=7.
- **Bold label must equal k exactly**: The bold text `**like this**` must be word-for-word identical to the `"k"` field in CITATION_DATA. They must match exactly — same words, same case, same punctuation.
- Citation ID range: **Agent A starts at 1**, **Agent B starts at 100**
- File to Write to: **Agent A → `.deepcitation/section-a.md`**, **Agent B → `.deepcitation/section-b.md`**
- **Comprehensiveness**: extract every specific detail from the evidence — measurements, unit numbers, defined terms, thresholds. Distinguish categories (e.g., different types, parties, events) with separate subsections. A vague summary is a failure.
- Each agent writes body text only (section heading + cited body text + `<<<CITATION_DATA>>>` block) and returns a one-line confirmation that includes the section heading and approximate line count (e.g. "Written: ## Pet Policy — 18 lines"). If an agent returns nothing or reports failure, do not proceed to merge — report the error to the user.

## Merge and verify

After both agents complete, merge + verify in one command (renumber, citation generation, and verification happen automatically). Replace `{draft}` and `{topic}` with actual names (e.g. `lease-terms-body` and `lease-terms`):

```bash
npx -y deepcitation@latest merge --a .deepcitation/section-a.md --b .deepcitation/section-b.md --out .deepcitation/{draft}-body.md && \
npx -y deepcitation@latest verify --markdown .deepcitation/{draft}-body.md \
  --title "Descriptive Report Title" \
  --claim "The user's question or claim being verified" \
  --model "<model-name>" \
  --out {topic}-verified.html
```

## Merge failure

**If merge exits non-zero** (e.g. `merge refusing to write output — citation parsing failed`), STOP the pipeline — do NOT proceed to verify, and do NOT retry the identical agent dispatch. The `&&` chain will naturally abort before verify runs; the failing section file has a malformed `<<<CITATION_DATA>>>` block. Diagnostic loop:

1. Read `.deepcitation/section-a.md` and `.deepcitation/section-b.md` with the Read tool. This overrides the "do not read files back" invariant — merge failure is a diagnostic condition, not exploratory reading.
2. Inspect each section's CITATION_DATA block for: empty or whitespace-only body between the delimiters, a markdown `` ```json `` fence wrapping the JSON, missing `n` field on citation objects, or truncated JSON.
3. Either (a) rewrite the broken section file yourself with a corrected block and re-run merge, or (b) re-dispatch the failing agent with an explicit note about the format error — include the merge stderr output verbatim in the new agent prompt so it can correct itself.
