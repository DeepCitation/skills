# lavish-axi loop — command contract

lavish-axi renders the annotated report and runs the annotate→poll→reply loop. Use **only** these
verbs and flags; do not invent others.

| Command | Use |
|---|---|
| `npx -y lavish-axi <file.html>` | Open/resume the session. Runs the open-time **layout gate** unless `--no-gate`. Add `--no-open` to ensure the server/session exists without launching another browser. |
| `npx -y lavish-axi poll <file.html>` | Long-poll until the user acts or the browser reports fresh `layout_warnings`. `--agent-reply "<msg>"` posts a chat reply before polling. `--timeout-ms` is **test-only** — never pass it in normal use. |
| `npx -y lavish-axi end <file.html>` | End the session (user is done). |
| `npx -y lavish-axi stop` | Shut the background server. |
| `npx -y lavish-axi playbook [id]` | Guidance for an artifact type: `diagram, table, comparison, plan, code, input, slides`. |
| `npx -y lavish-axi design` | Design-system guidance (Tailwind v4 + DaisyUI v5 CDN, `data-theme="luxury"`, layout-safety CSS). |

## Session identity = canonical file path

Sessions are keyed by the **canonical absolute file path**, not an opaque id. Write the report to a
stable path (`.lavish/<topic>-verify.html`) and **never rename it between iterations** — renaming
starts a new session and loses queued feedback and scroll position. Re-rendering = rewrite the same
path; the watcher hot-reloads the browser.

## Open + layout gate (before the human)

1. `npx -y lavish-axi <file>` opens and runs the layout curtain. Its `next_step` tells you: do not
   reply to the user yet — run `poll` next.
2. If `poll` returns `layout_warnings` (overflow / clipped text / overlapping content), **fix them
   and rewrite the file before involving the user.** The gate re-arms on each write and clears
   after the next clean audit. The layout-safety CSS in every playbook pre-empts most warnings.
   Use `--no-gate` only when re-opening an artifact you already verified clean (and in tests).

## Poll (long-running, background, re-runnable)

- `poll` stays silent until the user sends feedback, ends the session, or the browser reports fresh
  `layout_warnings`. **This is normal — never treat the silence as hung.**
- Run it as a **background task** and wait. If your harness kills it, **just re-run it** — queued
  feedback is never lost.
- Poll JSON: `{ status, prompts:[…], layout_warnings:[…], dom_snapshot, next_step }`.

## Reading prompts

Each prompt is either an **element target** (`selector`/`tag`/`text`) or a **text-range target**:

```
target = { type:"text-range", text, selector, commonAncestorSelector,
           start:{…}, end:{…} }
```

- `target.text` is the **verbatim selected bytes** — the exact phrase the user flagged. Pass it to
  the judge panel unchanged; do not paraphrase it.
- Resolve the prompt to a citation `n`: an element click on a `#cite-<n>` anchor gives `n`
  directly; for a text-range, find the nearest enclosing `[data-cite-n]` in `commonAncestorSelector`.
  If a range overlaps **multiple** citations, ask which one via `--agent-reply` before re-judging —
  do not burn the panel budget on all of them.
- Native-control submissions (per-citation status/escalate forms) arrive as queued prompts with a
  `data` payload carrying `{ citation, status, escalate }`.

## Reply + presence

After applying changes, rewrite the file, then
`npx -y lavish-axi poll <file> --agent-reply "Re-checked clause 7; [4] downgraded to review — source says 14 days, claim said 30."`
The artifact streams agent presence (`waiting`/`listening`/`working`) via `window.lavish.setStatus()`
so the user never feels abandoned. Do not rewrite the HTML while the user is mid-annotation — write
inside the poll handler, after `working` has returned to `listening`.

## End

When the user ends the session: `npx -y lavish-axi end <file>`, then `npx -y lavish-axi stop`. The
artifact remains a portable HTML file on disk; all read-only interactions (popovers, scroll-to-row)
must work without the server (see the playbooks' portability rule).
