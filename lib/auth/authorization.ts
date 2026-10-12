import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function getServerSession(reqHeaders?: Headers) {
  try {
    let h: Headers | undefined = reqHeaders;
    if (!h) {
      try {
        h = await headers();
      } catch {
        // Outside of Next.js request scope (e.g. tests or background execution)
        h = new Headers();
      }
    }
    const session = await auth.api.getSession({
      headers: h,
    });
    return session;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(reqHeaders?: Headers) {
  const session = await getServerSession(reqHeaders);
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuthenticatedUser(reqHeaders?: Headers) {
  const session = await getServerSession(reqHeaders);
  if (!session?.user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  return session.user;
}

export async function requireRole(requiredRole: UserRole, reqHeaders?: Headers) {
  const user = await requireAuthenticatedUser(reqHeaders);
  const userRole = (user as unknown as { role?: string }).role || "MEMBER";

  if (userRole !== requiredRole) {
    throw new Error(`FORBIDDEN: Requires role ${requiredRole}, but current role is ${userRole}`);
  }

  return user;
}

export async function requireAnyRole(allowedRoles: UserRole[], reqHeaders?: Headers) {
  const user = await requireAuthenticatedUser(reqHeaders);
  const userRole = ((user as unknown as { role?: string }).role || "MEMBER") as UserRole;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(", ")}], but current role is ${userRole}`);
  }

  return user;
}

// Re-export edge authorization utilities
export {
  verifyAuthorizationToken,
  signAuthorizationToken,
  AUTH_COOKIE_NAME,
  type CampusFixAuthPayload,
} from "@/lib/auth-token";
