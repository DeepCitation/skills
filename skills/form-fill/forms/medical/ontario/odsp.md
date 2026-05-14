---
form-id: ontario-odsp
form-name: "ODSP Disability Determination Package (2859E)"
jurisdiction: "Ontario, Canada"
governing-body: "Ministry of Children, Community and Social Services"
category: provincial-disability
official-url: "https://www.ontario.ca/page/ontario-disability-support-program-disability-determination-package"
last-checked: "2026-05-13"
---

# ODSP Disability Determination Package — Form Spec

The Disability Determination Package (DDP, form 2859E) is the form package submitted to Ontario's Disability Adjudication Unit to determine whether an applicant qualifies for Ontario Disability Support Program (ODSP) income support. It has two mandatory sections completed by the health care professional: the Health Status Report (HSR) and the Activities of Daily Living (ADL). Total package is 26 pages including instructions, self-report, and consent; the physician-completed portion is 13 pages (pages 14–26 in the full package).

**Reference**: ODSP Guide for Health Care Professionals (ontario.ca)

## Review Rubric And Output Contract

This form uses the reusable manual-copy contract in `../../../rules/manual-copy-output.md`.

For ODSP, the primary reviewer persona is a physician filling the Health Status Report and ADL. The DDP is reviewed by a Disability Adjudicator, not a physician — so the draft must use language that a non-medical adjudicator can follow while remaining medically precise.

## Eligibility — the ODSP disability test

Under the ODSP Act, a person must meet ALL of:
1. **Substantial physical or mental impairment** — not minor or trivial
2. **Continuous or recurrent** — expected to last 1 year or more
3. **Substantial restriction** — the impairment must directly and cumulatively result in a substantial restriction in the person's ability to:
   - take care of themselves, AND/OR
   - function in the community, AND/OR
   - function in the workplace

The adjudicator evaluates the **cumulative effect** of all impairments — a single condition that is not disabling alone may qualify when combined with other conditions.

**Key difference from federal DTC**: ODSP does not require "all or substantially all of the time (≥90%)" — it uses "substantial restriction" which is a lower threshold. However, the impairment-to-restriction link must be explicit.

## Key Sections — with exact form-printed anchor text for citations

The ODSP DDP (2859E) has two mandatory professional-completed parts: the Health Status Report (Sections 1–7) and the Activities of Daily Living (Sections 8–9).

| Your heading | Citation source_match (anchor text) | Page |
|---|---|---|
| Section 1 — Medical Conditions | "1. Medical Conditions that Contribute to the Applicant's Current Status" | 14 |
| Section 2 — Additional Information (IEWS) | "2. Additional Information" | 16 |
| Section 2.2 — Intellectual and Emotional Wellness Scale | "2.2. Intellectual and Emotional Wellness Scale (IEWS)" | 17 |
| Section 3 — Available Medical Information | "3. Available Medical and Other Information Related to Section 1" | 18 |
| Section 4 — Visual | "4. Visual" | 19 |
| Section 5 — Auditory | "5. Auditory" | 19 |
| Section 6 — Intervention and Treatment | "6. Intervention and Treatment" | 20 |
| Section 7 — HSR Certification | "also completing the Activities of Daily Living" | 22 |
| Section 8 — Activities of Daily Living Index | "8. Activities of Daily Living Index (ADLI)" | 24 |
| Section 8.2 — Services and Supports | "8.2 Does the applicant require any of the services or help listed below?" | 25 |
| Section 8.3 — Additional ADL Comments | "8.3 Is there any additional comments/information about activities of daily living?" | 25 |
| Section 9 — ADL Certification | "9. Certificate of Approved Health Care Professional" | 25 |

Page numbers are actual PDF page numbers within the full 26-page package. The physician-completed portion (HSR+ADL) begins on page 14.

## ODSP deterministic field scaffold

Every filled ODSP field must carry an inline [N] marker with matching DeepCitation data. Accepted evidence means uploaded patient files, official ODSP assets, or workflow-imported form PDFs.

1. Medical Conditions: For each condition: diagnosis name, impairment description, restriction description, prognosis (improve/remain/deteriorate/unknown), duration (less than 1 year or 1+ year), pattern (recurrent/episodic or continuous).
   Accepted evidence: medical reports, specialist reports, clinical notes, diagnostic test results. Up to 4 conditions can be listed on the form. Use specific diagnostic terminology (ICD-10/DSM-5).

2. Additional Information: Whether conditions include mental health, substance-related, neurodevelopmental, FASD, or other cognitive impairment. Attach relevant reports.
   Accepted evidence: psychiatric assessments, neuropsychological reports, educational assessments, IEPs.

2.2. Intellectual and Emotional Wellness Scale (IEWS): Rate 28 symptoms on a 0–3 scale (Not present / Mild / Moderate / Severe). Symptoms include: amotivation, anxiety, appetite change, attention deficit, comprehension deficit, concentration deficit, delusions, depressive mood, disinhibition, disorientation, dissociative symptoms, emotional dysregulation, energy change, euphoria, executive function deficits, grandiosity, hallucination, impulse control deficit, insight deficit, judgement deficit, learning deficits, memory deficit, psychomotor retardation, self-harm risk, sleep disturbance, social interaction difficulties, somatic complaints, thought disorder.
   Accepted evidence: psychiatric assessment, clinical notes, mental status exam, standardized scales (PHQ-9, GAD-7, MoCA, WHODAS).

3. Available Medical Information: How long known, frequency of visits, physical measurements (height, weight, BMI, blood pressure), examination findings, consultations completed (diagnostic tests, specialist consults, other assessments), relevant findings.
   Accepted evidence: clinical notes, laboratory results, imaging reports, specialist consultation reports.

4. Visual: Only if visual impairment in Section 1. Snellen visual acuity (corrected/uncorrected, near/distance), visual field defect, ocular mobility changes.
   Accepted evidence: ophthalmology/optometry reports, visual field test results. Skip section entirely if no visual condition.

5. Auditory: Only if auditory impairment in Section 1. Hearing loss type (unilateral/bilateral), change over 5 years, speech understanding (quiet/noisy), safety concerns, tinnitus, hearing aids and their effectiveness.
   Accepted evidence: audiometry reports, ENT consultations. Skip section entirely if no auditory condition.

6. Intervention and Treatment: Hospitalizations/ER visits with dates and purpose, pharmacotherapy (drug name, dose, frequency, start date, conditions treated), interventions and services (addiction services, CBT, counselling, OT, PT, psychotherapy, radiation, chemo, vocational rehab), past treatment and discontinuation reasons, other relevant information.
   Accepted evidence: medication lists, hospital records, treatment plans, discharge summaries, therapy records.

7. HSR Certification: Physician name, profession, regulatory college, registration number, address, signature, date.
   Accepted evidence: physician profile, clinic records. Signature and date may be [Missing].

8. Activities of Daily Living Index (ADLI): Rate 26 activities on a 0–3 scale (No limitation / Mild / Moderate / Severe). Activities: bladder control, bowel control, bathing, grooming, dressing, selecting clothes, meal preparation, eating, shopping, housekeeping, laundry, physical activity, mobility, sitting, standing, stair climbing, transferring, transportation, attending appointments, managing finances, managing medications, communication, social interactions, emotional coping, learning new tasks, safety awareness.
   Accepted evidence: functional assessments, OT reports, clinical observations, patient self-report, caregiver reports. This section requires the highest citation density — each rating must be supported by evidence.

8.2. Services and Supports: Assistive devices, support services, service animals required.
   Accepted evidence: OT reports, clinical notes, patient application.

8.3. Additional ADL Comments: Any additional context about activities of daily living.
   Accepted evidence: all available sources.

9. ADL Certification: Same format as Section 7. May be the same or different professional.
   Accepted evidence: provider credentials. Signature and date may be [Missing].

## Ontario-Specific Notes
- Administered by Ministry of Children, Community and Social Services (MCCSS), not OHIP
- ODSP Act defines "person with a disability" — use this legal framing
- Applicants have 90 calendar days to submit the completed DDP
- The adjudicator is non-medical — write so the impairment→restriction→function link is explicit to a lay reader
- Prescribed class members (CPP-D, QPP-D, DSO-eligible) do not need DDP
- Digital submission available via SADIE (Ministry of Health portal)
- Ministry pays the health care professional for completing the DDP

## Common Rejection Reasons
1. Impairment described without linking to functional restriction
2. Duration not explicitly stated as 1 year or more
3. "Substantial restriction" not quantified — vague "has difficulty" instead of specific functional limitation
4. Missing IEWS ratings when mental health conditions are reported
5. ADL ratings inconsistent with medical conditions described in HSR
6. Missing or incomplete intervention/treatment history
7. Prognosis not completed for each medical condition
8. Cumulative effect of multiple conditions not addressed
