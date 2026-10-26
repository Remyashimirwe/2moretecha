import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import {
  allowAuthAttempts,
  consumeEmailCode,
  hashPassword,
  normalizeEmail,
  validPassword,
  verifyPassword,
} from "@/lib/email-auth";
import { getPrisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getPrisma()),
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "2moretecha-local-development-only-secret" : undefined),
  providers: [
    GitHub,
    Google,
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        flow: { label: "Flow", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Verification code", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials, request) {
        if (!(await allowAuthAttempts(request, "credentials", 20, 15 * 60_000))) return null;
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password;
        const code = credentials?.code;
        if (!email || typeof password !== "string" || typeof code !== "string") return null;

        const prisma = getPrisma();
        const flow = credentials?.flow;
        if (flow === "register") {
          const rawName = credentials?.name;
          const name = typeof rawName === "string" ? rawName.trim() : "";
          if (!validPassword(password) || name.length > 100) return null;
          if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return null;

          if (!(await consumeEmailCode(email, "SIGN_UP", code))) return null;
          const passwordHash = await hashPassword(password);
          try {
            const user = await prisma.user.create({
              data: { email, name: name || null, passwordHash },
              select: { id: true, email: true, name: true },
            });
            return user;
          } catch {
            return null;
          }
        }

        if (flow !== "login" || password.length > 128) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        const passwordMatches = await verifyPassword(password, user?.passwordHash ?? "invalid");
        if (!user || !passwordMatches) return null;
        if (!(await consumeEmailCode(email, "SIGN_IN", code))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
}));
