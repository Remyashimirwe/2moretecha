"use client";

/**
 * WebNexa marketing header: logo + "Powered by 2moreTechs", five service
 * links, login and the primary CTA, with an accessible mobile menu.
 * Hovering a service link also nudges the matching element in the 3D scene.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import type { ServiceKey } from "./types";

type NavItem = { label: string; href: string; service: ServiceKey | null };

const NAV_ITEMS: NavItem[] = [
  { label: "Domains", href: "#webnexa-domains", service: "domains" },
  { label: "Hosting", href: "#webnexa-hosting", service: "hosting" },
  { label: "Website Builder", href: "#webnexa-builder", service: "builder" },
  { label: "Security", href: "#webnexa-security", service: "security" },
  { label: "Support", href: "#webnexa-support", service: null },
];

export function WebNexaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden focusable="false">
        <defs>
          <linearGradient id="webnexa-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7BBDE8" />
            <stop offset="55%" stopColor="#4E8EA2" />
            <stop offset="100%" stopColor="#0A4174" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" rx="12" fill="url(#webnexa-mark)" />
        <ellipse cx="20" cy="20" rx="13" ry="7.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="1.8" transform="rotate(-24 20 20)" />
        <circle cx="20" cy="20" r="6.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="2" />
        <circle cx="31" cy="13.5" r="3" fill="#FFFFFF" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-semibold tracking-tight text-white">
          Web<span className="text-[#7BBDE8]">Nexa</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#6EA2B3]">
            Powered by 2moreTechs
          </span>
        )}
      </span>
    </span>
  );
}

export default function SiteHeader({
  onServiceHover,
}: {
  onServiceHover: (service: ServiceKey | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // Close the mobile panel with Escape and return focus to its trigger.
  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#001D39]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.75rem] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/webnexa"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
          aria-label="WebNexa home"
        >
          <WebNexaLogo />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <ul className="flex list-none items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onMouseEnter={() => onServiceHover(item.service)}
                  onFocus={() => onServiceHover(item.service)}
                  onMouseLeave={() => onServiceHover(null)}
                  onBlur={() => onServiceHover(null)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-[#BDD8E9] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2.5 text-sm font-medium text-[#BDD8E9] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
          >
            Login
          </Link>
          <Link
            href="/get-started"
            className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#7BBDE8] to-[#49769F] px-5 py-2.5 text-sm font-semibold text-[#001D39] shadow-[0_14px_30px_-16px_rgba(123,189,232,0.9)] transition hover:from-white hover:to-[#BDD8E9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7BBDE8]/50"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls="webnexa-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 text-[#BDD8E9] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8] lg:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile navigation */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="webnexa-mobile-nav"
            ref={panelRef}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/10 bg-[#001D39]/95 lg:hidden"
          >
            <div className="mx-auto w-full max-w-7xl px-5 py-4 sm:px-8">
              <ul className="flex list-none flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-3 text-base font-medium text-[#BDD8E9] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
                >
                  Login
                </Link>
                <Link
                  href="/get-started"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-gradient-to-b from-[#7BBDE8] to-[#49769F] px-4 py-3 text-center text-sm font-semibold text-[#001D39] transition hover:from-white hover:to-[#BDD8E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
