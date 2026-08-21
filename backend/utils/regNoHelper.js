export function normalizeRegNo(value) {
  return String(value || "")
    .toUpperCase()
    .trim()
    .replace(/[\s_-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function extractRegistrationNumber(ocrText, typedRegistrationNumber = "") {
  const normalizedText = normalizeRegNo(ocrText);
  const typed = normalizeRegNo(typedRegistrationNumber);
  const candidates = [
    ...normalizedText.matchAll(/\d{12}/g),
    ...normalizedText.matchAll(/\d{10,14}/g),
  ]
    .map((match) => match[0])
    .filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];
  if (typed && uniqueCandidates.includes(typed)) return typed;
  return uniqueCandidates.find((candidate) => candidate.length === 12) || uniqueCandidates[0] || "";
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}
