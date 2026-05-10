---
form-id: alberta-aish
form-name: "AISH Medical Report"
jurisdiction: "Alberta, Canada"
governing-body: "Alberta Seniors, Community and Social Services"
category: government-disability
official-url: "https://www.alberta.ca/aish"
last-checked: "2026-05-07"
---

# AISH Medical Report — Form Spec

The AISH (Assured Income for the Severely Handicapped) Medical Report is completed by the patient's physician to support an application for ongoing financial and health benefits under the *AISH Act*. The adjudicator uses this form to determine whether the applicant meets the legislated definition of a person with a severe handicap.

## Eligibility — the three-part test

Every section of this form feeds into three criteria that **all** must be met:

1. **Severe disability** — a condition that results in substantial limitation in ability to perform activities of daily living or other functions
2. **Permanence** — the condition is likely to remain for at least 2 years, or is unlikely to improve with treatment
3. **Substantial earning limitation** — the condition substantially limits the applicant's ability to earn a livelihood

If the medical evidence supports all three, say so explicitly using these terms. Vague language like "the patient has difficulty working" gets rejected — the adjudicator needs the specific link between condition → functional limitation → earning impact.

## Section 1: Patient Information

**Fields**: Patient name, DOB, PHN, address, phone

- **Source**: Patient-provided demographics or front page of clinical records
- **Citations**: Not required for patient-provided demographic data
- **Pitfall**: Ensure DOB and PHN match across all source records — mismatches delay processing

## Section 2: Diagnosis and Medical History

**Fields**: Primary diagnosis (with ICD/DSM code if available), secondary diagnoses, date of onset, date first seen for this condition, relevant medical history, current medications

- **Source**: Clinical notes, specialist reports, psychiatric assessments, medication lists
- **What the adjudicator looks for**:
  - Specific diagnostic terminology (DSM-5 codes for mental health, ICD-10 for physical conditions)
  - Date of onset — must be consistent across records
  - Comorbidities that compound the primary condition's impact
  - Medication list supporting the severity (e.g., multiple psychotropic medications suggest treatment-resistant condition)
- **Common pitfalls**:
  - Using layperson terms instead of clinical diagnoses ("depression" vs. "Major Depressive Disorder, recurrent, severe, F33.2")
  - Omitting comorbidities that strengthen the application (e.g., anxiety disorder comorbid with depression)
  - Inconsistent dates of onset across diagnosis and history sections
- **Terminology**: Use the phrase "severe and prolonged" when the evidence supports it — this maps directly to the AISH Act's eligibility language

## Section 3: Functional Limitations

**Fields**: Impact on activities of daily living (ADLs), cognitive functioning, social functioning, ability to maintain employment, need for supervision or assistance

- **Source**: Specialist assessments (occupational therapy, neuropsych, functional capacity evaluations), clinical notes describing daily functioning, GAF/WHODAS scores
- **What the adjudicator looks for**:
  - **Quantified limitations** — "cannot stand for more than 10 minutes" beats "has limited mobility"
  - **Specific ADL impacts** — bathing, dressing, meal preparation, household management, money management, transportation
  - **Validated scores** — GAF, WHODAS 2.0, PHQ-9, or equivalent standardized measures with numeric values
  - **Work capacity** — specific cognitive or physical demands the patient cannot meet (concentration duration, lifting capacity, interpersonal interaction tolerance)
- **Common pitfalls**:
  - Describing the condition without connecting it to functional impact ("patient has severe anxiety" tells the adjudicator nothing about what the patient *cannot do*)
  - Using relative terms without anchors ("significantly impaired" — compared to what?)
  - Omitting cognitive limitations for mental health conditions (concentration, memory, decision-making, stress tolerance)
- **Terminology**: Frame limitations as "substantially limits the ability to..." — this echoes the Act's earning limitation criterion
- **Citation density**: This section typically has the highest citation count. Each specific limitation should trace to a clinical observation, test score, or specialist finding.

## Section 4: Prognosis and Treatment Plan

**Fields**: Expected duration of condition, likelihood of improvement, current treatment plan, past treatments attempted, future treatment recommendations

- **Source**: Specialist reports (especially prognosis statements), treatment histories, imaging/lab results supporting permanence, referral letters
- **What the adjudicator looks for**:
  - **Permanence language** — "unlikely to improve" or "expected to persist beyond 2 years" or "permanent and unlikely to change with further treatment"
  - **Treatment history** — what's been tried and failed, showing the condition is refractory to treatment
  - **Objective evidence** — imaging, lab results, or specialist opinions supporting the prognosis (not just the GP's opinion)
- **Common pitfalls**:
  - Hedging language that undermines permanence ("may improve with treatment" — unless the evidence says otherwise, state the prognosis clearly)
  - Forgetting to mention failed treatments (if the patient tried 3 medications without improvement, say so — it strengthens permanence)
  - Missing specialist corroboration (the adjudicator gives more weight to specialist prognosis than GP-only assessments)
- **Terminology**: "The condition is permanent" or "prognosis is poor for significant improvement" — avoid "stable" alone, as it can be read as "manageable" rather than "permanent"

## Section 5: Physician Declaration

**Fields**: Physician name, clinic, specialty, CPSA registration number, date, signature

- **Source**: Provided by the signing physician during the intake checklist (§1 of SKILL.md)
- **Citations**: Not required — this is attestation, not evidence
- **Note**: Draft the declaration text but mark it clearly as requiring the physician's review and signature. Include a placeholder for the signature line.
- **Physician judgment fields**: If the form asks "In your clinical opinion, is this condition permanent?", draft the answer based on the evidence and mark it with `[Physician Judgment]`

## Source Hints — Where to Look

| Form Section | Primary Source Records | Secondary Sources |
|-------------|----------------------|-------------------|
| Diagnosis | Clinical notes, psychiatric assessments | Specialist referral letters, hospital discharge summaries |
| Functional Limitations | OT/neuropsych assessments, functional capacity evaluations | Clinical notes describing daily functioning, caregiver reports |
| Prognosis | Specialist reports, imaging/lab results | Treatment histories, medication records |
| Treatment Plan | Current prescriptions, therapy records | Referral documentation, past treatment summaries |

## Alberta-Specific Notes

- AISH is administered by Alberta Seniors, Community and Social Services (not Alberta Health Services — AHS runs hospitals, not benefits)
- The AISH Act defines "severe handicap" — use this term in the form, not "disability" (though both are understood)
- Income and asset tests are separate from the medical eligibility — this form addresses medical criteria only
- AISH reviews occur periodically — a well-documented initial form with clear citations makes reviews smoother
- If the applicant is under 18, different criteria may apply — note this if the patient's DOB indicates a minor
