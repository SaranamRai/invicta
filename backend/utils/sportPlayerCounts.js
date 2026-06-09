const recommendedPlayerCounts = new Map([
  ["football", 11],
  ["soccer", 11],
  ["cricket", 11],
  ["volleyball", 6],
  ["basketball", 5],
  ["badminton", 2],
  ["table tennis", 2],
  ["table-tennis", 2],
  ["chess", 1],
  ["carrom", 2],
  ["arm wrestling", 1],
  ["arm-wrestling", 1],
  ["athletics", 1],
  ["kabaddi", 7],
  ["tug of war", 8],
  ["tug-of-war", 8],
]);

function normalizeSportName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hyphenatedSportName(value) {
  return normalizeSportName(value).replace(/\s+/g, "-");
}

export function getRecommendedPlayerCount(sportName) {
  const normalized = normalizeSportName(sportName);
  return recommendedPlayerCounts.get(normalized) || recommendedPlayerCounts.get(hyphenatedSportName(normalized)) || null;
}

export function applyRecommendedPlayerCounts(payload) {
  const recommended = getRecommendedPlayerCount(payload.sportName || payload.name);
  const minPlayers = Number(payload.minPlayers || payload.playersPerTeam || recommended || 1);
  const maxPlayers = Number(payload.maxPlayers || payload.playersPerTeam || payload.minPlayers || recommended || minPlayers);

  return {
    ...payload,
    minPlayers: Math.max(1, minPlayers),
    maxPlayers: Math.max(1, maxPlayers),
  };
}

export function withPlayerCountFallback(sport) {
  const recommended = getRecommendedPlayerCount(sport.sportName || sport.name);
  if (!recommended || Number(sport.maxPlayers || 0) > 1) return sport;

  return {
    ...sport,
    minPlayers: recommended,
    maxPlayers: recommended,
  };
}
