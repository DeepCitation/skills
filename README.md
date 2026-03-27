# DeepCitation Skills

Skills for AI coding agents (Claude Code, Cursor, etc.) that integrate with the [DeepCitation](https://github.com/DeepCitation/deepcitation) verification API.

## Available Skills

- [verify](skills/verify/SKILL.md) — Verify AI claims against source documents using the DeepCitation API

## Usage

These skills follow the [Claude Code skills format](https://docs.anthropic.com/en/docs/claude-code/skills). Each skill has a `SKILL.md` entry point and optional `rules/` directory with detailed guidance loaded on demand.

### With Claude Code

Add this repository as a skill source in your project's `.claude/settings.json` or reference the skill files directly.

### With other agents

The `SKILL.md` files and rule files are plain Markdown — any agent that supports reading Markdown instructions can use them.

## Related

- [deepcitation](https://github.com/DeepCitation/deepcitation) — The DeepCitation SDK and CLI
- [API docs](https://deepcitation.com/docs) — DeepCitation API documentation
