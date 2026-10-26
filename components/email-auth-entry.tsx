"use client";

import { useState } from "react";
import EmailAuthForm from "@/components/email-auth-form";

export default function EmailAuthEntry({ mode }: { mode: "login" | "register" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <div className="relative flex items-center justify-center py-2" aria-hidden>
        <span className="absolute inset-x-0 h-px bg-deep-blue/15" />
        <span className="relative bg-white px-3 text-xs text-slate-400">or</span>
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-deep-blue/15 bg-white px-4 py-3 text-sm font-semibold text-deep-blue shadow-md shadow-deep-blue/10 transition-all hover:-translate-y-0.5 hover:border-deep-blue/30 hover:bg-brand-50 hover:shadow-lg hover:shadow-deep-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-blue/30"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden>
          <rect x="2.5" y="4" width="15" height="12" rx="2" />
          <path d="m3.5 5 6.5 5.5L16.5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? "Hide email sign-in" : "Continue with email"}
      </button>
      {open && <EmailAuthForm mode={mode} />}
    </div>
  );
}
