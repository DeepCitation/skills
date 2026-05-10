---
name: form-fill-registry
description: Index of supported form types for /form-fill skill
---

# Supported Forms

| Form ID | Name | Path | Jurisdiction | Category | Status |
|---------|------|------|-------------|----------|--------|
| `alberta-aish` | AISH Medical Report | [medical/alberta/aish.md](medical/alberta/aish.md) | Alberta, Canada | Government disability | Active |
| `alberta-ltd` | Long-Term Disability — Physician's Statement | [medical/alberta/ltd.md](medical/alberta/ltd.md) | Alberta, Canada | Insurance | Active |
| `alberta-std` | Short-Term Disability — Physician's Statement | [medical/alberta/std.md](medical/alberta/std.md) | Alberta, Canada | Insurance | Active |
| `canada-dtc` | Disability Tax Credit Certificate (T2201) | [medical/canada/dtc-t2201.md](medical/canada/dtc-t2201.md) | Canada (Federal) | Federal tax credit | Active |
| `alberta-ltd-bluecross` | Alberta Blue Cross — LTD Medical Statement | [medical/alberta/ltd-bluecross.md](medical/alberta/ltd-bluecross.md) | Alberta, Canada | Insurance (Blue Cross) | Active |
| `alberta-std-bluecross` | Alberta Blue Cross — STD Medical Statement | [medical/alberta/std-bluecross.md](medical/alberta/std-bluecross.md) | Alberta, Canada | Insurance (Blue Cross) | Active |
| `alberta-ltd-manulife` | Manulife — Attending Physician Statement (LTD) | [medical/alberta/ltd-manulife.md](medical/alberta/ltd-manulife.md) | Alberta, Canada | Insurance (Manulife) | Active |
| `alberta-std-manulife` | Manulife — Attending Physician Statement (STD) | [medical/alberta/std-manulife.md](medical/alberta/std-manulife.md) | Alberta, Canada | Insurance (Manulife) | Active |
| `alberta-ltd-sunlife` | Sun Life — Disability Claim Medical Report (LTD) | [medical/alberta/ltd-sunlife.md](medical/alberta/ltd-sunlife.md) | Alberta, Canada | Insurance (Sun Life) | Active |
| `alberta-std-sunlife` | Sun Life — Disability Claim Medical Report (STD) | [medical/alberta/std-sunlife.md](medical/alberta/std-sunlife.md) | Alberta, Canada | Insurance (Sun Life) | Active |
| `alberta-ltd-canadalife` | Canada Life — Attending Physician Statement (LTD) | [medical/alberta/ltd-canadalife.md](medical/alberta/ltd-canadalife.md) | Alberta, Canada | Insurance (Canada Life) | Active |
| `alberta-std-canadalife` | Canada Life — Attending Physician Statement (STD) | [medical/alberta/std-canadalife.md](medical/alberta/std-canadalife.md) | Alberta, Canada | Insurance (Canada Life) | Active |

## Selecting a form

Match the user's description to the table above. Common aliases:

- "AISH", "assured income", "severely handicapped" → `alberta-aish`
- "LTD", "long-term disability", "long term" → `alberta-ltd`
- "STD", "short-term disability", "short term" → `alberta-std`
- "DTC", "disability tax credit", "T2201" → `canada-dtc`
- "Blue Cross LTD", "ABC LTD" → `alberta-ltd-bluecross`
- "Blue Cross STD", "ABC STD" → `alberta-std-bluecross`
- "Manulife LTD", "MFC LTD" → `alberta-ltd-manulife`
- "Manulife STD", "MFC STD" → `alberta-std-manulife`
- "Sun Life LTD", "SLF LTD" → `alberta-ltd-sunlife`
- "Sun Life STD", "SLF STD" → `alberta-std-sunlife`
- "Canada Life LTD", "Great-West LTD", "GWL LTD" → `alberta-ltd-canadalife`
- "Canada Life STD", "Great-West STD", "GWL STD" → `alberta-std-canadalife`

If the user names an insurer without specifying LTD or STD, ask which benefit period the claim is for.

If the form isn't listed here, tell the user this form type isn't supported yet and offer to work from a blank form PDF if they can provide one (use `deepcitation prepare` to extract its structure).

## Shared output contract

All form specs should use the reusable manual-copy and review contract in [../rules/manual-copy-output.md](../rules/manual-copy-output.md), then add form-specific labels, eligibility criteria, and review rubrics in the individual form spec.

## Adding a new form

Create a new `.md` file under `forms/<domain>/<region>/`. Follow this directory convention:

```
forms/
├── medical/
│   ├── alberta/
│   │   ├── aish.md
│   │   ├── ltd.md
│   │   └── std.md
│   ├── bc/            # future: British Columbia forms
│   └── ontario/       # future: Ontario forms
├── legal/             # future: legal forms
└── insurance/         # future: standalone insurance forms
```

Each form spec must include:
1. **YAML frontmatter** with `form-id`, `form-name`, `jurisdiction`, `governing-body`, `category`, `official-url`, `last-checked`
2. **Sections** matching the real form's structure, each with field guidance
3. **Eligibility criteria** — what the adjudicator/reviewer looks for
4. **Common pitfalls** — known rejection reasons
5. **Terminology** — jurisdiction-specific language the reviewer expects

Add the new form to the table above after creating the spec file.
