---
form-id: alberta-ltd
form-name: "Long-Term Disability — Physician's Statement"
jurisdiction: "Alberta, Canada"
governing-body: "Insurer-specific (Manulife, Sun Life, Canada Life, etc.)"
category: insurance-disability
official-url: "https://www.canada.ca/en/financial-consumer-agency/services/insurance/disability.html"
last-checked: "2026-05-07"
---

# Long-Term Disability Physician's Statement — Form Spec

The LTD Physician's Statement is completed by the treating physician to support a claim for long-term disability benefits through the patient's employer group insurance plan. Unlike government disability (AISH), LTD forms are insurer-specific — but they share a common structure.

## Key Differences from AISH

- **Two-phase definition of disability**: Most LTD policies use an "own occupation" test for the first 24 months, then switch to "any occupation" — the form must address both
- **Insurer-specific forms**: Manulife, Sun Life, Canada Life, and others each have their own form. The section structure below covers the common fields; note any insurer-specific additions
- **Elimination period**: LTD typically has a 90–180 day waiting period — the form must establish that the condition persists beyond this period
- **Functional capacity focus**: Insurers weight functional limitations more heavily than diagnosis alone

## Section 1: Patient and Policy Information

**Fields**: Patient name, DOB, SIN (optional), employer name, policy/group number, occupation/job title, date last worked, current work status

- **Source**: Patient-provided information, employer records
- **Citations**: Not required for demographic/employment data
- **Important**: "Date last worked" and "occupation" are critical — they anchor the disability definition. Get these from the patient during setup.
- **Pitfall**: Ensure the job title matches what's on the policy, not an informal description

## Section 2: Diagnosis

**Fields**: Primary diagnosis with ICD-10 code, secondary diagnoses, date of onset, date of first consultation, is the condition work-related (Y/N)

- **Source**: Clinical notes, specialist reports, diagnostic imaging
- **What the insurer reviewer looks for**:
  - Specific ICD-10 codes (not narrative descriptions alone)
  - Clear onset date — must predate or coincide with the date last worked
  - Whether the condition is work-related (if yes, workers' compensation may be primary)
  - Objective diagnostic evidence (imaging, lab work, validated assessments)
- **Common pitfalls**:
  - Listing symptoms instead of diagnoses ("back pain" vs. "Lumbar disc herniation, L4-L5, M51.16")
  - Onset date after the last day of work (raises red flags with the insurer)
  - Missing the work-relatedness question (triggers additional investigation)

## Section 3: Treatment and Medications

**Fields**: Current treatment plan, medications with dosages, therapies (physio, counseling, OT), surgical history, future treatment planned, compliance notes

- **Source**: Medication lists, therapy records, surgical reports, referral letters
- **What the insurer reviewer looks for**:
  - Active treatment engagement — the insurer wants to see the patient is pursuing reasonable treatment
  - Medication dosages (not just names) — titration history shows treatment progression
  - Failed treatments — what was tried and didn't work, justifying current approach
  - Treatment compliance — non-compliance can be grounds for claim denial
- **Common pitfalls**:
  - Listing medications without dosages or frequency
  - Omitting failed treatments (the insurer interprets absence as "hasn't tried enough")
  - Not mentioning referrals to specialists (suggests the GP hasn't pursued appropriate workup)

## Section 4: Functional Limitations and Restrictions

**Fields**: Physical limitations (sitting, standing, walking, lifting, carrying), cognitive limitations (concentration, memory, decision-making), restrictions on specific job duties, need for workplace accommodations

- **Source**: Functional capacity evaluations, OT assessments, neuropsych testing, specialist opinions on work capacity
- **What the insurer reviewer looks for**:
  - **Objective, measurable limitations** — "can sit for 20 minutes maximum before needing to stand" not "has difficulty sitting"
  - **Mapping to job duties** — the patient's specific occupation matters. "Cannot lift more than 5 lbs" is disabling for a warehouse worker but not for a software developer
  - **Own occupation vs. any occupation** — for the first 24 months, limitations must prevent the patient's specific job; after 24 months, any gainful occupation
  - **Cognitive functional limitations** — for mental health claims, concentration duration, ability to meet deadlines, interpersonal interaction tolerance, stress management capacity
- **Common pitfalls**:
  - Describing limitations without connecting to the specific job duties
  - Omitting cognitive limitations for mental health conditions
  - Using "unable to work" without specifying which physical or cognitive demands can't be met
- **Citation density**: Highest citation section. Each specific limitation needs a source reference.

## Section 5: Prognosis and Return to Work

**Fields**: Expected duration of disability, prognosis for recovery, anticipated return-to-work date (full or modified duties), barriers to return, recommended accommodations

- **Source**: Specialist prognosis, treatment response data, functional trajectory notes
- **What the insurer reviewer looks for**:
  - **Realistic timeline** — "indefinite" is acceptable if supported, but insurers prefer specific estimates even if approximate ("unlikely to return to pre-injury capacity within 12 months")
  - **Modified duties assessment** — can the patient do part-time, light duties, or a different role?
  - **Treatment response trajectory** — is the patient improving, stable, or declining?
  - **Barriers** — beyond medical: transportation, medication side effects, workplace triggers
- **Common pitfalls**:
  - "Unable to work indefinitely" without supporting evidence for permanence
  - Not addressing modified/alternative work possibilities (insurers interpret silence as "hasn't considered it")
  - Overly optimistic return dates that get revised repeatedly (undermines credibility)
- **Terminology**: Use "total disability" when the evidence supports inability to perform all duties of own occupation; "partial disability" when some duties can be performed

## Section 6: Physician Declaration

**Fields**: Physician name, clinic, specialty, CPSA registration, date of last examination, signature

- **Source**: Signing physician details from intake checklist
- **Important**: "Date of last examination" must be recent — insurers question forms based on examinations more than 3 months old
- **Note**: Draft the declaration but mark as requiring physician review and signature

## Insurer-Specific Notes

Different insurers may add sections. Common additions:

| Insurer | Additional Fields |
|---------|-------------------|
| Manulife | Functional abilities form (FAF) — detailed physical capacity checklist |
| Sun Life | Mental health supplementary — PHQ-9/GAF scores required |
| Canada Life | Cognitive demands checklist — specific to sedentary occupations |

If the user names a specific insurer, note any known additional requirements. If the insurer's form PDF is available, use `deepcitation prepare` to extract its exact field structure.
