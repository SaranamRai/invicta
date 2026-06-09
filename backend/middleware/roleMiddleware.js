export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

    // Only allow explicitly listed roles. Admin is no longer an automatic super-role.
    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: "Access denied" });
  };
}
