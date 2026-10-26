"use client";

import Link from "next/link";

/**
 * Hero calls to action.
 *  - "Search Domains" scrolls to and focuses the hero search input.
 *  - "Explore Hosting" jumps to the real hosting section on this page.
 */
export default function HeroCtas() {
  function focusSearch() {
    const el = document.getElementById("hero-domain-input");
    if (el instanceof HTMLInputElement) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={focusSearch}
        className="rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-900/15 transition-all hover:bg-brand-700 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        Search Domains
      </button>
      <Link
        href="/#hosting"
        className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
      >
        Explore Hosting
      </Link>
    </div>
  );
}
