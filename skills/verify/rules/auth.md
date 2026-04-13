# DeepCitation Auth Rules

Auth handling is inlined in SKILL.md. Key points:

- If `prepare` **or** `verify` output contains "action needed", **authenticate yourself**:
  1. Run the PTY command the CLI printed (Option A): `script -q -c "npx -y deepcitation@latest auth" /dev/null` — this opens the user's browser for OAuth and waits for the callback
  2. If auth succeeds, **retry the failed command**
  3. If the PTY hangs past 30 s (browser interaction unavailable), abort it and ask the user for their API key, then run `npx -y deepcitation@latest auth --key '<key>'` and retry
- If authentication fails after attempting login, show the error and **STOP COMPLETELY**:
  - Do NOT continue writing a report
  - Do NOT generate citation markers (bold term `[N]` or `<<<CITATION_DATA>>>` blocks)
  - Do NOT use information from previous conversations or memory to fabricate citations
  - Your response must end after showing the auth error
- Never use `DEEPCITATION_API_KEY=...` prefixing — `auth --key` persists to credentials.json
- Never print or log key values in chat
