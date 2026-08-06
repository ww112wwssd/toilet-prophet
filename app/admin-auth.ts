import { cookies } from "next/headers";

const COOKIE_NAME = "tp_admin_session";
const SESSION_MESSAGE = "toilet-prophet-admin-session-v1";

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

export function isAdminSessionConfigured(): boolean {
  return adminPassword().length >= 10;
}

async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_MESSAGE),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(await sessionToken(candidate), await sessionToken(expected));
}

export async function hasValidAdminSession(): Promise<boolean> {
  const expected = adminPassword();
  if (!expected) return false;
  const cookieStore = await cookies();
  const current = cookieStore.get(COOKIE_NAME)?.value ?? "";
  return safeEqual(current, await sessionToken(expected));
}

export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await sessionToken(adminPassword()), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
