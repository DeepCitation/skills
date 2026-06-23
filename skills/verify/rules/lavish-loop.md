# lavish-axi loop — styling shell, embed, and review loop

**Division of labor (do not blur it):**

- **lavish-axi** owns the **report styling** (a clean, well-laid-out HTML shell via its design system +
  playbooks) and the **review loop** (annotate → poll → reply on any specific the user picks).
- **DeepCitation** owns **verification and the citation components**: `verify --html` embeds a runtime
  that turns each cited phrase into an interactive element the user clicks to review status, matched
  text, the evidence keyhole, the page view, and any variance. We never restyle or reimplement that.

Use **only** these lavish verbs/flags; do not invent others.

| Command | Use |
|---|---|
| `npx -y lavish-axi <file.html>` | Open/resume the session. Runs the open-time **layout gate** unless `--no-gate`. Add `--no-open` to ensure the server/session exists without launching another browser. |
| `npx -y lavish-axi poll <file.html>` | Long-poll until the user acts or the browser reports fresh `layout_warnings`. `--agent-reply "<msg>"` posts a chat reply before polling. `--timeout-ms` is **test-only** — never pass it in normal use. |
| `npx -y lavish-axi end <file.html>` | End the session (user is done). |
| `npx -y lavish-axi stop` | Shut the background server. |
| `npx -y lavish-axi playbook [id]` | Guidance for a content shape: `diagram, table, comparison, plan, code, input, slides`. Pick the one the **answer** needs; citations embed wherever the content puts them. |
| `npx -y lavish-axi design` | Design-system guidance (Tailwind v4 + DaisyUI v5 CDN, `data-theme="luxury"`, layout-safety CSS). |

## Embed DeepCitation into the styled report

1. Author the answer as a lavish-styled HTML document (step 3 of SKILL.md), wrapping each cited phrase
   in a `data-cite="N"` element and appending the `<<<CITATION_DATA>>>` block.
2. `verify --html` verifies against the source, replaces each `data-cite` with a hashed
   `data-citation-key`, injects `#dc-data` + scoped CSS + the runtime, and returns **your HTML with its
   styling intact**. The runtime's CSS is low-specificity (`:where(...)`, `data-dc-*`) and does not
   fight Tailwind/DaisyUI.
3. **Coexistence — keep citation clicks away from lavish (post-embed sweep).** The DeepCitation runtime
   binds clicks on `[data-citation-key]`. `verify --html` does **not** mark those elements for lavish,
   and you can't pre-mark them (keys are hashed at verify time) — so **after** the embed, add
   `data-lavish-action` to every `[data-citation-key]`:
   ```bash
   perl -0pi -e 's/(<[a-zA-Z][\w-]*)(?=[^>]*\sdata-citation-key=)/$1 data-lavish-action/g' .lavish/<topic>-verified.html
   ```
   Verified against `artifact-sdk.js`: all three annotation handlers (`mouseover`, `mouseup`/select,
   **`click`**) bail on `isLavishAction(target)` = `closest("[data-lavish-action]")`, so a marked
   citation is skipped by lavish on hover, select, AND click — its click reaches DeepCitation's popover
   instead. Everything else (prose, headings, table cells) stays freely commentable.

## Session identity = canonical file path

Sessions are keyed by the **canonical absolute file path**, not an opaque id. lavish opens the
**verified** artifact (`.lavish/<topic>-verified.html`); keep that path stable and **never rename it
between iterations** — renaming starts a new session and loses queued feedback and scroll position.
Re-rendering = edit the authored `.lavish/<topic>.html`, re-run `verify --html` (it regenerates
`<topic>-verified.html` in place), then re-run the `data-lavish-action` sweep; the watcher hot-reloads
the browser.

## Open + layout gate (before the user)

1. `npx -y lavish-axi <file>` opens and runs the layout curtain. Its `next_step` tells you: do not
   reply to the user yet — run `poll` next.
2. If `poll` returns `layout_warnings` (overflow / clipped text / overlapping content), **fix them and
   rewrite the file before involving the user.** The gate re-arms on each write and clears after the
   next clean audit. Use `--no-gate` only when re-opening an artifact you already verified clean.

## Poll (long-running, background, re-runnable)

- `poll` stays silent until the user sends feedback, ends the session, or the browser reports fresh
  `layout_warnings`. **This is normal — never treat the silence as hung.**
- **Liveness signal:** a no-timeout poll writes an immediate waiting banner and then a per-minute stderr
  line (`[lavish-axi] Still waiting for user feedback (Nm)…`). Stdout stays reserved for the final JSON.
  If the heartbeats stop and no JSON arrived, the process was killed — **just re-run the same poll
  command** (queued feedback persists).
- Run it as a **background task** and wait. Do not pass `--timeout-ms` (test-only).
- Poll JSON: `{ status, prompts:[…], layout_warnings:[…], dom_snapshot, next_step }`.

## Reading comments (two lanes, no citation-id resolution needed)

A citation click is handled entirely by DeepCitation's popover and never reaches you. So every prompt
`poll` returns is a **comment on some specific** the user picked — an element or a text range:

```
prompt = { uid, selector, tag, text, target? }
target = { type:"text-range", text, selector, commonAncestorSelector, start:{…}, end:{…} }
```

- `target.text` (or `prompt.text`) is the **verbatim bytes the user flagged** plus their message. Act on
  it directly: reword the claim, re-anchor a citation, or `prepare` a better source. You do **not** need
  to resolve the comment to a citation `n` — the flagged text and the message are the instruction. If
  the comment is genuinely ambiguous about which claim it means, ask via `--agent-reply` rather than
  guessing.
- There is no per-citation status control and no judge panel: **the user does not set verification
  status** (DeepCitation does), and a comment is acted on, not voted on.

## Reply + presence

After applying changes, rewrite the file (re-run `verify --html`), then reply:
`npx -y lavish-axi poll <file> --agent-reply "Reworded clause 7 and re-cited p.14 — source says 14 days, not 30."`

Agent presence (`waiting` / `listening` / `working`) is **chrome-owned and server-driven** over the
`/events/:key` SSE stream — `listening` while a poll is active, `working` after a poll delivered
feedback, `waiting` before any poll attached. **You do not drive it from the artifact** (no
`window.lavish.setStatus()` for presence). Keeping a poll running is what shows `listening`. Do not
rewrite the HTML while the user is mid-annotation — write inside the poll handler, after feedback
arrives.

## End

When the user ends the session: `npx -y lavish-axi end <file>`, then `npx -y lavish-axi stop`. The
artifact stays a portable HTML file; read-only interactions (citation popovers, scroll) should work
without the lavish server, though evidence images load only with network access to the DeepCitation
source assets.
