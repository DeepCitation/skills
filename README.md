# DeepCitation Skills

Skills for AI coding agents (Claude Code, Cursor, etc.) that integrate with the [DeepCitation](https://github.com/DeepCitation/deepcitation) verification API.

## Available Skills

- [verify](skills/verify/SKILL.md) — Verify AI claims against source documents using the DeepCitation API

## Install

### CLI / IDE (Claude Code)

```bash
npx skills add DeepCitation/skills
```

Then ask to `/verify` to verify AI claims.

### claude.ai Skills

1. Download [`verify.zip`](https://github.com/DeepCitation/skills/releases/download/verify-latest/verify.zip)
2. Go to [claude.ai/customize/skills](https://claude.ai/customize/skills)
3. Upload `verify.zip`
4. Ask to `/verify` to verify AI claims

Each `SKILL.md` is a self-contained Markdown file — any agent that supports reading Markdown instructions can use them directly.

## How it works

When you invoke `/verify`, the skill:

1. **Prepares** your source documents (PDF, DOCX, images, URLs) via the DeepCitation API
2. **Answers** your question naturally using the source content
3. **Cites** every claim, value, and fact back to specific pages and lines in the source
4. **Verifies** each citation against the original document
5. **Delivers** results as either:
   - An interactive HTML file with clickable citation popovers, or
   - Inline markdown with **✓** (verified) / ✓ (partial match) / ✗ (not found) indicators and a status summary table

## Related

- [deepcitation](https://github.com/DeepCitation/deepcitation) — The DeepCitation SDK and CLI
- [API docs](https://deepcitation.com/docs) — DeepCitation API documentation
