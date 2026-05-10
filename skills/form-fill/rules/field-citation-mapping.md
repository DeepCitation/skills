# Field-Citation Mapping

How DeepCitation citations connect form answers to source medical records. This file defines the draft markdown format and citation conventions specific to form-fill output.

**Canonical format**: `packages/deepcitation/docs/prompts/citation-format.md` is the single source of truth for citation field rules. This file adapts those rules to the medical form context.

**UX context**: `k` (sourceMatch) becomes the **yellow highlight** in the PDF viewer. The reader sees bold text in the form draft → clicks → sees identical words highlighted in yellow on the source page. If `k` is a full sentence, the entire sentence turns yellow — unreadable. Keep `k` to 1–4 words: the distinctive noun, code, or value.

## Draft Format

The form draft (`.deepcitation/form-draft.md`) uses section headers matching the form spec and the manual-copy block contract in `manual-copy-output.md`. Keep copyable form text separate from evidence. Put citations in the adjacent `Evidence` block unless the form itself requires citations in the answer.

```markdown
## Section 2: Diagnosis and Medical History

### Primary Diagnosis

**Copy to form**
Major Depressive Disorder, recurrent, severe, first documented January 2023.

**Evidence**
**F33.2** [1]; **January 2023** [2] per clinical notes from Dr. Smith.

**Review required**
Physician should confirm final diagnostic wording before signing.

### Secondary Diagnoses

**Copy to form**
Generalized Anxiety Disorder, comorbid with the primary diagnosis.

**Evidence**
**F41.1** [3]; comorbid presentation noted in **Dr. Smith's assessment** [4] dated March 2023.
```

## Citation Conventions by Field Type

### Diagnostic codes and terms

Cite the record where the diagnosis is formally documented. The citation's `k` (sourceMatch) is the diagnostic code or key diagnostic phrase:

```
**F33.2** [1]       ← k = "F33.2", f = full sentence from clinical note containing the code
**DSM-5 296.33** [2] ← k = "DSM-5 296.33"
```

### Dates

Cite the record where the date appears. The `k` is the date value itself:

```
first documented **January 2023** [2]  ← k = "January 2023"
date last worked **March 15, 2024** [5] ← k = "March 15, 2024"
```

If the same date appears in multiple records, cite the most authoritative source (specialist report > clinical notes > patient self-report).

### Quantified limitations

Cite the assessment that produced the measurement. The `k` is the specific value:

```
cannot sustain attention beyond **8-minute intervals** [6]  ← k = "8-minute intervals"
**GAF score 42** [7]                                        ← k = "GAF score 42"
lifting capacity limited to **5 lbs** [8]                   ← k = "5 lbs"
```

### Medication names and dosages

Cite the medication list or prescription record. The `k` is the dosage or medication-dosage pair:

```
Sertraline **200mg daily** [7]  ← k = "200mg daily"
```

### Boolean/checkbox justifications

When the form has a yes/no field (e.g., "Is the condition permanent?"), the draft answer includes the justification with a citation to the supporting evidence:

```
**Is the condition permanent?** Yes — the condition has persisted for **over 24 months** [11] despite multiple treatment modalities, and Dr. Jones's prognosis notes **unlikely to improve** [12] with further intervention.
```

### Specialist attributions

When citing another specialist's findings, attribute them explicitly. The `k` is the key finding, and the `r` (reasoning) notes the specialist:

```
per Dr. Jones's neuropsych evaluation, executive function is **severely impaired** [13]
```

Citation data: `{"n": 13, "r": "specialist finding on executive function", "f": "Executive function testing reveals severely impaired performance across all domains...", "k": "severely impaired", "p": "page_number_4_index_3", "l": [22, 23, 24]}`

### Free-text / physician opinion fields

Some form fields ask for the physician's professional judgment (e.g., "Describe the patient's prognosis in your own words"). Draft these with the supporting evidence cited, but mark them as requiring physician input:

```
**Physician's Assessment of Prognosis**: Based on the documented treatment history showing **three failed medication trials** [14] and specialist opinion that the condition is **unlikely to remit** [15], the prognosis for return to baseline functioning is poor. ⚠ *Requires physician's independent clinical judgment to finalize.*
```

## What Does NOT Need Citations

- **Patient-provided demographics**: Name, address, phone number, emergency contact — these come from the patient directly, not from clinical records
- **Policy/employer information**: Group number, employer name, job title — provided by the patient or employer
- **Physician attestation**: The signing physician's own credentials, clinic address, and signature
- **Form instructions**: Repeating the form's own instructions or field labels

## Supporting Facts (children)

When a single claim has 2+ verifiable details from the same source (dates, codes, severity qualifiers), group them under the primary citation using a `c` (children) array. Each child uses the same keys (`k`, `p`, `l`).

Medical forms are a natural fit — a diagnosis often has a code, onset date, and severity, all from the same clinical note:

```json
{"n": 2, "r": "primary diagnosis with code and onset", "f": "Diagnosis: Major Depressive Disorder, recurrent, severe (F33.2), first documented January 2023", "k": "F33.2", "p": "page_number_3_index_2", "l": [14, 15],
 "c": [
   {"k": "January 2023", "p": "page_number_3_index_2", "l": [15]},
   {"k": "recurrent, severe", "p": "page_number_3_index_2", "l": [14]}
 ]}
```

Use children only when the details genuinely support the primary fact. Default is one citation per distinct fact.

## Multi-Source Fields

When a single answer draws from multiple source records (different attachments), use **separate citations** — not children. Children are for multi-detail from the same source; separate `[N]` markers are for cross-document evidence:

```
**Functional Limitations — Concentration**: Neuropsych testing shows **sustained attention of 8 minutes** [6] (Dr. Lee, March 2024). Clinical notes document **inability to complete routine tasks** [16] (Dr. Smith, ongoing). Employer records confirm **3 documented incidents** [17] of work errors attributed to concentration deficits.
```

Each `[N]` traces to a different source document, giving the adjudicator a multi-source evidence trail.

## Citation Density Guidelines

| Form Section | Expected Density | Rationale |
|-------------|-----------------|-----------|
| Patient Information | 0–2 citations | Mostly patient-provided demographics |
| Diagnosis | 3–8 citations | Each diagnosis code, onset date, and key finding |
| Functional Limitations | 8–20 citations | Every specific limitation needs a source |
| Treatment / Medications | 4–10 citations | Dosages, dates, failed treatments |
| Prognosis | 3–8 citations | Specialist opinions, treatment trajectory, permanence evidence |
| Physician Declaration | 0 citations | Attestation, not evidence |

These are guidelines, not hard limits. Citation count is driven by evidence density — a complex case with multiple specialists and comorbidities will have more citations than a straightforward single-diagnosis case.
