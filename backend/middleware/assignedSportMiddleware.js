export function requireAssignedSport(req, res, next) {
  const assignedSportId = req.user?.assignedSportId?.toString?.() || "";
  const requestedSportId = (req.params.sportId || req.body.sportId || req.query.sportId || "").toString();

  if (!assignedSportId) {
    return next();
  }

  if (!requestedSportId) {
    return next();
  }

  if (requestedSportId === assignedSportId) {
    return next();
  }

  return res.status(403).json({ message: "Access denied: you are not assigned to this sport." });
}

export function requireAssignedSportMatch(req, res, next) {
  const assignedSportId = req.user?.assignedSportId?.toString?.() || "";
  const assignedSport = req.user?.assignedSport || "";

  if (!assignedSportId && !assignedSport) {
    return next();
  }

  req.filterSportQuery = {};

  if (assignedSportId) {
    req.filterSportQuery.sportId = assignedSportId;
  }
  if (assignedSport) {
    req.filterSportQuery.sport = assignedSport;
  }

  return next();
}
