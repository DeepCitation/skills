# Run-time roster — tiered audit, judge panel, editor, layout browser

The shipped /verify run uses a **lean** roster. Most citations get one cheap pass; the expensive
panel fires only when a citation is a genuine semantic dispute or the user flags it. Tiers map to
the provider's small / medium / large model families:

- **fast/cheap tier** (small family) — the per-attachment cheap auditor.
- **mid tier** (medium family) — the bulk of the judge-panel votes.
- **reasoning tier** (most capable, large family) — one panel vote + the editor's reconciliation.

Default the cheap lanes to the fast tier; reserve the reasoning tier for the editor's judgment seat.

## The tiered trigger

```
EVERY citation     → cheap auditor (batched, pre-render)       → confidence badge
SEMANTIC DISPUTE   → judge panel (3 votes) + editor            → revised record + badge
   (weak/contradicts)
HUMAN-FLAGGED      → judge panel (3 votes) + editor            → revised record + badge
UNMATCHED ANCHOR   → deterministic `unmatched` badge, NO panel → re-anchor only on user request
HIGH + unflagged   → no further work
```

Escalate a citation to the panel when **any** of: the cheap auditor returns `weak`/`contradicts`
(a *semantic* doubt the panel can adjudicate); or the user flags it in the lavish loop (element
click or text-range).

**Do not auto-escalate a missing/imprecise anchor.** A clean `p`/`l` is a deterministic fact already
known before the cheap audit, and the panel cannot find an anchor the substring match could not
locate (it never re-locates either). So an unmatched anchor badges `unmatched` directly — spend a
retry on it only when the human asks via the discrepancy-report "Re-anchor" control, never as a
blanket pre-render trigger.

## 1. Cheap auditor (fast/cheap tier) — pre-render badge

Runs **before** the first render so the user opens a fully badged report, not a blank waiting
screen. **Batch it** — audit all citations for one attachment in a single pass (one fast-tier call
per attachment), not one call per citation; fanning out N calls for N citations is the very latency
the pre-render badge exists to avoid.

- **Tier:** fast/cheap by default; step up to the mid tier for dense legal/medical/technical evidence.
- **Judges only semantic support** — does `f`/`k` actually support claim `n`? "Located in the
  document" is the model's own coordinate-match self-report (SKILL.md step 3); the auditor does not
  re-locate, but it **must independently confirm `k` is a verbatim substring of the `<line>`-tagged
  source text** before honouring a `verified` badge — the prepared text makes that checkable.
- **Output per citation:** `verdict ∈ {supports, weak, contradicts}` + `confidence ∈ [0,1]`, mapped
  to a badge from the one legend below.

## Badge legend (single source of truth — all playbooks reference this)

| Badge | When | Glyph | Token (luxury theme) |
|---|---|---|---|
| `verified` (high) | located anchor + `supports` + confidence ≥ threshold | ✓ | `badge-success` (sage) |
| `review` (low) | `supports`/`weak` but low confidence | ◐ | `badge-warning` (amber) |
| `unmatched` | `k` not a verbatim substring / no clean `p`/`l` located | ⊘ | `badge-warning badge-outline` (amber outline) |
| `contradicted` | source contradicts the claim | ✕ | `badge-error` (rust) |

`unmatched` ("couldn't locate") and `review` ("located but low-confidence/weak") are **distinct
states with distinct glyphs** — never collapse them, and never collapse `unmatched` with
`contradicted` ("source disagrees"); they lead to different resolutions. Every badge carries a glyph
**and** a text label — never colour alone (colour-blind / print safe).

## 2. Adversarial judge panel (3 votes) — escalation only

Runs only for `weak`/`contradicted` semantic disputes or human-flagged citations.

- **Votes:** mid tier ×2 + reasoning tier ×1 (mid tier ×3 acceptable for low-stakes evidence). Each
  judge sees the claim, `f`, `k`, the located `p`/`l`, and — for human flags — the verbatim
  `target.text`.
- Each judge returns an independent verdict (`supports | weak | contradicts`) with a one-line
  reason. They do not see each other's votes.

## 3. Editor (reasoning tier) — reconcile + revise

One reasoning-tier pass reconciles the panel. **Mandatory output:** the final `verdict` + badge,
plus a one-line summary for the loop's `--agent-reply`.

- Resolves the 3 votes into the final `verdict` + badge.
- May correct the record: re-derive `k`/`l` if the complaint is "wrong location," or downgrade the
  badge if `f` does not actually support the claim. Honesty rule: a citation with no clean anchor is
  `review`/`unmatched`, never `verified`.
- *Optional:* on a split vote, add a one-line `varianceFootnote`; optionally mark the artifact's
  session-summary item as addressed. These are niceties — do not let them bloat the escalation pass.

## 4. Layout browser (lavish-axi)

The layout gate is agent-facing infrastructure, not a roster seat — but it gates the human. Before
involving the user, fix every `layout_warning` and re-render (see [lavish-loop.md](lavish-loop.md)).
Presence (`listening`/`working`) is shown by the chrome automatically while you poll; never surface
the raw layout warnings to the user.

> This is the **run-time** roster only. The build-time roster that authored this skill lives in the
> PR, not here.
