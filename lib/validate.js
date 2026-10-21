// lib/validate.js — LESSON 3: GUARDRAILS DEEP DIVE.
//
// Validation is the harness's security guard: it inspects the master
// spec BEFORE anything is synced. Two jobs:
//
//   1. QUALITY — no empty rules, no duplicates, a problem statement
//      must exist. A broken spec must never become instructions.
//   2. SECRET SCANNING — the config gets synced into instruction files
//      that are usually committed to Git. If an API key slips into
//      the rules, it leaks everywhere. Catch it before that happens.
//
// The sync engine itself calls this — with errors present, no sync.

// Patterns for common secrets. Not exhaustive (no scanner is perfect),
// but these catch the usual accidents.
const SECRET_PATTERNS = [
  { name: "OpenAI/Anthropic-style key", re: /sk-(ant-)?[A-Za-z0-9_-]{16,}/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "GitHub fine-grained token", re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "Generic secret assignment",
    re: /(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["']?[A-Za-z0-9_\-.]{12,}/i,
  },
];

// Show only the first 4 characters — a report must never leak the
// secret it just found.
function redact(text) {
  return text.length <= 4 ? "••••" : text.slice(0, 4) + "••••";
}

function scanSecrets(label, text, errors) {
  if (typeof text !== "string") return;
  for (const { name, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) {
      errors.push(
        `Possible secret (${name}) in ${label}: "${redact(m[0])}" — ` +
          `remove it from the config! It would be synced into every instruction file and leaked into Git.`
      );
    }
  }
}

export function validateConfig(config, { knownRuntimes = [] } = {}) {
  const errors = [];
  const warnings = [];

  // --- Name ---
  if (!config.name || !String(config.name).trim())
    errors.push(`The config has no "name" — the harness cannot be identified.`);

  // --- Problem statement ---
  if (!config.problem || !String(config.problem).trim())
    warnings.push(
      `No "problem" statement — the AI will know the rules, but not why they exist.`
    );

  // --- Rules: quality ---
  if (!Array.isArray(config.rules) || config.rules.length === 0) {
    errors.push(`No rules — a harness without rules has no guardrails.`);
  } else {
    const seen = new Map();
    config.rules.forEach((rule, i) => {
      const label = `rule #${i + 1}`;
      if (typeof rule !== "string" || !rule.trim()) {
        errors.push(`Rule #${i + 1} is empty — remove it or write it.`);
        return;
      }
      const key = rule.trim().toLowerCase();
      if (seen.has(key))
        errors.push(`Rule #${i + 1} duplicates rule #${seen.get(key) + 1}.`);
      else seen.set(key, i);
      if (rule.length > 300)
        warnings.push(`Rule #${i + 1} is very long (${rule.length} chars) — consider splitting it.`);
      scanSecrets(label, rule, errors);
    });
  }

  // --- Skills: duplicates ---
  if (Array.isArray(config.skills)) {
    const seen = new Set();
    for (const s of config.skills) {
      if (seen.has(s)) errors.push(`Skill "${s}" appears twice in the config.`);
      seen.add(s);
    }
  }

  // --- Runtimes: unknown ---
  if (Array.isArray(config.runtimes) && knownRuntimes.length) {
    for (const r of config.runtimes) {
      if (!knownRuntimes.includes(r))
        warnings.push(`Runtime "${r}" has no adapter — sync will skip it.`);
    }
  }

  // --- Secrets in other fields ---
  scanSecrets("name", config.name, errors);
  scanSecrets("problem", config.problem, errors);

  return { errors, warnings, ok: errors.length === 0 };
}
