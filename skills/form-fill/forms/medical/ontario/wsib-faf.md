---
form-id: ontario-wsib-faf
form-name: "WSIB Functional Abilities Form (FAF / 2647A)"
jurisdiction: "Ontario, Canada"
governing-body: "Workplace Safety and Insurance Board (WSIB)"
category: workplace-injury
official-url: "https://www.wsib.ca/en/functional-abilities-form"
last-checked: "2026-05-13"
---

# WSIB Functional Abilities Form (FAF) — Form Spec

The Functional Abilities Form (2647A) is completed by the treating health professional to document a worker's functional abilities and restrictions for return-to-work planning. It is 4 pages: page 1 is instructions, pages 2–3 are the form, page 4 is information for workers and employers. Unlike Form 8, the FAF is only completed when requested by the employer or worker, typically when the worker is functionally able to return to work.

## What WSIB and the employer use this for

The FAF is a **communication tool**, not a medical assessment — its purpose is to translate clinical findings into functional workplace terms so the employer can plan "suitable work" (work that is safe, productive, and within the worker's abilities). The WSIB's return-to-work framework prioritizes:
1. **Early return** — even with restrictions, modified or graduated duties are preferred over full absence.
2. **Suitable work matching** — the employer reads Section E abilities/restrictions and matches them against available job tasks. The health professional should describe what the worker **can** do, not just what they cannot.
3. **Time-limited restrictions** — Section E.4 asks how long restrictions apply (1–2 days, 3–7 days, 8–14 days, 14+ days). Vague or open-ended restrictions stall the return-to-work process.
4. **Follow-up accountability** — Section F sets the next review date. The WSIB expects restrictions to evolve as recovery progresses.

The employer may have a workplace-specific FAF — if the worker consents, the employer's own form may be used instead of the WSIB prescribed form. The WSIB only pays the health professional for the prescribed form.

## Review Rubric And Output Contract

This form uses the reusable manual-copy contract in `../../../rules/manual-copy-output.md`.

For the FAF, the primary persona is the treating health professional communicating functional abilities to the employer. The employer receives this form directly — clinical language must be translated into functional workplace terms.

## Key Sections — with exact form-printed anchor text for citations

| Your heading | Citation source_match (anchor text) | Page |
|---|---|---|
| Section A — Worker and Employer Information | "Section A to be completed by the employer and/or worker" | 2 |
| Section B — Worker's Signature | "Worker's Signature" | 2 |
| Section C — Health Professional's Billing | "Health Professional's Billing Information" | 2 |
| Section D — Assessment and Return to Work | "The following information should be completed by the Health" | 3 |
| Section E — Abilities and Restrictions | "Abilities and/or Restrictions" | 3 |
| Section F — Follow-up | "Date of Next Appointment" | 3 |

## WSIB FAF deterministic field scaffold

1. Worker and Employer Information (Section A — worker/employer complete): Worker name, telephone, address, employer name, employer address, DOB, date of accident, areas of injury, job type description, RTW discussion status, employer contact.
   Accepted evidence: patient demographics, employer records, Form 8 if previously filed.

2. Worker's Signature (Section B): Authorization for health professional to provide functional abilities information to employer and WSIB.
   May be [Missing] — note that worker's consent is required for FAF release.

3. Health Professional's Billing (Section C): Designation, WSIB Provider ID, name, address, HST if applicable.
   Accepted evidence: provider credentials. Billing info may be [Missing].

4. Assessment and Return to Work (Section D): Date of assessment, return to work status — one of: (a) capable of returning with no restrictions, (b) capable of returning with restrictions, (c) physically unable to return at this time.
   Accepted evidence: clinical assessment, functional evaluation.

5. Abilities and Restrictions (Section E):
   - E.1 Abilities: Walking (full/up to 100m/100–200m/other), Standing (full/up to 15min/15–30min/other), Sitting (full/up to 30min/30min–1hr/other), Lifting floor-to-waist (full/up to 5kg/5–10kg/other), Lifting waist-to-shoulder (full/up to 5kg/5–10kg/other), Stair climbing (full/up to 5 steps/5–10 steps/other), Ladder climbing (full/1–3 steps/4–6 steps/other), Travel to work (public transit yes/no, drive car yes/no).
   - E.2 Restrictions: Limited hand use (left/right — gripping, pinching, other), work at/above shoulder, environmental exposure, chemical exposure, bending/twisting, repetitive movement, pushing/pulling (left/right), operating motorized equipment, medication side effects.
   - E.3 Additional details and comments.
   Accepted evidence: clinical examination, functional assessment, job demands analysis if available. Each ability and restriction must be supported by examination findings.

6. Follow-up (Section F): Recommended date of next appointment to review abilities/restrictions.
   Accepted evidence: clinical judgment on expected recovery timeline.

## Ontario-Specific Notes
- FAF is optional — only complete when requested by employer or worker
- WSIB pays the health professional for completing the prescribed form
- Billing information (Section C) must NOT be given to the worker or employer
- If employer has a workplace-specific FAF, they may use it with worker consent instead
- FAF is a communication tool, not a medical assessment — focus on what the worker CAN do

## Common Issues
1. Abilities section completed without supporting clinical basis
2. "Unable to return" checked without explanation
3. Restrictions described in clinical terms instead of functional/workplace terms
4. Follow-up date not provided
5. Billing section provided to employer (privacy breach)
