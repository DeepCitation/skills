# Prepare Sources

Upload **every** source file to the DeepCitation API. Skipping a file means its claims go unverified.

## CLI usage

```bash
# Local file (PDF, image, DOCX, XLSX, PPTX, CSV, etc.)
npx -y deepcitation prepare source.pdf

# URL (rendering + text extraction server-side)
npx -y deepcitation prepare https://example.com/article

# Custom output path
npx -y deepcitation prepare report.pdf --out .deepcitation/prepare-report.json
```

`prepare` is the **only** way to read source content. Do not use OCR tools, PDF readers, or URL fetch — their output lacks the `<line id>` and `<page_number>` markup needed for citations.

## What to retain

Save each response — retain both `attachmentId` and `deepTextPromptPortion`. The `deepTextPromptPortion` is the sole source of truth for `lineIds` and `pageNumber` values. Line IDs are sparse — see [line-ids.md](./line-ids.md).

## Parallel preparation

When multiple sources exist, launch one Agent subagent per source — all in a single message so they execute concurrently. Each subagent: run prepare, read the output JSON, report back the `attachmentId` and a summary of the content.

## Inaccessible sources

If a URL fails (DNS, 403, auth required), report it clearly and continue with available sources. Do not fabricate citations for sources you couldn't prepare.
