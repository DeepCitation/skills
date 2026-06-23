# Cloud Sandbox Constraints (Claude Cowork, etc.)

Detect via any of: `$CLAUDE_CODE_REMOTE == "true"`, `$HTTP_PROXY`/`$HTTPS_PROXY` containing `localhost:3128`, `whoami` returning a generated adjective-color-name pattern (e.g. `jolly-vibrant-volta`), or a prior bash call being killed at ~45 s with no graceful exit. Read this file once on the first matching signal, before invoking any `deepcitation` or `lavish-axi` command. Do not gate on `$CLAUDE_CODE_REMOTE` alone — it is not reliably set in every Cowork session.

## DeepCitation backend (`prepare`)

**The CLI is a single bundled binary.** `deepcitation` ships all of its HTTP transport (including `undici`) bundled inside. Installing additional packages (`npm install undici`, `node-fetch`, etc.) **cannot affect** its network behavior. Do not attempt this — it resolves nothing.

**Do not modify proxy environment variables.** Cowork sets `HTTP_PROXY`/`HTTPS_PROXY` to route egress through a sandbox proxy. The bundled CLI auto-detects and routes through it. Overriding `HTTP_PROXY=""`, `HTTPS_PROXY=""`, or `NO_PROXY=api.deepcitation.com` is not a supported workaround and is more likely to break the request than fix it.

**Bash tool timeout is 45 s in Cowork.** Every bash call terminates after 45 s; child processes die when the shell exits — `nohup`, `&`, and `sleep`-polling do not prevent this. Run `prepare` synchronously (no `&`). "No process in `ps`" after a kill looks identical to a clean exit but is not — always check the output file or captured stdout for a valid result.

**Expected command timing.** Your "is this hung?" baseline:

| Command | Typical | Worst case | If exceeded |
|---------|---------|------------|-------------|
| `prepare` PDF | ~1 s | ~5 s | Almost certainly hung — abort and report |
| `prepare` URL or office file | ~5 s | ~30 s | Wait up to 60 s, then abort |
| `verify --html` (verify + embed) | a few s | ~60 s (renders evidence images server-side) | Approaching the 90 s ceiling means the request is stuck — abort and report |
| `script -q -c "npx -y deepcitation@latest auth" /dev/null` | ~5–20 s | ~30 s | PTY is hanging on browser I/O — abort and fall back to `auth --key` |
| `auth --key '<key>'` | <1 s | ~2 s | Abort and report |

> The /verify pipeline calls **`prepare`** (read evidence), **`verify --html`** (verify against the
> source and embed DeepCitation's interactive citation runtime into the lavish-styled report —
> SKILL.md step 4), and **`auth`** when needed. `verify --html` is *expected* to write/augment the
> HTML — that **is** the embed, not a dropped path. It writes the embed to **`{stem}-verified.html`**
> (it ignores `--out`), so open *that* file in lavish; pass **`--local-only`** so the report is not
> uploaded to "My Verifications". Do not use `verify --md` or `verify --citations`: `--md` renders a
> standalone DeepCitation-styled report (we style via lavish instead), and `--citations` is a low-level
> call that skips the embed.

The CLI enforces a 90-second hard ceiling per request and exits with a clear timeout error. **Do not extend it** by backgrounding with `&`, `for i in $(seq 1 24); do sleep 10`, `timeout 600 npx ...`, or similar. If the CLI hits its own timeout, the request is genuinely stuck.

**If the PTY wrapper (`script`) hangs past 30 s:** it is blocking on browser interaction that will never arrive headless. Abort, then ask the user for their API key (see [auth.md](auth.md)), run `npx -y deepcitation@latest auth --key '<key>'`, and retry. **Do NOT** read the document another way (pdfplumber, urllib, direct extraction) while waiting — the no-direct-read invariant holds even when auth is blocked.

**If `prepare` exits with only 2 lines** ("Using proxy: …" + "Preparing file: …") and no result, the proxy connected but received no response — a network failure, not a CLI bug. Wait 10 s and retry **once** with identical flags. If the second attempt also returns 2 lines, stop and report verbatim. Do not "simplify the input" — the API never received the request, so the input is not the problem.

**Recognize structured CLI errors.** On a transport failure the CLI emits a final stderr line beginning `__DC_ERROR__` followed by JSON (e.g. `__DC_ERROR__ {"type":"timeout","recoverable":false,...}`). If `recoverable: false`, hard-stop — no retry, no workarounds.

**You may NOT fall back to a hand-built report from your own knowledge of the document.** If the evidence cannot be read, the deliverable is not producible — reporting the failure honestly beats presenting unverified text as verified.

## lavish-axi render + review loop

lavish renders the report and runs the review loop (full contract in [lavish-loop.md](lavish-loop.md)). Two sandbox-specific rules:

**`poll` is long-running by design.** It stays silent until the user acts or the browser reports fresh `layout_warnings` — that silence is normal, never a hang. In a 45 s sandbox it **will** be killed. Run `npx -y lavish-axi poll <file>` as a **background task** and wait for it; if the harness kills it, **just re-run it** — queued feedback is never lost. Do not pass `--timeout-ms` (test-only). Do not interpret a killed poll as "the user said nothing."

**The browser may not auto-open in WSL/headless.** Opening the report still creates the session on disk. If no window appears, give the user the path/URL from the open output explicitly so they can open `.lavish/<topic>-verified.html` themselves; the artifact is portable and works without the server for read-only review.
