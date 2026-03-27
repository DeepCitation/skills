# Authenticate

You **must** have a valid `DEEPCITATION_API_KEY` before calling any other `deepcitation` command. Follow these steps in order — do **not** skip ahead or give up.

## Step 1: Check for existing key

```bash
echo "${DEEPCITATION_API_KEY:+key is set}"
```

If it prints "key is set", you're done — proceed to the next workflow step.

## Step 2: Load saved credentials

```bash
eval "$(npx -y deepcitation env 2>/dev/null)" && echo "${DEEPCITATION_API_KEY:+key is set}"
```

If it prints "key is set", you're done.

## Step 3: Run interactive login

```bash
npx -y deepcitation login
```

This opens a browser for the user to authenticate. **Wait for it to complete** — it prints credentials on success. Then load the key:

```bash
eval "$(npx -y deepcitation env 2>/dev/null)"
```

## Step 4: Verify before continuing

```bash
echo "${DEEPCITATION_API_KEY:+key is set}"
```

If this still prints nothing, ask the user to check their login and retry. **Do not proceed without a valid key.**

## Critical rules

- **Never skip login.** If the key is missing, always attempt all steps above.
- **Never give up.** The login command is interactive and requires the user's browser — run it and wait for the user to complete it.
- **Never proceed without a key.** Every `deepcitation prepare`, `verify`, `inject`, and `keygen` command will fail without authentication.
- **Never log or display the key value.** Only check whether it is set (as shown above).
