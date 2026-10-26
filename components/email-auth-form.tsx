"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function EmailAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function requestCode(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password }),
      });
      const result = (await response.json()) as { error?: string; message?: string; devCode?: string; codeIssued?: boolean };
      if (!response.ok) throw new Error(result.error ?? "Could not send the code. Try again.");
      if (result.codeIssued === false) {
        setError(isRegister ? "No code was created. This email may already be registered; try logging in instead." : "No code was created. Check your email and password, then try again.");
        return;
      }
      setRequested(true);
      setDevCode(result.devCode ?? null);
      if (result.devCode) setCode(result.devCode);
      setMessage(result.message ?? "If your details are correct, a code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finishSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        flow: isRegister ? "register" : "login",
        email,
        password,
        name,
        code,
        redirect: false,
        redirectTo: "/account",
      });
      if (!result || result.error) {
        setError(
          isRegister
            ? "We couldn’t create your account. Check the code and try again."
            : "Those details or the code were incorrect. Please try again.",
        );
        return;
      }
      router.push(result.url ?? "/account");
      router.refresh();
    } catch {
      setError("We couldn’t finish signing you in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-navy-950 outline-none placeholder:text-slate-400 focus:border-deep-blue/50 focus:ring-2 focus:ring-deep-blue/10";
  const primaryClass =
    "mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border border-deep-blue/10 bg-deep-blue px-4 py-3 text-sm font-semibold text-white shadow-md shadow-deep-blue/20 transition-all hover:-translate-y-0.5 hover:bg-navy-950 hover:shadow-lg hover:shadow-deep-blue/25 disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="mt-5">
      {!requested ? (
        <form onSubmit={requestCode} className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Email address
            <input
              className={inputClass}
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {!isRegister && (
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Password
              <input
                className={inputClass}
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
            </label>
          )}
          <button className={primaryClass} type="submit" disabled={busy}>
            {busy ? "Sending code…" : "Send verification code"}
          </button>
          {!isRegister && (
            <p className="text-xs leading-5 text-slate-500">
              Enter your password first. We’ll email a verification code if your details match.
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={finishSignIn} className="grid gap-3">
          <p className="text-sm leading-5 text-slate-600">
            Enter the 6-digit code sent to <span className="font-semibold text-navy-950">{email}</span>.
          </p>
          {devCode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center" role="status">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Development code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-950">{devCode}</p>
              <p className="mt-1 text-xs text-amber-800">Local development only · expires in 10 minutes</p>
            </div>
          )}
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Verification code
            <input
              className={`${inputClass} text-center text-lg tracking-[0.35em]`}
              type="text"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </label>
          {isRegister && (
            <>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                Your name <span className="font-normal text-slate-400">(optional)</span>
                <input
                  className={inputClass}
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                Create a password
                <input
                  className={inputClass}
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 10 characters"
                />
              </label>
            </>
          )}
          <button className={primaryClass} type="submit" disabled={busy}>
            {busy ? (isRegister ? "Creating account…" : "Verifying…") : isRegister ? "Create account" : "Verify and log in"}
          </button>
          <button
            type="button"
            onClick={requestCode}
            disabled={busy}
            className="py-2 text-sm font-medium text-slate-500 transition-colors hover:text-deep-blue disabled:opacity-50"
          >
            Send another code
          </button>
          <button
            type="button"
            onClick={() => { setRequested(false); setCode(""); setDevCode(null); setMessage(null); setError(null); }}
            disabled={busy}
            className="py-1 text-sm font-medium text-slate-500 transition-colors hover:text-deep-blue disabled:opacity-50"
          >
            Change email or password
          </button>
        </form>
      )}

      {message && <p role="status" className="mt-3 text-xs leading-5 text-slate-500">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs leading-5 text-red-600">{error}</p>}
    </div>
  );
}
