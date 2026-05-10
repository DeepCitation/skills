# Manual-Copy Output And Review Contract

This rule applies to form-fill outputs where the user needs copy-paste-ready answers for a real form.

## Goal

The final draft must be usable by the person filling the form, not merely a cited narrative. The reviewer should be able to say: this is helpful, easy to copy, and structured around the actual form.

For medical/disability forms, the signing clinician remains responsible for review, correction, and signature. The draft is never submission-ready without that review.

## Required Output Shape

Use structured markdown first. A rendered component can come later once the contract is stable.

Required sections:

- `Readiness Summary` at the top.
- Field-by-field sections using the actual form labels or close form-label equivalents.
- For each substantive field:
  - `Copy to form`: clean answer text intended for manual transfer into the real form.
  - `Evidence`: adjacent citations/source notes supporting the copy text.
  - `Review required`: clinician, applicant, or reviewer actions before submission.
  - `Missing source data`: facts not found in the provided files.
- `Final Readiness Summary` at the bottom, because streaming chat UIs often leave the user at the end of the answer.

The final readiness summary should include one overall status plus short action buckets:

- `Ready to copy`
- `Needs review`
- `Missing source data`
- `Evidence status`

## Copy Block Rules

`Copy to form` blocks are for the form answer only.

Do not include these inside `Copy to form`:

- citation markers such as `[1]`
- `[Missing]`
- source labels such as `[Patient Chart]`
- tool or system notes
- review caveats
- product caveats

If a field cannot be completed, keep the copy block blank or use a form-appropriate blank cue, then explain the gap in `Missing source data`.

## Evidence Rules

Every substantive factual claim in `Copy to form` must be supported by adjacent evidence. Use the citation rules in `field-citation-mapping.md`.

Evidence belongs next to the field, not mixed into copyable form text, unless the form itself requires citations inside the answer.

## Review Required Rules

When a field requires professional judgment, still draft the best supported answer when evidence exists. Do not use the review flag as a dead-end placeholder.

Use the review block to say what must be confirmed, for example severity, frequency, duration, diagnosis wording, prognosis, certification, or signature.

## Missing Source Data Rules

Use missing data only when the source files truly do not contain the needed fact. Do not use missing-data blocks to hide ingestion, OCR, context, or citation failures.

For image-based records, OCR/image extraction must produce usable evidence when the form depends on those records. If extraction fails, classify the issue as ingestion/product failure, not as missing patient data.

## Independent Review Contract

When a workflow includes a review agent, the review agent must be separate from the controller or drafting agent.

Before independent review, run the structural lint when available:

```bash
node skills/form-fill/scripts/lint-form-draft.mjs .deepcitation/form-draft.md --form canada-dtc --pretty
```

The lint catches deterministic copyability and structure failures. It does not decide medical quality, citation correctness, or whether the form should pass review.

The reviewer should inspect:

- rendered final draft when available,
- backend/form-draft artifact,
- citation summary and sampled citation evidence,
- the form spec/rubric,
- known environment constraints.

The reviewer may request revisions. Each required revision must include:

- field or section,
- issue category,
- why it blocks usability or trust,
- expected change,
- whether it blocks pass.

Required revisions should be fixed by changing the prompt, workflow, skill, code, fixture, or test and rerunning from the cheapest relevant boundary. Do not manually edit a final draft to pass review except for an explicitly labeled mock.

## Verdict Shape

Use this shape when a machine-readable review verdict is needed:

```json
{
  "primaryPersona": "form-filler",
  "usableInRealForm": false,
  "helpfulToReviewer": false,
  "easyToCopyIntoForm": false,
  "fieldByFieldMapping": false,
  "actualFormLabelsUsed": false,
  "copyPasteReadySections": false,
  "cleanCopyBlocks": false,
  "topReadinessSummaryPresent": false,
  "bottomReadinessSummaryPresent": false,
  "factsSupported": false,
  "missingFieldsClearlySeparated": false,
  "reviewFlagsUseful": false,
  "citationsSufficientForReview": false,
  "ocrEvidenceUsableWhenExpected": false,
  "blockingIssues": [],
  "nonBlockingIssues": [],
  "revisionRequests": [],
  "verdict": "PASS|FAIL"
}
```
