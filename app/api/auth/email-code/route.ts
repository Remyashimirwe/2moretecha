import { getPrisma } from "@/lib/prisma";
import { allowAuthAttempts, normalizeEmail, sendEmailCode, verifyPassword } from "@/lib/email-auth";

export async function POST(request: Request) {
  let body: { mode?: unknown; email?: unknown; password?: unknown };
  let failureStage = "configuration";
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const mode = body.mode;
  if (!email || (mode !== "register" && mode !== "login")) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    if ((!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM) && !isDevelopment) {
      return Response.json(
        { error: "Email sign-in is not configured yet. Please try again later." },
        { status: 503 },
      );
    }
    failureStage = "rate_limit";
    if (!(await allowAuthAttempts(request, "email-code", 12, 15 * 60_000))) {
      return Response.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }
    failureStage = "account_lookup";
    const prisma = getPrisma();
    let devCode: string | undefined;
    let devCodeIssued = false;
    if (mode === "register") {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!existing) {
        failureStage = "email_delivery";
        const result = await sendEmailCode(email, "SIGN_UP");
        devCode = result.devCode;
        devCodeIssued = result.status === "sent";
      }
    } else {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length > 128) {
        await verifyPassword(password, "invalid");
        return Response.json({ message: "If your details are correct, a code has been sent." });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      const matches = await verifyPassword(password, user?.passwordHash ?? "invalid");
      if (user && matches) {
        failureStage = "email_delivery";
        const result = await sendEmailCode(email, "SIGN_IN");
        devCode = result.devCode;
        devCodeIssued = result.status === "sent";
      }
    }
    return Response.json({
      message: isDevelopment && devCode ? "Development sign-in code generated. It expires in 10 minutes." : "If your details are correct, a code has been sent.",
      ...(isDevelopment ? { codeIssued: devCodeIssued } : {}),
      ...(devCode ? { devCode } : {}),
    });
  } catch (error) {
    // Log only the failing stage and error class; never log credentials or codes.
    console.error(`[auth/email-code] Request failed during ${failureStage}`, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      {
        error: failureStage === "email_delivery"
          ? "We couldn’t deliver the verification email. Please try again later."
          : "We can’t reach the sign-in service right now. Please try again later.",
      },
      { status: 503 },
    );
  }
}
