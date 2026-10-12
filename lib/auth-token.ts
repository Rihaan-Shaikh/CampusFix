import { SignJWT, jwtVerify } from "jose";

export type UserRole = "ADMIN" | "MEMBER" | "GUEST";

export interface CampusFixAuthPayload {
  sub: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
  jti: string;
}

export const AUTH_COOKIE_NAME = "campusfix_authorization";
export const AUTH_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.CAMPUSFIX_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CAMPUSFIX_JWT_SECRET environment variable is required in production");
    }
    return new TextEncoder().encode("campusfix_dev_fallback_secret_key_32bytes_min");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a short-lived authorization JWT for fast edge routing and RBAC checks.
 * Source of truth remains Better Auth session; this token serves as an edge-verifiable authorization cache.
 */
export async function signAuthorizationToken(payload: {
  userId: string;
  role: string;
  email: string;
}): Promise<string> {
  const validRole: UserRole =
    payload.role === "ADMIN" ? "ADMIN" : payload.role === "GUEST" ? "GUEST" : "MEMBER";

  const secretKey = getJwtSecretKey();
  const jti =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);

  return new SignJWT({
    sub: payload.userId,
    role: validRole,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setJti(jti)
    .sign(secretKey);
}

/**
 * Verifies the authorization JWT signature, validity, expiration, and payload claims using Web Crypto.
 * Returns null if token is expired, tampered, or invalid.
 */
export async function verifyAuthorizationToken(
  token: string
): Promise<CampusFixAuthPayload | null> {
  if (!token) return null;

  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    const role: UserRole =
      payload.role === "ADMIN" ? "ADMIN" : payload.role === "GUEST" ? "GUEST" : "MEMBER";

    return {
      sub: payload.sub,
      role,
      email: payload.email,
      iat: typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000),
      exp: typeof payload.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + AUTH_TOKEN_EXPIRY_SECONDS,
      jti: typeof payload.jti === "string" ? payload.jti : "",
    };
  } catch {
    return null;
  }
}

/**
 * Standard cookie attributes for the HttpOnly authorization token cookie.
 */
export function getAuthCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_TOKEN_EXPIRY_SECONDS,
  };
}

export function serializeAuthCookie(
  token: string,
  isProduction = process.env.NODE_ENV === "production"
): string {
  const secureFlag = isProduction ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${AUTH_TOKEN_EXPIRY_SECONDS}; HttpOnly; SameSite=Lax${secureFlag}`;
}

export function serializeClearAuthCookie(
  isProduction = process.env.NODE_ENV === "production"
): string {
  const secureFlag = isProduction ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureFlag}`;
}
