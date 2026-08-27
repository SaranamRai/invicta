export const MATCH_CATEGORIES = ["Male", "Female", "Mixed"];

export function normalizeMatchCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return MATCH_CATEGORIES.find((category) => category.toLowerCase() === normalized) || "";
}

export function supportedMatchCategories(sport) {
  const configured = Array.isArray(sport?.categories)
    ? sport.categories.filter((category) => MATCH_CATEGORIES.includes(category))
    : [];
  return configured.length ? configured : ["Male", "Female"];
}

export function assertSupportedMatchCategory(value, sport) {
  const category = normalizeMatchCategory(value);
  if (!category) throw new Error("Match category must be Male, Female, or Mixed");
  if (!supportedMatchCategories(sport).includes(category)) throw new Error(`${category} is not enabled for this sport`);
  return category;
}
