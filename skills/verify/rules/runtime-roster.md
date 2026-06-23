# Run-time roster — tiered audit, judge panel, editor, layout browser

The shipped /verify run uses a **lean** roster. Most citations get one cheap pass; the expensive
panel fires only when a citation looks weak or the user flags it. Default cheap lanes to sonnet;
reserve opus for the editor's judgment seat.

## The tiered trigger

```
EVERY citation  → cheap auditor (1 pass, pre-render)        → confidence badge
LOW confidence  → judge panel (3 votes) + editor            → revised record + badge
HUMAN-FLAGGED   → judge panel (3 votes) + editor            → revised record + badge
HIGH + unflagged→ no further work
```

Escalate a citation when **any** of: the cheap auditor returns `review`/`contradicted`; audit
confidence is below threshold; the coordinate match did not locate a clean `p`/`l` anchor (imprecise
or not found); or the user flags it in the lavish loop (element click or text-range).

## 1. Cheap auditor (haiku / sonnet) — pre-render badge

One pass per citation, **before** the first render, so the user opens a fully badged report rather
than a blank waiting screen.

- **Model:** haiku by default; sonnet for dense legal/medical/technical evidence.
- **Judges only semantic support** — does `f`/`k` actually support claim `n`? The coordinate match
  already supplies the deterministic "located in the document" signal; the auditor never re-locates.
- **Output per citation:** `verdict ∈ {supports, weak, contradicts}` + `confidence ∈ [0,1]`, mapped
  to a badge:

  | Badge | When | Token (luxury theme) |
  |---|---|---|
  | `verified` (high) | located anchor + `supports` + confidence ≥ threshold | `badge-success` (sage) ✓ |
  | `review` (low) | `weak`, low confidence, or imprecise/missing anchor | `badge-warning` (amber) ◐ |
  | `contradicted` | source contradicts the claim | `badge-error` (rust) ✕ |

  Every badge carries a glyph + text label, never colour alone (colour-blind / print safe).

## 2. Adversarial judge panel (3 votes) — escalation only

Runs only for `review`/`contradicted` or human-flagged citations.

- **Votes:** sonnet ×2 + opus ×1 (sonnet ×3 acceptable for low-stakes evidence). Each judge sees
  the claim, `f`, `k`, the located `p`/`l`, and — for human flags — the verbatim `target.text`.
- Each judge returns an independent verdict (`supports | weak | contradicts`) with a one-line
  reason. They do not see each other's votes.

## 3. Editor (opus) — reconcile + revise

One opus pass reconciles the panel:

- Resolves the 3 votes into the final `verdict` + badge; on a split, writes a one-line
  `varianceFootnote`.
- May correct the record: re-derive `k`/`l` if the complaint is "wrong location," or downgrade the
  badge if `f` does not actually support the claim. Honesty rule: a citation with no clean anchor
  is `review` or `contradicted`, never `verified`.
- Emits what changed so the loop can `--agent-reply` a one-line summary and mark the artifact's
  session-summary item as addressed.

## 4. Layout browser (lavish-axi)

The layout gate is agent-facing infrastructure, not a roster seat — but it gates the human. Before
involving the user, fix every `layout_warning` and re-render (see
[lavish-loop.md](lavish-loop.md)). Surface "Optimising layout…" presence to the user, never the raw
warnings.

> This is the **run-time** roster only. The build-time roster that authored this skill lives in the
> PR, not here.
