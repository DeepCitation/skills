# Authenticate

## Step 1: Check credentials

```bash
npx -y deepcitation status
```

Exit 0 = authenticated, proceed. Exit 1 = need login.

## Step 2: Login (if Step 1 failed)

```bash
npx -y deepcitation login
```

Opens a browser. Wait for completion, then re-check with `deepcitation status`.

If still failing, ask the user to check their network/login. Do not proceed without valid credentials — every CLI command will fail.
