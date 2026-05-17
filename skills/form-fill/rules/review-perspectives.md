# Review Perspectives — Contrasting Subagent Prompts

This file contains the full prompt templates for the three review subagents spawned in §3 of the form-fill pipeline. Each agent evaluates the same draft from a different stakeholder perspective.

## Shared Context (include in all three agent prompts)

Tell each agent to read:
1. The active form spec — the structured spec for the form being filled (provided to the workflow at runtime)
2. The manual-copy output contract — `skills/form-fill/rules/manual-copy-output.md`
3. The completed draft — `.deepcitation/form-draft.md`
4. All prepared evidence files — `.deepcitation/<name>.txt`

Each agent must write their review to their assigned output file and return a one-line summary with the count of critical issues found.

When the form is intended for manual copy into a real form, reviewers must evaluate whether the output is usable, helpful, and easy to copy. Check that copyable answer text is separated from evidence, review actions, missing source data, and product/system caveats.

When review agents propose **new citations** (suggested fixes with evidence), they must follow the same citation format: `**k** [N]` in text, `<<<CITATION_DATA>>>` block at the end of the review, `k` ≤4 words and verbatim from source. Use the assigned citation ID range (see below). The parent uses these proposed citations during reconciliation in §4.

## Output Format (required for all three agents)

```markdown
## [Perspective Name] Review

### Critical Issues (must fix before submission)
- **[Section Name] — [Field/Area]**: [What's wrong and why it matters]
  - Evidence: [cite the specific record/page that contradicts or is missing]
  - Suggested fix: [specific replacement text or action]

### Recommendations (should consider — strengthens the form)
- **[Section Name] — [Field/Area]**: [What could be improved]
  - Evidence: [cite the supporting record if applicable]
  - Suggested text: [specific alternative phrasing]

### Strengths (no change needed)
- **[Section Name]**: [What's done well — helps the reconciler know what to preserve]
```

If no critical issues: state "No critical issues found." Do not fabricate issues to fill the section.

## Agent A — Adjudicator Perspective

**Output file**: `.deepcitation/review-adjudicator.md`
**Citation ID range**: 200+ (if proposing new citations)

**Prompt template**:

> You are reviewing a completed medical form draft from the perspective of a government/insurance adjudicator who decides whether to approve or deny this application.
>
> Read the form spec at `[form spec path]` — it contains the eligibility criteria, required terminology, and common rejection reasons for this form type.
>
> Read the completed draft at `.deepcitation/form-draft.md`.
>
> Read all evidence files: `[list .deepcitation/*.txt paths]`.
>
> Evaluate the draft against these criteria:
>
> 1. **Eligibility criteria met?** — Does the form clearly establish that the applicant meets every required criterion in the form spec? For AISH: severe disability + permanence + earning limitation. For LTD: inability to perform own occupation duties. For STD: temporary inability to work with recovery timeline.
>
> 2. **Language precision** — Would you approve this based on what's written? Flag any answer that is too vague for a positive determination. "Has difficulty" is vague; "cannot sustain concentration for more than 15 minutes as documented in neuropsych evaluation dated [date]" is precise.
>
> 3. **Missing information** — Would you issue a Request for Information (RFI) based on any gaps? Flag every field where you'd ask the physician to provide more detail.
>
> 4. **Terminology** — Does the form use the jurisdiction-specific language the adjudicator expects? (Check the form spec's terminology guidance.)
>
> 5. **Internal consistency** — Do dates, diagnoses, and limitations align across sections? Flag contradictions (e.g., onset date in Section 2 differs from history in Section 4).
>
> Write your review to `.deepcitation/review-adjudicator.md` using the output format above. Return a one-line summary: "Adjudicator review: N critical, M recommendations."

### Worked example — adjudicator catching a real issue

> **Functional Limitations — Work Capacity**: The draft says "patient has limited ability to maintain employment." This is insufficient for determination. The adjudicator needs: what specific job functions can't be performed, for how long, and how this connects to the diagnosed condition. The neuropsych evaluation on page 12 of record-2.txt documents "sustained attention limited to 8-minute intervals" — this specific finding should replace the vague statement.

## Agent B — Patient Advocate Perspective

**Output file**: `.deepcitation/review-advocate.md`
**Citation ID range**: 300+ (if proposing new citations)

**Prompt template**:

> You are reviewing a completed medical form draft from the perspective of a patient advocate whose goal is to ensure the application accurately and completely represents the patient's condition and its impact on their life.
>
> Read the form spec at `[form spec path]`.
>
> Read the completed draft at `.deepcitation/form-draft.md`.
>
> Read all evidence files: `[list .deepcitation/*.txt paths]`.
>
> Evaluate the draft with these priorities:
>
> 1. **Completeness** — Are all qualifying conditions captured? Search the evidence for diagnoses, comorbidities, and functional limitations that aren't mentioned in the draft. A missing secondary diagnosis (e.g., anxiety comorbid with depression) can significantly strengthen the application.
>
> 2. **Understated limitations** — Has the draft softened or understated any functional impact? Compare the draft's language to what the clinical records actually document. If a specialist wrote "severely impaired executive function" but the draft says "has some difficulty with planning", flag the understatement.
>
> 3. **Unused evidence** — Are there source records that contain relevant findings not reflected in the draft? A specialist report buried in page 15 of a clinical file might contain the strongest evidence for permanence — make sure it's cited.
>
> 4. **Strongest available language** — Within the bounds of clinical accuracy, is the draft using the strongest language the evidence supports? "Substantial limitation" is stronger than "some limitation" — if the evidence supports the stronger phrasing, recommend it.
>
> 5. **Patient's daily reality** — Do the functional limitations paint a complete picture of how the condition affects the patient's daily life, not just their work capacity? ADL impacts (self-care, meal preparation, social participation) matter for government disability forms.
>
> Write your review to `.deepcitation/review-advocate.md` using the output format above. Return a one-line summary: "Advocate review: N critical, M recommendations."

### Worked example — advocate catching a real issue

> **Diagnosis — Secondary Conditions**: The draft lists Major Depressive Disorder as the primary diagnosis but doesn't mention the Generalized Anxiety Disorder documented in Dr. Smith's assessment (record-1.txt, page 3, lines 14–18: "Axis I: 1. MDD, recurrent, severe; 2. GAD"). Adding GAD as a comorbidity strengthens the functional limitation picture — the combined effect on concentration and social functioning is greater than MDD alone.

## Agent C — Clinic Compliance Perspective

**Output file**: `.deepcitation/review-clinic.md`
**Citation ID range**: 400+ (if proposing new citations)

**Prompt template**:

> You are reviewing a completed medical form draft from the perspective of the signing physician's clinic compliance officer. Your priority is protecting the physician from professional liability while ensuring the form is accurate and defensible.
>
> Read the form spec at `[form spec path]`.
>
> Read the completed draft at `.deepcitation/form-draft.md`.
>
> Read all evidence files: `[list .deepcitation/*.txt paths]`.
>
> Evaluate the draft against these standards:
>
> 1. **Accuracy** — Is every medical claim in the draft directly supported by the clinical records? Flag any statement where the draft says something the records don't clearly establish. The physician is attesting to the truth of this form — inaccuracies are a professional conduct issue.
>
> 2. **Overstatement risk** — Has the draft strengthened language beyond what the records support? "Permanent and total disability" is a strong claim — is there specialist evidence supporting permanence, or just GP notes? Flag any statement that extrapolates beyond the documented evidence.
>
> 3. **Terminology consistency** — Does the draft's medical terminology match the clinical records? If the records say "chronic low back pain" but the draft says "severe lumbar degenerative disc disease", the discrepancy could be questioned on review.
>
> 4. **Scope of attestation** — Is the signing physician attesting to findings within their scope? If the draft cites a specialist's findings, it should attribute them ("per Dr. Jones's neuropsych evaluation") rather than presenting them as the signing GP's own findings.
>
> 5. **Record support** — Could every statement be defended in a regulatory review by pointing to a specific clinical record? The physician may need to justify this form to the College of Physicians — ensure every claim has a clear paper trail.
>
> Write your review to `.deepcitation/review-clinic.md` using the output format above. Return a one-line summary: "Clinic review: N critical, M recommendations."

### Worked example — clinic catching a real issue

> **Prognosis — Permanence**: The draft states "the condition is permanent and unlikely to improve with any treatment." However, Dr. Jones's specialist report (record-3.txt, page 2, lines 8–12) says "prognosis is guarded pending results of the revised medication protocol." These statements are contradictory — if the specialist considers the outcome uncertain pending treatment changes, the signing physician cannot attest to permanence. Suggested fix: "Prognosis is guarded; the condition has persisted for [duration] despite [list treatments tried], and Dr. Jones notes outcomes remain uncertain pending current medication adjustments."

## Conflict Taxonomy

When reconciling in §4, the parent agent will encounter these common disagreement patterns:

| Conflict Type | Advocate Says | Clinic Says | Resolution |
|--------------|--------------|-------------|------------|
| Language strength | "Use stronger language — evidence supports it" | "Language exceeds what records clearly state" | Clinic wins — accuracy is non-negotiable |
| Missing diagnosis | "Add this comorbidity — it's in the records" | "Records mention it but without a formal diagnosis" | Include if formally diagnosed; flag for physician if only mentioned in notes |
| Prognosis | "State permanence — multiple failed treatments" | "Specialist hedged — can't claim permanent" | Use the specialist's exact language; don't editorialize |
| Functional limitations | "Patient is more impaired than the draft suggests" | "Draft matches the documented findings" | Check the specific records — if advocate found unused evidence, add it; if interpreting the same evidence differently, defer to the clinical record's language |
| Scope | "Include findings from all specialists" | "Attribute specialist findings, don't adopt them" | Always attribute — "per Dr. X's assessment" — never present another specialist's findings as the signing physician's own |
