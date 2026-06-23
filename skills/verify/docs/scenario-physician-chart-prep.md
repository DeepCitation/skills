# Test scenario: physician reading a chart before the visit

A concrete end-to-end walkthrough for exercising `/verify` against a real-world,
high-stakes use: a clinician synthesizing a patient's medical history before
walking into the room. Use it as a manual test script — the **acceptance checks**
at each step are what "working" looks like.

> Fictional patient data only. This file is a test walkthrough, not skill
> instruction content; the SKILL.md examples stay domain-neutral.

## The situation

A physician has nine minutes before a new patient in Room 4: a 67-year-old
transfer with a referral packet, ~140 pages of outside records, a med list, and a
stack of labs and imaging. They cannot read the whole chart, and a fabricated
summary is *worse* than none. The job of `/verify` here is not "summarize the
chart" — it is **a scannable synthesis where every clinical statement links back
to the exact line in the record, and anything not in the record is visibly
flagged.**

## Run it

Drive a clinical *question* against the records, not a vague "summarize":

```
/verify
Claim: Give me this patient's active problems, current meds with doses, allergies,
       and any abnormal result or referral that was flagged but never closed out.
Evidence: ~/charts/room4-transfer-records.pdf
```

The skill then:
1. **`prepare`** reads the PDF (OCR + structure) — the only reader; nothing is
   answered from the model's own knowledge.
2. Authors a clean, lavish-styled report answering the question (problem list, a
   meds table, a "loose threads" section), each cited phrase wrapped as
   `data-cite="N"`.
3. **`verify --html`** verifies every statement against the source, embeds
   DeepCitation's live citation runtime, and opens it in lavish.

## What to look for (acceptance checks)

### 1. Every clinical claim is a live citation
Click **"Warfarin 5 mg daily"**, **"eGFR 38, down from 52"**, **"Allergy:
penicillin — hives."** Each opens DeepCitation's popover: the matched phrase, the
evidence keyhole crop of the actual record line, then the page view.

- ✅ PASS: each claim's popover shows the real source line/page.
- ❌ FAIL: a claim has no citation, or the popover crop doesn't contain the claimed text.

### 2. Status is discrete — never a confidence score
The badge is one of: `verified` (in the chart, verbatim), `variance` (true but
the wording drifts — e.g. report "penicillin allergy" vs chart "PCN — hives",
reconciled by the variance footnote), `unverified` (not found in the record),
`pending`.

- ✅ PASS: badges are these four states; no percentage, star rating, or "confidence" appears anywhere.
- ❌ FAIL: any numeric confidence, trust meter, hero banner, or verification dashboard.

### 3. The miss-detector works
An `unverified` badge marks any statement the report makes that is **not** in the
records — the safety net against a confident hallucination (e.g. an asserted "no
prior MI" the chart never states).

- ✅ PASS: a claim with no source support reads `unverified`, not `verified`.
- ❌ FAIL: an unsupported claim is presented as verified.

### 4. Loose threads surface, anchored
The "flagged but never closed out" section names real open items —
**"Hgb 9.1 (11/2024) — flagged, no documented follow-up"**, **"Cardiology referral
placed, no consult note in record"** — each a live citation to the actual lab /
order line.

- ✅ PASS: each loose thread links to its source; clicking shows the lab/order.
- ❌ FAIL: a loose thread is asserted without a citation (it's then unverifiable).

### 5. The review loop stays on-source
Highlight **"last A1c 8.2"** and comment *"when was this drawn?"*. The agent
re-anchors to the lab date and replies in the report (*"A1c 8.2 drawn 09/2024;
most recent in record"*). Highlighting prose starts a lavish comment; clicking a
citation opens DeepCitation's popover instead — the two never collide.

- ✅ PASS: prose selection → lavish comment; citation click → DeepCitation popover; the agent's reply lands as a new verifiable citation.
- ❌ FAIL: clicking a citation starts a lavish annotation, or a reply asserts an un-cited fact.

### 6. Honest failure
If `prepare` (or `verify`) cannot read the records, the skill **stops and reports
it** — it never hands over a polished, made-up history.

- ✅ PASS: an unreadable source ends in a clear error, no deliverable.
- ❌ FAIL: a report is produced from the model's guess when the source couldn't be read.

## Why this is the right test

It stresses the whole thesis of the skill in one pass: a synthesis is only safe if
every word links to the primary source and everything unsupported is marked as
such. The trust model is inverted from a plain LLM summary — **nothing is asserted
as fact unless it anchors, and the review loop's answers can't drift off-source.**
