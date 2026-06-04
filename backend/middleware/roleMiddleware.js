export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

    if (req.user.role === "admin" || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: "Access denied" });
  };
}
