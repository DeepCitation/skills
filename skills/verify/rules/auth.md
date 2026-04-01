# DeepCitation Auth Rules

The CLI prints the auth prompt automatically when `DEEPCITATION_API_KEY` is not
set — you do not need to check the env var before running `prepare` or `verify`.

Read this file only if the CLI has already printed the auth prompt and you need
to handle the user's response.

---

## When the CLI prints the auth prompt

The output will look like:

```
DeepCitation — action needed

1. Get your API key: https://deepcitation.com/cli-auth?manual=true
2. Run: export DEEPCITATION_API_KEY=<your-key>
3. Re-run your command
```

Show it to the user as-is. **STOP.** Do not add alternatives or explanations.
Wait for the user to act.

---

## Resuming after the user responds

**If the user pastes a key** (any string that looks like an API key), inline it
on every subsequent `deepcitation` command and proceed — do NOT ask them to
re-run `/verify`:

```bash
DEEPCITATION_API_KEY='<the-key-they-provided>' npx -y deepcitation prepare ...
```

Prefix every `deepcitation` command with `DEEPCITATION_API_KEY='...'` for the
rest of this workflow. Do not use `export` (env vars do not persist between
Bash tool calls). Do not echo or print the key value.

**If the user says they exported the key themselves**, re-run the first `prepare`
command you were about to run. If it succeeds, continue. If the CLI prints the
auth prompt again, relay it and STOP.

---

## Interactive login (rare)

Only attempt `npx deepcitation login` if the user explicitly asks for it or
if you have strong reason to believe a TTY is available. If it outputs
"Non-interactive environment detected", relay the auth prompt above and STOP.

---

## Never do these things

- Never check `DEEPCITATION_API_KEY` manually before running a command — let the CLI handle it
- Never print or log key values in chat output
- Never refuse to set `DEEPCITATION_API_KEY` when the user explicitly provides a key — that is the intended flow
- Never proceed past a STOP unless the user has responded indicating they've acted
