#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DTC_REQUIRED_PATTERNS = [
  { label: "Part A", pattern: /\bPart\s+A\b/i },
  { label: "Part B", pattern: /\bPart\s+B\b/i },
  { label: "Effects of Impairment", pattern: /\bEffects?\s+of\s+Impairment\b|basic activities of daily living/i },
  { label: "Diagnosis", pattern: /\bDiagnosis\b/i },
  { label: "Duration", pattern: /\bDuration\b|12\s*(?:continuous\s*)?months|prolonged/i },
  { label: "Therapy", pattern: /\bTherapy\b|life-sustaining therapy/i },
  { label: "Certification", pattern: /\bCertification\b|signature|certify/i },
];

const DTC_FIELD_LABEL_PATTERNS = [
  { label: "First name", pattern: /\bFirst name\b|\bFirst and last name\b/i },
  { label: "Last name", pattern: /\bLast name\b|\bFirst and last name\b/i },
  { label: "Date of birth", pattern: /\bDate of birth\b/i },
  { label: "Medical practitioner", pattern: /\bMedical practitioner\b|\bPractitioner\b/i },
  { label: "Effects of impairment", pattern: /\bEffects?\s+of\s+Impairment\b|\bWalking\b/i },
  { label: "Diagnosis", pattern: /\bDiagnosis\b/i },
  { label: "Duration", pattern: /\bDuration\b|\bYear impairment began\b|12\s*(?:continuous\s*)?months/i },
  { label: "Life-sustaining therapy", pattern: /\bLife-sustaining therapy\b/i },
  { label: "Certification", pattern: /\bCertification\b|\bSignature\b|\bSign\b/i },
];

const FINAL_SUMMARY_BUCKETS = [
  { label: "Ready to copy", pattern: /\bReady to copy\b/i },
  { label: "Needs physician review", pattern: /\bNeeds (?:physician )?review\b/i },
  { label: "Missing source data", pattern: /\bMissing source data\b/i },
  { label: "Evidence status", pattern: /\bEvidence status\b/i },
];

const COPY_BLOCK_FORBIDDEN = [
  { rule: "COPY_BLOCK_HAS_CITATION", pattern: /\[\d+\]/ },
  { rule: "COPY_BLOCK_HAS_UNDOCUMENTED", pattern: /not documented in the available records/i },
  { rule: "COPY_BLOCK_HAS_REVIEW_FLAG", pattern: /\bphysician must confirm\b|\bpending physician confirmation\b|\brequires physician\b/i },
  { rule: "COPY_BLOCK_HAS_SOURCE_LABEL", pattern: /\[(?:Patient Chart|Doctor Profile|Physician Profile|MetadataDate|Source|Attachment)[^\]]*\]/i },
  { rule: "COPY_BLOCK_HAS_TOOL_LEAK", pattern: /\b(?:read_file|list_files|plan_write|plan_update|tool call|metadata tagged)\b/i },
];

const TOOL_LEAK_PATTERN = /\b(?:read_file|list_files|plan_write|plan_update|tool call|Thoughts|List Files|Read File)\b/i;
const PATIENT_MEDICAL_PATTERN =
  /\b(?:patient|diagnos(?:is|ed)|shortness of breath|dyspnea|ambulat|walking|oxygen|therapy|medication|prognosis|impairment|limitation|duration|symptom|treatment|cardiac|pulmonary|diabetes)\b/i;

export function lintFormDraft(markdown, options = {}) {
  const form = options.form ?? "generic";
  const failedRules = [];
  const warnings = [];
  const text = String(markdown ?? "");
  const sections = parseSections(text);

  if (!hasHeadingNearTop(text, /Readiness Summary/i)) {
    failedRules.push(finding("HAS_TOP_READINESS_SUMMARY", "", "Draft must include `Readiness Summary` near the top."));
  }

  if (!hasHeadingNearBottom(text, /Final Readiness Summary/i)) {
    failedRules.push(finding("HAS_FINAL_READINESS_SUMMARY", "", "Draft must include `Final Readiness Summary` near the bottom."));
  }

  if (TOOL_LEAK_PATTERN.test(text)) {
    failedRules.push(finding("NO_TOOL_LEAKS", "", "Draft contains tool/status labels that should not appear in final form output."));
  }

  const finalSummary = findSection(sections, /Final Readiness Summary/i);
  if (finalSummary) {
    for (const bucket of FINAL_SUMMARY_BUCKETS) {
      if (!bucket.pattern.test(finalSummary.body)) {
        failedRules.push(
          finding("BOTTOM_SUMMARY_BUCKETS", finalSummary.title, `Final readiness summary must include \`${bucket.label}\`.`),
        );
      }
    }
  }

  if (form === "canada-dtc") {
    for (const required of DTC_REQUIRED_PATTERNS) {
      if (!required.pattern.test(text)) {
        failedRules.push(finding("HAS_FORM_SECTIONS", "", `DTC draft must include ${required.label}.`));
      }
    }
    for (const required of DTC_FIELD_LABEL_PATTERNS) {
      if (!required.pattern.test(text)) {
        failedRules.push(finding("HAS_EXACT_FORM_LABELS", "", `DTC draft must include a field-label-equivalent for ${required.label}.`));
      }
    }
  }

  const fieldSections = sections.filter((section) => !/Readiness Summary/i.test(section.title) && hasAnyBlock(section.body));
  if (fieldSections.length === 0) {
    failedRules.push(finding("HAS_FIELD_BLOCKS", "", "Draft must include field sections with structured form-fill blocks."));
  }

  for (const section of fieldSections) {
    lintFieldSection(section, failedRules, warnings);
  }

  return {
    failedRules,
    status: failedRules.length > 0 ? "fail" : "pass",
    warnings,
  };
}

function lintFieldSection(section, failedRules, warnings) {
  const blocks = parseBlocks(section.body);
  const copy = blocks.get("copy to form") ?? "";
  const evidence = blocks.get("evidence") ?? "";
  const review = blocks.get("review required") ?? "";
  const missing = blocks.get("missing source data") ?? "";

  if (!blocks.has("copy to form")) {
    failedRules.push(finding("HAS_FIELD_BLOCKS", section.title, "Field section must include `Copy to form`."));
  }

  if (copy.trim() && !blocks.has("evidence")) {
    failedRules.push(finding("HAS_FIELD_BLOCKS", section.title, "Nonempty copy block must include adjacent `Evidence`."));
  }

  if (copy.trim() && !review.trim() && !missing.trim()) {
    warnings.push(finding("HAS_FIELD_BLOCKS", section.title, "Consider adding `Review required` or `Missing source data`."));
  }

  for (const forbidden of COPY_BLOCK_FORBIDDEN) {
    if (forbidden.pattern.test(copy)) {
      failedRules.push(
        finding(forbidden.rule, section.title, "`Copy to form` contains content that belongs in Evidence, Review required, or Missing source data."),
      );
    }
  }

  if (copy.trim() && PATIENT_MEDICAL_PATTERN.test(copy) && !evidence.trim()) {
    failedRules.push(
      finding("EVIDENCE_PRESENT_FOR_NONEMPTY_COPY", section.title, "Patient-specific medical copy text must have adjacent evidence."),
    );
  }
}

function parseSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { body: [], level: 0, title: "__root__" };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      sections.push({ ...current, body: current.body.join("\n") });
      current = { body: [], level: heading[1].length, title: heading[2].trim() };
    } else {
      current.body.push(line);
    }
  }

  sections.push({ ...current, body: current.body.join("\n") });
  return sections.filter((section) => section.title !== "__root__" || section.body.trim());
}

function parseBlocks(sectionBody) {
  const blockPattern = /^\*\*(Copy to form|Evidence|Review required|Missing source data)\*\*\s*$/gim;
  const matches = [...sectionBody.matchAll(blockPattern)];
  const blocks = new Map();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const label = match[1].toLowerCase();
    const start = match.index + match[0].length;
    const end = next?.index ?? sectionBody.length;
    blocks.set(label, sectionBody.slice(start, end).trim());
  }

  return blocks;
}

function hasAnyBlock(sectionBody) {
  return /^\*\*(Copy to form|Evidence|Review required|Missing source data)\*\*\s*$/im.test(sectionBody);
}

function findSection(sections, pattern) {
  return sections.find((section) => pattern.test(section.title));
}

function hasHeadingNearTop(text, pattern) {
  const sections = parseSections(text);
  const index = sections.findIndex((section) => pattern.test(section.title));
  return index >= 0 && index <= 1;
}

function hasHeadingNearBottom(text, pattern) {
  const sections = parseSections(text);
  const index = sections.findIndex((section) => pattern.test(section.title));
  return index >= 0 && index >= Math.max(0, sections.length - 2);
}

function finding(rule, section, message) {
  return { message, rule, section };
}

function parseArgs(argv) {
  const options = { form: "generic", pretty: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--form") {
      options.form = argv[++index] ?? "generic";
    } else if (arg === "--pretty") {
      options.pretty = true;
    } else {
      positional.push(arg);
    }
  }
  return { ...options, file: positional[0] ?? "" };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file) {
    console.error("Usage: node scripts/lint-form-draft.mjs <draft.md> [--form canada-dtc] [--pretty]");
    process.exitCode = 2;
    return;
  }

  const markdown = readFileSync(options.file, "utf8");
  const result = lintFormDraft(markdown, options);
  process.stdout.write(`${JSON.stringify(result, null, options.pretty ? 2 : 0)}\n`);
  if (result.status !== "pass") process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
