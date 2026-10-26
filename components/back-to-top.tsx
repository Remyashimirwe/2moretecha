"use client";

export default function BackToTop() {
  function scrollToTop() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="group inline-flex w-fit items-center gap-1.5 text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-blue/60"
    >
      Back to top
      <span
        className="inline-block transition-transform duration-200 group-hover:-translate-y-1"
        aria-hidden
      >
        ↑
      </span>
    </button>
  );
}
