import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "nail_admin_session";

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type AdminSessionPayload = {
  exp: number;
};

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminAuthConfig() {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET?.trim() ?? password;

  return {
    password,
    sessionSecret,
  };
}

function signSessionPayload(payload: string, sessionSecret: string) {
  return createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

export function hasAdminPasswordConfig() {
  const { password, sessionSecret } = getAdminAuthConfig();
  return Boolean(password && sessionSecret);
}

export function verifyAdminPassword(candidate: string) {
  const { password } = getAdminAuthConfig();

  if (!password) {
    return false;
  }

  return safeCompare(candidate.trim(), password);
}

export function createAdminSessionToken() {
  const { sessionSecret } = getAdminAuthConfig();

  if (!sessionSecret) {
    throw new Error("Не найден ADMIN_SESSION_SECRET или ADMIN_PASSWORD.");
  }

  const payload: AdminSessionPayload = {
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signSessionPayload(encodedPayload, sessionSecret);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const { sessionSecret } = getAdminAuthConfig();

  if (!sessionSecret) {
    return false;
  }

  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = signSessionPayload(encodedPayload, sessionSecret);

  if (!safeCompare(providedSignature, expectedSignature)) {
    return false;
  }

  try {
    const parsedPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AdminSessionPayload;

    return parsedPayload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSessionToken(token);
}
