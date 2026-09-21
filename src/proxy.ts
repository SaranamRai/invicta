import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type PortalRole = "admin" | "supercoordinator" | "volunteer" | "coordinator";

interface JwtPayload {
  exp?: number;
  role?: PortalRole;
}

const AUTH_COOKIE_NAME = "sportsAuthToken";
const appType = process.env.NEXT_PUBLIC_APP_TYPE;
const roleHomePath: Record<PortalRole, string> = {
  admin: "/admin-dashboard",
  supercoordinator: "/admin",
  volunteer: "/volunteer-dashboard",
  coordinator: "/coordinator-dashboard",
};

const protectedRoutes: Array<{ prefix: string; roles: PortalRole[] }> = [
  { prefix: "/admin", roles: ["supercoordinator"] },
  { prefix: "/admin-dashboard", roles: ["admin"] },
  { prefix: "/volunteer", roles: ["volunteer"] },
  { prefix: "/volunteer-dashboard", roles: ["volunteer"] },
  { prefix: "/coordinator-dashboard", roles: ["coordinator"] },
  { prefix: "/register", roles: ["admin", "supercoordinator", "coordinator"] },
];

const portalOnlyRoutes = [
  "/login",
  "/admin",
  "/admin-dashboard",
  "/super-coordinator",
  "/coordinator",
  "/coordinator-dashboard",
  "/volunteer",
  "/volunteer-dashboard",
  "/profile",
];

const publicOnlyRoutes = [
  "/about",
  "/sports",
  "/fixtures",
  "/live",
  "/live-score",
  "/results",
  "/standings",
  "/announcements",
  "/rules",
  "/gallery",
  "/public-register",
  "/departments",
  "/contact",
  "/teams",
  "/matches",
  "/points-table",
  "/public-dashboard",
];

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function verifySessionToken(token?: string): JwtPayload | null {
  if (!token) return null;

  const [, encodedPayload] = token.split(".");
  if (!encodedPayload) return null;

  const payload = decodeBase64UrlJson<JwtPayload>(encodedPayload);
  if (!payload?.role) return null;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return null;

  return payload;
}

function matchesRoute(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getRequiredRoles(pathname: string) {
  return protectedRoutes.find((route) => matchesRoute(pathname, route.prefix))?.roles || null;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function notFoundResponse() {
  return new Response("This route is not available in this frontend deployment.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (appType === "public") {
    if (pathname === "/register") {
      return NextResponse.rewrite(new URL("/public-register", request.url));
    }

    if (portalOnlyRoutes.some((route) => isUnder(pathname, route))) {
      return notFoundResponse();
    }
  }

  if (appType === "portal") {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (publicOnlyRoutes.some((route) => isUnder(pathname, route))) {
      return notFoundResponse();
    }
  }

  if (pathname === "/super-coordinator") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname === "/coordinator") {
    return NextResponse.redirect(new URL("/coordinator-dashboard", request.url));
  }

  if (pathname === "/login" && session?.role) {
    return NextResponse.redirect(new URL(roleHomePath[session.role], request.url));
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) {
    return NextResponse.next();
  }

  if (!process.env.JWT_SECRET) {
    return NextResponse.next();
  }

  if (!session?.role) {
    return redirectToLogin(request);
  }

  if (requiredRoles.includes(session.role)) {
    return NextResponse.next();
  }

  return new Response("Access denied. You are not allowed to access this page.", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/admin-dashboard/:path*",
    "/super-coordinator/:path*",
    "/coordinator/:path*",
    "/volunteer/:path*",
    "/volunteer-dashboard/:path*",
    "/coordinator-dashboard/:path*",
    "/register",
    "/about/:path*",
    "/sports/:path*",
    "/fixtures/:path*",
    "/live/:path*",
    "/live-score/:path*",
    "/results/:path*",
    "/standings/:path*",
    "/announcements/:path*",
    "/rules/:path*",
    "/gallery/:path*",
    "/public-register/:path*",
    "/departments/:path*",
    "/contact/:path*",
    "/teams/:path*",
    "/matches/:path*",
    "/points-table/:path*",
    "/public-dashboard/:path*",
    "/profile/:path*",
  ],
};
