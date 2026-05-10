#!/usr/bin/env node

import assert from "node:assert/strict";

const { lintFormDraft } = await import("../lint-form-draft.mjs");

const validDraft = `# Readiness Summary

Overall status: Ready for physician review, not ready for submission.

## Part A: Individual Information

### First and last name / Date of birth

**Copy to form**
John Doe

**Evidence**

**Missing source data**
Date of birth: [Missing]

## Part B: Medical Practitioner Information

### Medical practitioner details

**Copy to form**
Dr. Emily Carter

**Evidence**

**Review required**
Physician should confirm practitioner registration details.

### Effects of Impairment - Walking

**Copy to form**
Patient experiences shortness of breath with assisted ambulation and requires support for walking-related daily activities.

**Evidence**
[5] John Doe chart supports shortness of breath with assisted ambulation.

**Review required**
Confirm severity, frequency, and duration meet CRA marked restriction criteria.

**Missing source data**
Onset date was not found in the provided records.

### Diagnosis

**Copy to form**
Respiratory and cardiac status affect walking tolerance.

**Evidence**
[6] John Doe chart documents respiratory and cardiac status.

**Review required**
Physician should confirm final diagnosis wording.

### Duration

**Copy to form**

**Evidence**

**Review required**
Confirm whether impairment has lasted or is expected to last at least 12 continuous months.

**Missing source data**
Duration and onset date were not found in the provided records.

### Life-Sustaining Therapy

**Copy to form**

**Evidence**

**Missing source data**
No life-sustaining therapy schedule was found in the provided records.

### Certification

**Copy to form**

**Evidence**

**Review required**
Physician must review, certify, sign, and date the form.

## Final Readiness Summary

**Overall status:** Ready for physician review, not ready for submission.

**Ready to copy**
- Practitioner identity fields after physician confirmation
- Walking limitation draft

**Needs physician review**
- Severity, frequency, and duration
- Certification and signature

**Missing source data**
- Onset date

**Evidence status**
- Patient chart evidence is adjacent to the supported fields.
`;

const validResult = lintFormDraft(validDraft, { form: "canada-dtc" });
assert.equal(validResult.status, "pass", JSON.stringify(validResult, null, 2));

const dirtyCopyDraft = validDraft.replace(
  "Patient experiences shortness of breath with assisted ambulation and requires support for walking-related daily activities.",
  "Patient experiences shortness of breath with assisted ambulation [5] [Physician Judgment Required].",
);
const dirtyResult = lintFormDraft(dirtyCopyDraft, { form: "canada-dtc" });
assert.equal(dirtyResult.status, "fail");
assert.ok(dirtyResult.failedRules.some((item) => item.rule === "COPY_BLOCK_HAS_CITATION"));
assert.ok(dirtyResult.failedRules.some((item) => item.rule === "COPY_BLOCK_HAS_REVIEW_FLAG"));

const noBottomSummary = validDraft.replace(/## Final Readiness Summary[\s\S]*$/, "");
const noBottomResult = lintFormDraft(noBottomSummary, { form: "canada-dtc" });
assert.equal(noBottomResult.status, "fail");
assert.ok(noBottomResult.failedRules.some((item) => item.rule === "HAS_FINAL_READINESS_SUMMARY"));

const noEvidence = validDraft.replace(/\*\*Evidence\*\*\n\[5\] John Doe chart supports shortness of breath with assisted ambulation\./, "**Evidence**\n");
const noEvidenceResult = lintFormDraft(noEvidence, { form: "canada-dtc" });
assert.equal(noEvidenceResult.status, "fail");
assert.ok(noEvidenceResult.failedRules.some((item) => item.rule === "EVIDENCE_PRESENT_FOR_NONEMPTY_COPY"));

console.log("lint-form-draft: passed");
