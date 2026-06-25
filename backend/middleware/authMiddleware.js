import jwt from "jsonwebtoken";

const AUTH_COOKIE_NAME = "sportsAuthToken";

function getCookie(req, name) {
  const rawCookie = req.headers.cookie || "";
  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = bearerToken || getCookie(req, AUTH_COOKIE_NAME);

  if (!token) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
