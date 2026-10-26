"use client";

import { useEffect, useRef, useState } from "react";
import { TLD_CATALOG } from "@/lib/tlds";
import { formatMoney } from "@/lib/money";

/**
 * Extension picker for the search bars — the popular
 * "name + .ext ▾" pattern (GoDaddy / Namecheap style).
 *
 * `value === null` means "All extensions" (search the popular set).
 */
export default function TldPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string | null;
  onChange: (tld: string | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function pick(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  const optionClass = (selected: boolean) =>
    `flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
      selected ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          value ? `Extension .${value} selected — change extension` : "All extensions selected — change extension"
        }
        className={`flex ${compact ? "h-10 px-2.5 text-xs" : "h-12 px-3.5 text-sm"} items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-navy-950 font-semibold transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30`}
      >
        <span className="max-w-[6.5rem] truncate">{value ? `.${value}` : "All ext."}</span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose an extension"
          className="liquid-panel animate-pop-in absolute right-0 top-[calc(100%+8px)] z-50 max-h-72 w-60 overflow-y-auto rounded-2xl p-1.5"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onClick={() => pick(null)}
            className={optionClass(value === null)}
          >
            <span className="font-semibold">All extensions</span>
            <span className="text-xs text-slate-400">popular set</span>
          </button>
          <div className="mx-2 my-1 h-px bg-slate-100" />
          {TLD_CATALOG.map((t) => {
            const selected = value === t.tld;
            return (
              <button
                key={t.tld}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(t.tld)}
                className={optionClass(selected)}
              >
                <span className="font-semibold">.{t.tld}</span>
                <span className="text-xs font-medium tabular-nums text-slate-400">
                  {formatMoney(t.defaultRetail)}/yr
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
