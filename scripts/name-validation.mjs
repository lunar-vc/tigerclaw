// name-validation.mjs — Validates that a string looks like a real person name.
// Used by parallel-scan.js to filter junk/anonymous entries from scan results.

const JUNK_PATTERNS = [
  /^anonymous$/i,
  /^unknown$/i,
  /^n\/?a$/i,
  /^none$/i,
  /^null$/i,
  /^undefined$/i,
  /^admin$/i,
  /^user$/i,
  /^test$/i,
  /^root$/i,
  /^guest$/i,
  /^bot$/i,
  /^system$/i,
  /^\d+$/,                  // pure numbers
  /^[^a-zA-Z]*$/,           // no letters at all
  /^.{0,1}$/,               // single char or empty
  /^https?:\/\//i,           // URLs
  /^[a-zA-Z0-9._%+-]+@/,    // email addresses
  /^@/,                      // social handles
];

/**
 * Returns true if the string looks like a plausible person name.
 * Rejects obvious junk: URLs, emails, handles, single words under 2 chars,
 * pure numbers, and common placeholder strings.
 */
export function isLikelyPersonName(name) {
  if (!name || typeof name !== 'string') return false;

  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.length > 100) return false;

  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  // Heuristic: real names usually have at least 2 "word" tokens
  // (first + last), but allow single-word names (mononyms)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 1) return false;

  // If it's a single word, it should be at least 2 chars and look name-like
  if (words.length === 1) {
    // Single words that are ALL CAPS and short are likely acronyms, not names
    if (/^[A-Z]{2,5}$/.test(trimmed)) return false;
  }

  return true;
}
