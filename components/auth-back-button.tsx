"use client";

import { useRouter } from "next/navigation";

export default function AuthBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className="inline-flex items-center gap-2 rounded-lg py-2 pr-3 text-sm font-medium text-slate-500 transition-colors hover:text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden>
        <path d="M16 10H4m0 0 5-5m-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Go back
    </button>
  );
}
