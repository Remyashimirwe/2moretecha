import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const CODE_LENGTH = 6;
const DEVELOPMENT_AUTH_SECRET = "2moretecha-local-development-only-secret";

function getAuthSecret() {
  return process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? DEVELOPMENT_AUTH_SECRET : null);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function validPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH
  );
}

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(Buffer.from(key));
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derivePassword(password, salt);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = storedHash.split("$");
  const validEncoding =
    algorithm === "scrypt" &&
    /^[a-f\d]{32}$/i.test(saltHex ?? "") &&
    /^[a-f\d]{128}$/i.test(hashHex ?? "");
  const salt = validEncoding ? Buffer.from(saltHex!, "hex") : Buffer.alloc(16);
  const expected = validEncoding ? Buffer.from(hashHex!, "hex") : Buffer.alloc(64);
  const actual = await derivePassword(password, salt);
  return validEncoding && timingSafeEqual(actual, expected);
}

function codeDigest(email: string, purpose: "SIGN_UP" | "SIGN_IN", code: string) {
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET must be set to protect email verification codes.");
  return createHmac("sha256", secret)
    .update(`${purpose}:${email}:${code}`)
    .digest("hex");
}

export function createEmailCode() {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
}

export async function allowAuthAttempts(
  request: Request,
  scope: string,
  maximum: number,
  windowMs: number,
): Promise<boolean> {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    forwardedFor?.split(",").at(-1)?.trim() ||
    "unknown";
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET must be set to protect authentication.");
  const key = createHmac("sha256", secret).update(`rate:${scope}:${ip}`).digest("hex");
  const prisma = getPrisma();
  const now = new Date();
  const current = await prisma.authRateLimit.findUnique({ where: { key } });

  if (current && now.getTime() - current.windowStartedAt.getTime() < windowMs) {
    if (current.attempts >= maximum) return false;
    const updated = await prisma.authRateLimit.updateMany({
      where: { key, attempts: { lt: maximum } },
      data: { attempts: { increment: 1 } },
    });
    return updated.count === 1;
  }

  await prisma.authRateLimit.upsert({
    where: { key },
    create: { key, attempts: 1, windowStartedAt: now },
    update: { attempts: 1, windowStartedAt: now },
  });
  return true;
}

export async function consumeEmailCode(
  email: string,
  purpose: "SIGN_UP" | "SIGN_IN",
  code: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const challenge = await prisma.emailCodeChallenge.findUnique({
    where: { email_purpose: { email, purpose } },
  });
  if (!challenge?.codeHash || challenge.attempts >= 5 || challenge.expiresAt <= new Date()) {
    return false;
  }

  const candidate = /^\d{6}$/.test(code)
    ? Buffer.from(codeDigest(email, purpose, code), "hex")
    : Buffer.alloc(0);
  const expected = Buffer.from(challenge.codeHash, "hex");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
    await prisma.emailCodeChallenge.updateMany({
      where: { id: challenge.id, codeHash: challenge.codeHash, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  const consumed = await prisma.emailCodeChallenge.updateMany({
    where: {
      id: challenge.id,
      codeHash: challenge.codeHash,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    data: { codeHash: null, expiresAt: new Date() },
  });
  return consumed.count === 1;
}

export async function sendEmailCode(
  email: string,
  purpose: "SIGN_UP" | "SIGN_IN",
): Promise<{ status: "sent" | "throttled"; devCode?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const isDevelopment = process.env.NODE_ENV === "development";
  if ((!apiKey || !from) && !isDevelopment) throw new Error("Resend email settings are missing.");

  const prisma = getPrisma();
  const now = new Date();
  const current = await prisma.emailCodeChallenge.findUnique({
    where: { email_purpose: { email, purpose } },
  });
  if (!isDevelopment && current?.sentAt && now.getTime() - current.sentAt.getTime() < 60_000) return { status: "throttled" };

  const withinWindow = Boolean(
    current && now.getTime() - current.windowStartedAt.getTime() < 60 * 60_000,
  );
  if (withinWindow && current && current.sentCount >= 5) return { status: "throttled" };

  const code = createEmailCode();
  const codeHash = codeDigest(email, purpose, code);
  const windowStartedAt = withinWindow && current ? current.windowStartedAt : now;
  await prisma.emailCodeChallenge.upsert({
    where: { email_purpose: { email, purpose } },
    create: {
      email,
      purpose,
      codeHash,
      expiresAt: new Date(now.getTime() + 10 * 60_000),
      sentAt: now,
      sentCount: 1,
      windowStartedAt,
    },
    update: {
      codeHash,
      expiresAt: new Date(now.getTime() + 10 * 60_000),
      attempts: 0,
      sentAt: now,
      sentCount: withinWindow ? { increment: 1 } : 1,
      windowStartedAt,
    },
  });

  if (apiKey && from) {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    try {
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: "Your 2MoreTechs verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#102a43"><p>Use this code to continue to 2MoreTechs:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
      });
      if (error) throw new Error("Resend rejected the message.");
    } catch {
      await prisma.emailCodeChallenge.updateMany({
        where: { email, purpose, codeHash },
        data: { codeHash: null, expiresAt: now },
      });
      throw new Error("Could not send the verification email.");
    }
  }
  return { status: "sent", ...(isDevelopment ? { devCode: code } : {}) };
}
