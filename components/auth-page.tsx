import Link from "next/link";
import AuthProviderButtons from "@/components/auth-provider-buttons";
import AuthBackButton from "@/components/auth-back-button";
import EmailAuthEntry from "@/components/email-auth-entry";
import Logo from "@/components/logo";

export default function AuthPage({ mode }: { mode: "login" | "get-started" }) {
  const isLogin = mode === "login";

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-black text-slate-200">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,rgba(37,99,235,0.08),transparent_58%)]" />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <AuthBackButton />
        <Logo variant="light" />
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
        <section className="w-full max-w-[440px] rounded-[28px] border border-slate-200/90 bg-white p-6 text-navy-950 shadow-[0_32px_90px_-42px_rgba(16,28,58,0.32)] ring-1 ring-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            {isLogin ? "Your account" : "Join 2-MoreTechs"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">
            {isLogin ? "Welcome back" : "Get started"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isLogin
              ? "Sign in securely to manage your account."
              : "Choose how you’d like to create your account."}
          </p>

          <AuthProviderButtons />
          <EmailAuthEntry mode={isLogin ? "login" : "register"} />

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            By continuing, you agree to our terms and privacy policy.
          </p>
          <p className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? "New to 2-MoreTechs?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/get-started" : "/login"}
              className="font-semibold text-deep-blue underline-offset-4 hover:text-navy-800 hover:underline"
            >
              {isLogin ? "Get started" : "Log in"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
