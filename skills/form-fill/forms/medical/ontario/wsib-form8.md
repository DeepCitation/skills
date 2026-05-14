---
form-id: ontario-wsib-form8
form-name: "WSIB Health Professional's Report (Form 8 / 0008A)"
jurisdiction: "Ontario, Canada"
governing-body: "Workplace Safety and Insurance Board (WSIB)"
category: workplace-injury
official-url: "https://www.wsib.ca/en/document/health-professionals-report-form-8"
last-checked: "2026-05-13"
---

# WSIB Health Professional's Report (Form 8) — Form Spec

Form 8 (0008A) is the initial health professional's report filed with the WSIB when a patient presents with a work-related physical injury or illness. Section 37 of the Workplace Safety and Insurance Act provides legal authority to submit without patient consent. The form is 3 pages: page 1 is instructions/submission, page 2 is the clinical report, page 3 is return-to-work information (copy provided to worker for employer).

## What WSIB uses this for

Form 8 is the gateway document for a WSIB claim. The adjudicator uses it to:
1. **Establish work-relatedness** — the mechanism of injury (Section B) must link the incident to the workplace.
2. **Determine initial entitlements** — loss-of-earnings benefits, health care benefits, and return-to-work services all flow from the clinical findings (Section C) and diagnosis (C.4).
3. **Initiate return-to-work planning** — the employer receives page 3 only. The functional abilities (Section F) drive early and safe return-to-work, which is the WSIB's primary recovery outcome.
4. **Trigger follow-up obligations** — if the worker cannot return immediately, the WSIB expects ongoing clinical updates and may request a Functional Abilities Form (FAF).

The WSIB pays the health professional for the initial Form 8. On the worker's initial visit, **only** Form 8 is paid — a FAF completed the same day will not be reimbursed.

## Review Rubric And Output Contract

This form uses the reusable manual-copy contract in `../../../rules/manual-copy-output.md`.

For WSIB Form 8, the primary persona is the treating health professional documenting the initial workplace injury assessment. The WSIB adjudicator and employer both receive this form, so clinical findings must be precise while functional abilities must be understandable by a non-medical employer.

## Key Sections — with exact form-printed anchor text for citations

| Your heading | Citation source_match (anchor text) | Page |
|---|---|---|
| Section A — Patient and Employer Information | "A. Patient and employer information" | 2 |
| Section B — Incident Date and Details | "B. Incident date and details section" | 2 |
| Section C — Clinical Information | "C. Clinical information section" | 2 |
| Section D — Treatment Plan | "D. Treatment plan" | 2 |
| Section E — Billing | "E. Billing section" | 2 |
| Section F — Return to Work Information | "F. Return to work information" | 3 |

## WSIB Form 8 deterministic field scaffold

1. Patient and Employer Information (Section A — patient completes): name, address, telephone, SIN, DOB, language, employer name.
   Accepted evidence: patient demographics, employer records. SIN may be [Missing] when absent from uploaded documents.

2. Incident Date and Details (Section B): How injury/reinjury/illness occurred at work, occupation, date of incident or symptom onset.
   Accepted evidence: patient history, employer incident report, clinical notes from initial visit.

3. Clinical Information (Section C): Body area checklist (brain, head, face, eyes, ears, teeth, chest, neck, upper/lower back, abdomen, pelvis, shoulders through toes — left/right), injury type checklist (abrasion, amputation, bite, burn, contusion, crush, disc herniation, dislocation, fracture, hernia, infection, inflammation, laceration, neurological dysfunction, sprain/strain, etc.), exposure/illness checklist (asthma, cancer, fumes, hearing loss, infectious disease, needlestick, poisoning, skin condition), pain rating (0–10), examination findings, pre-existing conditions (C.3: whether pre-existing or other conditions may affect recovery), diagnosis (C.4).
   Accepted evidence: clinical examination notes, imaging reports, diagnostic test results, medical history. Every checked body area and injury type must be supported by examination findings.

4. Treatment Plan (Section D): Medications prescribed for work injury/illness (name, dosage, duration, frequency), investigations and referrals (labs, X-rays, CT, MRI, EMG, ultrasound), specialist referrals, follow-up plan.
   Accepted evidence: prescriptions, referral letters, clinical notes.

5. Billing (Section E): Health professional designation, service code, WSIB provider ID, HST registration.
   Accepted evidence: provider credentials. Billing info may be [Missing].

6. Return to Work Information (Section F): Whether RTW discussed with patient, regular duties resume date, modified duties start date with graduated hours, unable to work explanation, functional abilities checklist (bend/twist, climb, kneel, lift, operate heavy equipment, drive, push/pull, sit, stand, use public transit, upper extremities, walk), other limitations, expected duration of limitations (1–2 days, 3–7 days, 8–14 days, 14+ days), follow-up appointment.
   Accepted evidence: clinical assessment, functional evaluation, job description if available. Duration estimate must be based on clinical findings, not patient preference.

## Ontario-Specific Notes
- WSIB pays a set fee for Form 8 completion
- On the worker's initial visit, only Form 8 is paid — a FAF will not be paid same date
- Page 3 (RTW info) is copied to the worker to give to employer — do not include sensitive clinical details on page 3
- Health professional must sign and may check the electronic submission box in lieu of physical signature
- Worker must file claim within 6 months of injury date

## Common Rejection / Processing Issues
1. Section A incomplete — delays claim file matching
2. Injury mechanism not described — "hurt at work" is insufficient
3. Body area checked but no corresponding examination findings in Section C
4. Pre-existing conditions (C.3) left blank — must answer Yes or No
5. Return to work not discussed or not documented in Section F
6. Duration of limitations left blank in Section F
7. Section D medications incomplete — WSIB requires name, dosage, duration, and frequency
