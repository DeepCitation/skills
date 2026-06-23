# Playbook — annotated-report (HERO)

```yaml
id: annotated-report
use_when: >
  The default /verify surface. Render the verified narrative as flowing prose with inline [n]
  citation anchors, each confidence-badged after the cheap audit. Use whenever the user asked a
  question answered from evidence, or handed over claims to fact-check, and wants to read the
  answer as a report. Reach for evidence-table or discrepancy-report only as secondary sections
  off this one.
```

This is also the **artifact-emission reference** for all three surfaces: the head/theme, the
citation-anchor element, badges, native per-citation controls, and the portability rule below apply
everywhere. Before writing HTML, run `npx -y lavish-axi playbook plan`, `playbook input`, and
`npx -y lavish-axi design`.

## Choose

- Annotated report when the deliverable is a **narrative answer** read as prose — citations live
  inside sentences.
- Drop to `evidence-table` when the answer is a set of like-shaped records compared field-by-field.
- Add a `discrepancy-report` section only when ≥1 citation is `review`/`contradicted` — never
  fabricate discrepancies to fill it.

## Head + theme (shared)

`<html data-theme="luxury">` gives the dark-ink + cream + brass palette for free. Paste the pinned
CDN snippet and the layout-safety CSS from `npx -y lavish-axi design` verbatim into `<head>` —
verification reports are badge-dense with monospace line ids, exactly the overflow case the gate
blocks on. Semantic mapping: **sage = agent/verified** (`badge-success`/`text-success`),
**amber = user/review** (`badge-warning`/`text-warning`), **rust = contradiction**
(`badge-error`/`text-error`). Serif for narrative prose, sans for chrome, mono for `sourceMatch`
echoes and `p`/`l` ids.

## Structure

1. **Hero header** — the verified claim/question in serif, plus a `stats` strip
   (`Verified N` / `Review N` / `Contradicted N`) so the verdict shape reads before a word.
2. **Agent-presence bar** (`chat-start`, sage, `data-lavish-ui`) — streamed `waiting/listening/working`.
3. **Sticky review banner** when any `review`/`contradicted` exist: "N citations need review" with
   a jump link (a native `<details>`/sticky `<div>` — not an annotation target).
4. **The narrative** in `max-w-prose`, each cited fact carrying an inline anchor + badge.
5. **Per-citation triage rail** — a collapsed `collapse` with the native status/escalate form.
6. **Session summary** (`<details>`) listing each feedback item as Addressed / Deferred — the
   user's pre-end checklist; the agent updates it each re-render.

## The citation anchor (load-bearing)

Each citation is a single clickable container so a click round-trips a stable `selector`, and the
cited prose stays plain selectable text so a text-range flags the exact misquoted bytes.

```html
<span id="cite-3" data-cite-n="3" data-status="found" data-confidence="high"
      data-page="page_number_1_index_0" data-lines="[13,14,15]"
      class="cursor-pointer">
  <strong>USD 4,350.00</strong><sup class="ml-0.5 text-warning">[3]</sup>
  <span class="badge badge-xs badge-soft badge-success align-middle ml-1 tooltip"
        data-lavish-action data-tip="cheap audit: anchor matched · 0.91">✓ verified</span>
</span>
```

- `#cite-3` is a plain element (not a native control) → a click annotates it and `poll` returns
  `selector:"#cite-3"`. **Never wrap cited prose in a `<button>`/`<label>`** — that suppresses
  text-range selection, the most valuable flag for a citation tool.
- The badge gets `data-lavish-action` so clicking the badge itself does not annotate a meaningless
  sub-element; the whole `#cite-N` unit is the target.
- `data-status`/`data-confidence` drive the badge class; re-render just flips the class and keeps
  the same `id` so scroll/annotation stay anchored. Add `data-changed="true"` on a badge whose tier
  changed since the last render so a CSS pulse highlights it.

## Per-citation native controls (reversible, submit once)

```html
<form data-lavish-question="cite-3"
      onsubmit="event.preventDefault();const f=new FormData(event.currentTarget);
                window.lavish.queuePrompt(
                  'Re-grade citation [3]: status='+f.get('status')+(f.get('escalate')?' — escalate':''),
                  { selector:'#cite-3', data:{ citation:3, status:f.get('status'), escalate:!!f.get('escalate') } });">
  <select name="status" class="select select-sm">
    <option value="verified" selected>Verified</option>
    <option value="review">Review</option>
    <option value="contradicted">Contradicted</option>
  </select>
  <label class="label cursor-pointer gap-2">
    <input type="checkbox" name="escalate" value="1" class="checkbox checkbox-sm checkbox-warning">
    <span class="label-text">Escalate to judge panel</span>
  </label>
  <button type="submit" class="btn btn-sm btn-primary">Queue this verdict</button>
</form>
```

- `<select>`/`<checkbox>`/`<button>` are native → interactive for free, never annotation targets,
  and queued **once** on submit (never on per-`change`).
- `data-lavish-question="cite-3"` dedupes pre-send edits to citation 3 so only the final choice is
  sent (queue-key dedup).
- A final `Send all feedback` button (`data-lavish-action`) calls
  `window.lavish.sendQueuedPrompts()`.

## Portability rule

The artifact opens directly in a browser without the lavish server. Implement all **read-only**
interactions (badge tooltip, source popover from `f`/`k`, scroll-to-evidence-row) as self-contained
JS in the artifact — never as `window.lavish.*` calls, which 404 without the server. Use
`window.lavish.*` only for the feedback loop (`queuePrompt`, `sendQueuedPrompts`, `setStatus`).

## Pitfalls

- Don't make a cited span a native control — kills misquote text-range flagging.
- Don't queue on `<select>` change — only on form submit.
- Don't render status as colour only — glyph + label always.
- Don't show `verified` for a citation the panel hasn't upgraded — `review` is the honest default.
- Don't invent new surfaces for presence/badges — reuse `chat`, `badge`, `stat`, `collapse`.
