---
name: form-fill
description: Use when the user wants to complete a medical or disability form (AISH, LTD, STD, WCB, CPP-D) using patient medical records, clinical notes, or specialist reports as source evidence. Also triggers on /form-fill. Keywords — physician statement, functional limitations, adjudicator, eligibility, prognosis, copy-paste form answers, cited medical form.
allowed-tools: list_files, read_file, plan_write, plan_update, ask_user, delegate_to_agent
---

# /form-fill — Medical Form Completion with Citations

Produces copy-paste-ready answers for medical/disability forms. Every medical fact traces back to source records via citations. The physician reviews, corrects, and signs.

Before drafting, follow the reusable output and review contract in `rules/manual-copy-output.md`. Use the form-specific spec in `forms/` as the source of truth for labels, eligibility criteria, and review rubric.

## When to Use

- User has a specific form to complete AND patient medical records in the room
- `/form-fill` appears in the prompt
- User asks to "fill out", "complete", "draft answers for" a medical or disability form

**Do NOT use when:**
- User just wants to read or summarize medical records → use summarize
- No source medical records available → cannot produce cited answers

## Phase 1: Setup — gather prerequisites

**Do not proceed to Phase 2 without explicit user confirmation.** Medical forms carry legal weight.

### 1a. Identify the form

If the `<formSpec>` block is present in your system prompt, use it as the form specification. Otherwise, match the user's description to these common aliases:

- "AISH", "assured income", "severely handicapped" → AISH Medical Report
- "LTD", "long-term disability" → LTD Physician's Statement
- "STD", "short-term disability" → STD Physician's Statement
- "DTC", "disability tax credit", "T2201" → Disability Tax Credit Certificate

If ambiguous, use `ask_user` to present the options and let the user choose.

### 1b. Scan available files

Call `list_files` to see all documents in the room. Categorize each file:
- **Patient records**: clinical notes, specialist reports, lab results, imaging reports, prior form versions
- **Physician profile**: signing physician's credentials, license, specialty
- **Form template**: blank form PDF (if injected by workflow)

Then immediately `read_file` on the physician profile (if present) and the earliest or most prominent patient record to extract:
- **Doctor/clinic name and specialty** — from the physician profile
- **Patient name and DOB** — from any cover page, referral letter, or clinical note header

Do not ask the user for information that is present in the attached files.

### 1c. Create the plan

Use `plan_write` to create a visible plan. Example:

```
Title: "DTC Form (T2201) — [Patient Name]"
Tasks:
  - Read patient medical records
  - Identify diagnoses and functional limitations
  - Draft Part A: Patient & Physician Information
  - Draft Part B: Effects of Impairment
  - Review and flag gaps
  - Deliver final draft
```

### 1d. Confirm with user

Use `ask_user` with a confirmation question that includes what you found in the files:

> I'll draft answers for **[form name]** using **[N] files** in this room, with **Dr. [name]** as signing physician, for patient **[name]**.
>
> Should I proceed?

Fill in `[name]` from what you read in step 1b. Only ask the user to supply a name if it is genuinely absent from all attached files after reading them.

**Wait for the user's response before continuing.**

## Phase 2: Read — ingest all source records

Update the first plan task to "active" via `plan_update`.

For each patient record file: call `read_file` to read the full text content. As you read, extract and mentally note:
- **Diagnoses**: primary and secondary, with ICD-10 codes where available
- **Functional limitations**: specific, quantified (distances, durations, frequencies)
- **Dates**: onset, diagnosis, last examination, hospitalizations
- **Medications**: names, dosages, effects on function
- **Clinical observations**: from physician notes, specialist reports, imaging
- **Demographics**: patient name, DOB, health number (if found)
- **Physician info**: name, specialty, license number, clinic (from profile)

Mark each "read" task as "done" and the next task as "active" via `plan_update`.

## Phase 3: Draft — section-by-section form answers

For each section defined in the `<formSpec>`:

1. **Set the plan task to "active"** before starting the section
2. Scan your extracted evidence for facts relevant to this section
3. Write **manual-copy-ready field blocks** at the specificity level the form demands:
   - "Cannot walk more than 10 meters on level ground without a walker" — not "has limited mobility"
   - "Diagnosed with Major Depressive Disorder (F33.1) on 2023-03-15" — not "has depression"
4. Put clean form text in `Copy to form`; put citations/source notes in adjacent `Evidence`; put clinician actions in `Review required`; put absent facts in `Missing source data`
5. **Cite every medical fact** using `[N]` markers in the adjacent evidence block
6. Use jurisdiction-specific terminology from the form spec
7. Flag insufficient evidence clearly outside copyable text
8. **Set the plan task to "done"** when the section is complete

### What to cite vs. what not to cite

**Always cite**: diagnoses, ICD-10 codes, clinical measurements, dates of onset, medication names/dosages, functional assessments, test results, clinical observations, prognosis statements.

**Never cite** (demographic data): patient names, phone numbers, addresses, postal codes, health numbers. These do not need source verification.

### Citation format

Use `**bold term** [N]` format, where:
- The bold term is 1–4 distinctive words copied from the source
- `[N]` references the source document
- Each citation traces to a specific document in the room

Example: Patient has **HFrEF with EF 25%** [3] and **recurrent septic shock** [4].

### Gap handling

For sections where evidence is insufficient:
- Keep missing facts outside `Copy to form`
- Mark the field in `Missing source data` as "Not found in records — requires physician input"
- Never fabricate or guess. An unfilled field is always better than a fabricated answer.
- For fields requiring clinical judgment: draft the best supported answer when evidence exists, then add "Requires physician's independent clinical judgment" in `Review required`

## Phase 4: Review — self-check against form spec

Update plan to show "Review and flag gaps" as active.

Check your draft against the form spec's common rejection reasons:
1. Does every section describe **functional effects**, not just diagnoses?
2. Are quantifications specific enough? ("≥90% of the time", "10 meters", "3 times per week")
3. Is the duration requirement explicitly stated? (e.g., "12+ continuous months" for DTC)
4. Are therapy/medication effects on function addressed?
5. Does jurisdiction-specific terminology match?

Write a brief gap summary listing:
- Sections completed with full evidence
- Sections completed with partial evidence (physician should verify)
- Sections that could not be completed (missing records)

## Phase 5: Deliver — present the draft

Update plan to show delivery task as active.

Present the complete draft as a single formatted response with:
1. `Readiness Summary`
2. Patient demographics and physician information fields
3. Each form section using the structured blocks from `rules/manual-copy-output.md`
4. `Final Readiness Summary`
5. DRAFT disclaimer

Close with:
> ⚠ **DRAFT** — This is a draft for physician review. The signing physician must verify all answers against their own clinical knowledge before signing and submitting.

Mark all plan tasks as "done".

## Invariants

- **Always DRAFT** — never present as final or ready to submit without physician sign-off
- **Never fabricate** — unfilled field > fabricated answer. Flag what's missing.
- **Never log PII** — patient names, health numbers, diagnoses stay in the draft only
- **Cite every medical fact** — dx codes, dates, limitations, prognosis, lab values, medications. Demographics (name, address) are exempt.
- **Keep copy blocks clean** — citations, missing-data markers, review caveats, and source labels belong outside `Copy to form`
- **Physician judgment overlay** — fields asking for clinical opinion get evidence citations + "⚠ Requires physician's independent clinical judgment"
- **plan_update is your progress heartbeat** — the user sees nothing while you read files. The plan task status is the only signal that you are still working. Update it before every major step.
