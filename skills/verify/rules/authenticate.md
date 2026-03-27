# Authenticate

You **must** have a valid `DEEPCITATION_API_KEY` before calling any other `deepcitation` command. Follow these steps in order — do **not** skip ahead or give up.

## Step 1: Load or confirm key

```bash
eval "$(npx -y deepcitation env 2>/dev/null)" && echo "${DEEPCITATION_API_KEY:+key is set}"
```

`deepcitation env` checks the environment first (covering keys already exported in the shell), then falls back to saved credentials on disk — so no separate env-var check is needed. If it prints "key is set", you're done — proceed to the next workflow step.

## Step 2: Run interactive login

If step 1 did not print "key is set":

```bash
npx -y deepcitation login
```

This opens a browser for the user to authenticate. **Wait for it to complete** — it prints a success confirmation when done. Then load the key:

```bash
eval "$(npx -y deepcitation env 2>/dev/null)" && echo "${DEEPCITATION_API_KEY:+key is set}"
```

If this still prints nothing, the `deepcitation` CLI may not be installable (e.g. offline or proxy-restricted), or login did not complete. Ask the user to check their network, login status, and retry. **Do not proceed without a valid key.**

## Critical rules

- **Never skip login.** If the key is missing, always attempt all steps above.
- **Never give up.** The login command is interactive and requires the user's browser — run it and wait for the user to complete it.
- **Never proceed without a key.** Every `deepcitation prepare`, `verify`, `inject`, and `keygen` command will fail without authentication.
- **Never log or display the key value.** Only check whether it is set (as shown above).
