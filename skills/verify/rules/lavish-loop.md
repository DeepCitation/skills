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
- **Liveness signal:** a no-timeout poll writes an immediate waiting banner and then a per-minute
  stderr line (`[lavish-axi] Still waiting for user feedback (Nm)…`). Stdout stays reserved for the
  final JSON response. Those stderr heartbeats are how you know the poll is alive; if they stop and
  no JSON arrived, the process was killed — **just re-run the same poll command** (queued feedback
  persists).
- Run it as a **background task** and wait. Do not pass `--timeout-ms` (test-only).
- Poll JSON: `{ status, prompts:[…], layout_warnings:[…], dom_snapshot, next_step }`.

## Reading prompts

Each prompt is either an **element target** (`selector`/`tag`/`text`) or a **text-range target**:

```
prompt = { uid, selector, tag, text, target? }
target = { type:"text-range", text, selector, commonAncestorSelector, start:{…}, end:{…} }
```

- `target.text` is the **verbatim selected bytes** (≤240 chars on the outer prompt) — the exact
  phrase the user flagged. Pass it to the judge panel unchanged; do not paraphrase it. For a
  text-range, `prompt.selector` and `target.commonAncestorSelector` carry the **same** ancestor
  selector; use `target.start`/`target.end` (and `dom_snapshot`) when you need precise character
  positions.
- **Resolve the prompt to a citation `n`:**
  - *Element click:* `event.target` is the deepest clicked node, so `selector` looks like
    `span#cite-3 > strong`, **not** an exact `#cite-3`. Extract `n` with a `#cite-(\d+)` regex on
    `selector` — never exact-match.
  - *Text-range, normal case:* the range sits inside one `#cite-N` unit → `commonAncestorSelector`
    contains a `#cite-N` / `cite-N` token; extract `n` the same way.
  - *Text-range, cross-boundary (the canonical misquote-in-context flag):* a selection spanning
    from inside `#cite-N` into surrounding prose has a common ancestor **above** the cite span
    (e.g. `div.max-w-prose` / `<p>`), so its selector carries **no** `#cite-` token, and
    `dom_snapshot` emits only `uid`/`tag`/`text` (no `data-cite-n`). **Do not silently drop the
    flag.** Match `target.text` against the rendered cited spans' text to find which citation(s) it
    overlaps. If still ambiguous (overlaps multiple, or none), ask the user which `[n]` via
    `--agent-reply` before re-judging — do not burn the panel budget on all of them.
- **Native-control submissions** (per-citation status/escalate forms) arrive as ordinary queued
  prompts. The structured object you passed to `queuePrompt({ data:… })` is **not** a separate
  field — lavish appends it to the prompt **text** as a `Context data:\n{…JSON…}` block. Recover
  `{ citation, status, escalate }` by parsing that JSON out of `prompt` (e.g. `JSON.parse` on the
  substring after `Context data:`); there is no top-level `data` key on the returned prompt.

## Reply + presence

After applying changes, rewrite the file, then
`npx -y lavish-axi poll <file> --agent-reply "Re-checked clause 7; [4] downgraded to review — source says 14 days, claim said 30."`

Agent presence (`waiting` / `listening` / `working`) is **chrome-owned and server-driven** over the
`/events/:key` SSE stream — `listening` while a poll is active, `working` after a poll delivered
feedback and released, `waiting` before any poll has attached. **You do not drive it from the
artifact** — do not call `window.lavish.setStatus()` to push those states (it is an optional
free-text status string, not the presence stream, and has no chrome handler for presence words).
Just keeping a poll running is what makes the user see `listening`. Do not rewrite the HTML while
the user is mid-annotation — write inside the poll handler, after feedback has been delivered.

## End

When the user ends the session: `npx -y lavish-axi end <file>`, then `npx -y lavish-axi stop`. The
artifact remains a portable HTML file on disk; all read-only interactions (popovers, scroll-to-row)
must work without the server (see the playbooks' portability rule).
