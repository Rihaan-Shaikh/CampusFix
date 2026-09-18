import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function getServerSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuthenticatedUser() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  return session.user;
}

export async function requireRole(requiredRole: UserRole) {
  const user = await requireAuthenticatedUser();
  const userRole = (user as unknown as { role?: string }).role || "MEMBER";

  if (userRole !== requiredRole) {
    throw new Error(`FORBIDDEN: Requires role ${requiredRole}, but current role is ${userRole}`);
  }

  return user;
}

export async function requireAnyRole(allowedRoles: UserRole[]) {
  const user = await requireAuthenticatedUser();
  const userRole = ((user as unknown as { role?: string }).role || "MEMBER") as UserRole;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(", ")}], but current role is ${userRole}`);
  }

  return user;
}
