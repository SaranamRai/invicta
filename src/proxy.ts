import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type PortalRole = "admin" | "supercoordinator" | "volunteer" | "coordinator";

interface JwtPayload {
  exp?: number;
  role?: PortalRole;
}

const AUTH_COOKIE_NAME = "sportsAuthToken";
const roleHomePath: Record<PortalRole, string> = {
  admin: "/portal/7fK2mQ",
  supercoordinator: "/portal/9xP4sL",
  volunteer: "/portal/3vN8rT",
  coordinator: "/portal/5qH6bW",
};

const protectedRoutes: Array<{ prefix: string; roles: PortalRole[] }> = [
  { prefix: "/portal/7fK2mQ", roles: ["admin"] },
  { prefix: "/portal/9xP4sL", roles: ["supercoordinator"] },
  { prefix: "/portal/3vN8rT", roles: ["volunteer"] },
  { prefix: "/portal/5qH6bW", roles: ["coordinator"] },
  { prefix: "/admin-dashboard", roles: ["admin"] },
  { prefix: "/admin", roles: ["supercoordinator"] },
  { prefix: "/volunteer", roles: ["volunteer"] },
  { prefix: "/volunteer-dashboard", roles: ["volunteer"] },
  { prefix: "/coordinator-dashboard", roles: ["coordinator"] },
  { prefix: "/register", roles: ["supercoordinator", "coordinator"] },
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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const opaqueRoute = Object.entries(roleHomePath).find(([, path]) => path === pathname);
  const session = verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (opaqueRoute) {
    const requiredRole = opaqueRoute[0] as PortalRole;
    if (!session?.role) return redirectToLogin(request);
    if (session.role !== requiredRole) {
      return NextResponse.redirect(new URL(roleHomePath[session.role], request.url));
    }
    const internalPath = requiredRole === "admin"
      ? "/admin-dashboard"
      : requiredRole === "supercoordinator"
        ? "/admin"
        : requiredRole === "volunteer"
          ? "/volunteer-dashboard"
          : "/coordinator-dashboard";
    return NextResponse.rewrite(new URL(internalPath, request.url));
  }

  if (pathname === "/login" && session?.role) {
    return NextResponse.redirect(new URL(roleHomePath[session.role], request.url));
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) {
    return NextResponse.next();
  }

  if (!session?.role) {
    return redirectToLogin(request);
  }

  if (requiredRoles.includes(session.role)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(roleHomePath[session.role], request.url));
}

export const config = {
  matcher: [
    "/login",
    "/portal/:path*",
    "/admin/:path*",
    "/admin-dashboard/:path*",
    "/volunteer/:path*",
    "/volunteer-dashboard/:path*",
    "/coordinator-dashboard/:path*",
    "/register",
  ],
};
