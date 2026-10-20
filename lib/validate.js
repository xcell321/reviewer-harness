// lib/validate.js — LESSON 3: GUARDRAILS DEEP DIVE.
//
// Ang validate mao ang security guard sa harness: susihon ang master
// spec SA DILI PA i-sync. Duha ka trabaho:
//
//   1. KALIDAD — walay empty nga rules, walay duplicates, naay problem
//      statement. Ang bungi nga spec dili dapat mahimong instructions.
//   2. SECRET SCANNING — ang config ma-sync ngadto sa instruction files
//      ug kasagaran ma-commit sa Git. Kung naay API key nga nasagol sa
//      rules, ma-leak kini sa tanan. Dakpon sa dili pa mahitabo.
//
// Ang sync engine mismo motawag niini — kung naay error, dili mo-sync.

// Mga pattern sa komon nga secrets. Dili kompleto (walay scanner nga
// perpekto), pero dakpon niini ang kasagarang aksidente.
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

// Ipakita lang ang unang 4 ka karakter — ang report dili dapat mo-leak
// sa secret nga iyang nakit-an.
function redact(text) {
  return text.length <= 4 ? "••••" : text.slice(0, 4) + "••••";
}

function scanSecrets(label, text, errors) {
  if (typeof text !== "string") return;
  for (const { name, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) {
      errors.push(
        `Posibleng secret (${name}) sa ${label}: "${redact(m[0])}" — ` +
          `kuhaa kini sa config! Ma-sync kini sa tanang instruction files ug ma-leak sa Git.`
      );
    }
  }
}

export function validateConfig(config, { knownRuntimes = [] } = {}) {
  const errors = [];
  const warnings = [];

  // --- Pangalan ---
  if (!config.name || !String(config.name).trim())
    errors.push(`Walay "name" ang config — dili mailhan ang harness.`);

  // --- Problem statement ---
  if (!config.problem || !String(config.problem).trim())
    warnings.push(
      `Walay "problem" statement — ang AI makahibalo sa rules, pero dili sa ngano.`
    );

  // --- Rules: kalidad ---
  if (!Array.isArray(config.rules) || config.rules.length === 0) {
    errors.push(`Walay rules — walay guardrails ang harness kung walay rules.`);
  } else {
    const seen = new Map();
    config.rules.forEach((rule, i) => {
      const label = `rule #${i + 1}`;
      if (typeof rule !== "string" || !rule.trim()) {
        errors.push(`Ang ${label} kay empty — tangtanga o sulati.`);
        return;
      }
      const key = rule.trim().toLowerCase();
      if (seen.has(key))
        errors.push(`Ang ${label} kay duplicate sa rule #${seen.get(key) + 1}.`);
      else seen.set(key, i);
      if (rule.length > 300)
        warnings.push(`Ang ${label} kay taas kaayo (${rule.length} chars) — bahin-bahina.`);
      scanSecrets(label, rule, errors);
    });
  }

  // --- Skills: duplicates ---
  if (Array.isArray(config.skills)) {
    const seen = new Set();
    for (const s of config.skills) {
      if (seen.has(s)) errors.push(`Ang skill "${s}" naa sa config kaduha.`);
      seen.add(s);
    }
  }

  // --- Runtimes: wala mailhi ---
  if (Array.isArray(config.runtimes) && knownRuntimes.length) {
    for (const r of config.runtimes) {
      if (!knownRuntimes.includes(r))
        warnings.push(`Ang runtime "${r}" walay adapter — i-skip kini sa sync.`);
    }
  }

  // --- Secrets sa ubang fields ---
  scanSecrets("name", config.name, errors);
  scanSecrets("problem", config.problem, errors);

  return { errors, warnings, ok: errors.length === 0 };
}
