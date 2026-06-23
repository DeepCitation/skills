# Playbook — discrepancy-report (secondary)

```yaml
id: discrepancy-report
use_when: >
  Secondary surface. Render ONLY the claims with missing or contradicting evidence — the failures
  that need human judgment. Use it as a focused triage section when the audit found contradicted or
  unmatched citations, so the reader confronts conflicts directly instead of hunting for rust badges
  in a long report. Never render it empty.
```

Open `npx -y lavish-axi playbook comparison` and `playbook table` before authoring. Reuse the shared
head/theme, design tokens, native-control contract, and portability rule from
[annotated-report.md](annotated-report.md).

## Choose

- Use when ≥1 citation is **contradicted** (source says otherwise) or **unmatched** (anchor failed
  to locate) — the cases that most need the judge panel and the human.
- If everything verified clean, **omit this surface entirely** — an empty discrepancy report implies
  failures that don't exist.
- Pair with `evidence-table` for the full record; this surface is the exception list.

## Structure (comparison: claim vs. what the source actually says)

1. Lead with the count and stakes: `alert alert-error alert-soft` — "2 claims could not be verified
   against the evidence."
2. One discrepancy card per failure (`card card-border`, `id="disc-3" data-cite-n="3"`), a
   side-by-side comparison:
   - **Claim asserts** (amber, `text-warning`) vs **Source says / not found** (rust, `text-error`),
     corresponding rows aligned so the divergence reads at a glance.
   - Show the concrete bytes — the claim text and the actual `sourceContext` (`f`) in mono — not an
     abstract "mismatch."
3. End each card with the resolution control, not a verdict the agent invented.

## Annotation targets

- Each `card` (`#disc-N`) is an annotation target — click to discuss the conflict.
- Both the "Claim asserts" prose **and** the "Source says" quote stay plain selectable text so the
  user can text-range either side to pinpoint mis-anchored vs. mis-paraphrased.
- Per-discrepancy native form (`data-lavish-question="disc-3"`, queued once on submit) with a
  `<select>` resolution: `Accept source (drop claim)` / `Re-anchor (agent retries)` /
  `Send to judge panel` / `Mark as my error`. "Re-anchor" and "Send to judge panel" are the explicit
  tier-3 triggers; their `data` payload carries `{ discrepancy:3, resolution }`.

## Badges

Card header badge is always `badge-error` ✕ **Contradicted** or `badge-warning` ◐ **Unmatched** —
keep the two distinct ("couldn't find" ≠ "source disagrees"; they lead to different resolutions).

## Pitfalls

- Never render empty or with manufactured conflicts — discrepancies must be real audit results.
- Don't collapse `unmatched` and `contradicted` into one status.
- After the panel resolves a discrepancy, remove its card and re-render; if all resolve, drop the
  whole section.
- Make the **cost** of each resolution as visible as the benefit — "Accept source" silently weakens
  the answer; label it so.
- Quoted source text must stay text-range-selectable (no native control).
