# Playbook — evidence-table (secondary)

```yaml
id: evidence-table
use_when: >
  Secondary surface. The answer is a set of like-shaped records compared field-by-field:
  claim × source × page/line × status. Reach for it when the evidence is line items, contract
  clauses, parties, or thresholds — many small facts of the same shape — rather than a narrative.
  Usually a tab or section off the annotated-report hero.
```

Open `npx -y lavish-axi playbook table` and `playbook input` before authoring. Reuse the shared
head/theme, design tokens, badge classes, native-control contract, and portability rule from
[annotated-report.md](annotated-report.md).

## Choose

- A table when every row shares `{ claim, sourceMatch, page·line, status }` and the reader scans a
  status column.
- The hero `annotated-report` when the facts only make sense inside sentences.
- Add a `stats` summary row above when counts or risk change how the table is read.

## Structure

1. Summary line above the grid: "12 claims checked against `lease.pdf` — 9 verified, 2 review,
   1 contradicted." Never bury the conclusion below the table.
2. Columns grouped by the decision they support: **Claim** · **Source match / page·line** ·
   **Status** · **Action**.
3. `table table-zebra` inside `overflow-x-auto rounded-box border border-base-content/5` so long
   paths and line ids never overflow the gate. `font-mono` on page·line ids; `overflow-wrap:anywhere`
   on the claim cell.

## Annotation targets

- Each `<tr id="row-3" data-cite-n="3">` is an annotation target — a click round-trips
  `selector:"#row-3"` and resolves to citation 3.
- The **Source match** cell stays plain selectable text so the user can text-range-flag the exact
  verbatim phrase the agent claims is in the source (misquote detection). Do **not** make it a
  native control.
- The **Action** column holds the per-row native form (`<select>` status + `escalate` checkbox)
  wrapped in `data-lavish-question="row-3"`, queued once on submit — identical contract to the hero
  so re-render logic is shared.
- Clicking a `[n]` anchor in the hero narrative should also highlight the matching `#row-N` here
  (self-contained JS via `data-cite-n` linkage), so the two surfaces stay correlated.

## Badges

Status column = `badge badge-soft` success/warning/error + glyph (✓ ◐ ✕) + label, aligned in one
scannable column. Optional `badge-outline` severity chip next to `contradicted` rows.

## Pitfalls

- Semantic `<table>` markup only — never a screenshot or pasted terminal table.
- Sort/group `contradicted` and `review` rows to the top (or add a `stats` strip) so they don't hide
  in a long grid.
- Source-match cell must remain text-range-selectable.
- Status is never colour-only.
