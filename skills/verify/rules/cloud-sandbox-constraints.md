# Cloud Sandbox Constraints (Claude Cowork, etc.)

Detect via `$CLAUDE_CODE_REMOTE == "true"`. Read this once before invoking any `deepcitation` command in such an environment.

**The CLI is a single bundled binary.** `deepcitation` is published to npm with all of its HTTP transport (including `undici`) bundled inside. Installing additional packages (`npm install undici`, `npm install -g undici`, `npm install node-fetch`, etc.) **cannot affect** the bundled CLI's network behavior. Do not attempt this workaround under any circumstances — it will waste time and resolve nothing.

**Do not modify proxy environment variables.** Cowork sets `HTTP_PROXY` / `HTTPS_PROXY` to route egress through a sandbox-managed proxy. The bundled CLI auto-detects this and routes through it correctly. Overriding `HTTP_PROXY=""`, `HTTPS_PROXY=""`, or `NO_PROXY=api.deepcitation.com` on individual command invocations is **not a supported workaround** and is more likely to break the request than fix it.

**Bash tool timeout is 45 s in Cowork.** Every bash call in a Cowork sandbox terminates after 45 seconds. All child processes are killed when the shell exits — `nohup`, `&`, and `sleep`-based polling patterns do not prevent this. Run `prepare` and `verify` synchronously (no `&`). If a command needs longer than 45 s, it will be killed, and `ps` will show no process remaining — this looks identical to a clean exit but is not. Do not interpret "no process in ps" as success; always check the output file or captured stdout for a valid result.

**Expected command timing.** Use these as your "is this hung?" baseline:

| Command | Typical | Worst case | If exceeded |
|---------|---------|------------|-------------|
| `prepare` PDF | ~1 s | ~5 s | Almost certainly hung — abort and report |
| `prepare` URL or office file | ~5 s | ~30 s | Wait up to 60 s, then abort |
| `verify --markdown` | ~0.5 s | ~5 s | Almost certainly hung — abort and report |
| `script -q -c "npx -y deepcitation@latest auth" /dev/null` | ~5–20 s | ~30 s | PTY is hanging on browser I/O — abort and fall back to `auth --key` |
| `auth --key '<key>'` | <1 s | ~2 s | Abort and report |

The CLI itself enforces a 90-second hard ceiling on every request and exits with a clear timeout error. **Do not extend this** by backgrounding the command with `&`, wrapping it in `for i in $(seq 1 24); do sleep 10`, `timeout 600 npx ...`, or any similar pattern. If the CLI hits its own timeout, the request is genuinely stuck — additional retries against the same endpoint will not succeed.

**If the PTY wrapper (`script`) hangs past 30 s:** The `script` command is blocking on browser interaction that will never arrive in a headless environment. Abort it, then stop and ask the user for their API key:

> "The PTY auth approach is hanging (waiting for browser interaction that can't happen here). Please paste your DeepCitation API key so I can authenticate. You can find your key in your DeepCitation account settings."

Once the user provides the key, run:
```bash
npx -y deepcitation@latest auth --key '<key>'
```
Then retry the original `prepare` or `verify` command.

**Do NOT** try to read the document another way (pdfplumber, urllib, direct PDF extraction, etc.) while waiting for auth — the pipeline invariant holds even when auth is blocked. An answer produced without the CLI is unverified.

**If `prepare` exits with only 2 lines of output** ("Using proxy: ..." + "Preparing file: ...") and no result, the CLI connected to the proxy but received no response — this is a network-layer failure, not a CLI bug. Wait 10 seconds and retry **once**. Do not change flags (`--out` vs `--text`, removing `--text`, backgrounding, or simplifying input) between attempts — the proxy never received the request, so the input is not the problem. If the second attempt also returns only 2 lines, stop and report the output verbatim.

**When a command times out in a sandbox, the failure mode is the network layer, not the CLI logic.** Do not "simplify the input" (smaller markdown, fewer citations, blanker templates) hoping the API will respond — the API never received the request, or the response never reached you. Stop after one failure, surface the error verbatim, and let the user decide whether to retry, switch networks, or contact support.

**You may NOT fall back to building a "verified-looking" HTML report from your own knowledge of the document.** If `verify` cannot complete, the deliverable is not producible, full stop. Returning a hand-built HTML that mimics the verified format is worse than reporting the failure honestly — it presents unverified text as verified.

**Recognize structured CLI errors.** When the CLI fails with a transport-layer issue, it emits a final line on stderr beginning with `__DC_ERROR__` followed by JSON (e.g. `__DC_ERROR__ {"type":"timeout","phase":"response_headers","retryable":false,"recoverable":false,...}`). If `recoverable: false`, treat it as a hard stop — do not retry, do not try workarounds.
