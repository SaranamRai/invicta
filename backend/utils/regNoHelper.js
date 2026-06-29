export function normalizeRegNo(value) {
  return String(value || "")
    .toUpperCase()
    .trim()
    .replace(/[\s_-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

function compactRegNo(value) {
  return normalizeRegNo(value).replace(/[^A-Z0-9]/g, "");
}

export function extractRegistrationNumber(ocrText, typedRegistrationNumber = "") {
  const compactText = compactRegNo(ocrText);
  const typed = compactRegNo(typedRegistrationNumber);
  if (typed && compactText.includes(typed)) return typed;

  const rawCandidates = String(ocrText || "").match(/[A-Z0-9][A-Z0-9\s_-]{4,24}[A-Z0-9]/gi) || [];
  const alphaNumericCandidates = rawCandidates
    .filter((candidate) => /\d/.test(candidate))
    .map(compactRegNo)
    .filter((candidate) => /[A-Z]/.test(candidate) && /\d/.test(candidate) && candidate.length >= 6 && candidate.length <= 20);

  const digitCandidates = [
    ...compactText.matchAll(/\d{12}/g),
    ...compactText.matchAll(/\d{10,14}/g),
  ].map((match) => match[0]);

  if (typed && /^\d+$/.test(typed) && digitCandidates.includes(typed)) return typed;

  const uniqueDigitCandidates = [...new Set(digitCandidates)].filter(Boolean);
  const uniqueAlphaNumericCandidates = [...new Set(alphaNumericCandidates)].filter(Boolean);
  if (/[A-Z]/.test(typed)) return uniqueAlphaNumericCandidates[0] || uniqueDigitCandidates[0] || "";
  return uniqueDigitCandidates.find((candidate) => candidate.length === 12)
    || uniqueDigitCandidates[0]
    || uniqueAlphaNumericCandidates[0]
    || "";
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}
