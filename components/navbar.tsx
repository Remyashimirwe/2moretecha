"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CartLink from "./cart-link";
import Logo from "./logo";

/**
 * Full-width, editorial navigation.
 *
 * Menu items only become links when the platform actually supports them
 * (/domains and the homepage pricing section). Everything still in
 * development renders as a non-interactive row with a "Soon" badge —
 * no fake routes.
 */
type MenuItem = { label: string; href?: string; desc?: string; soon?: boolean };
type Menu = { label: string; items: MenuItem[] };

const MENUS: Menu[] = [
  {
    label: "Domains",
    items: [
      {
        label: "Search Domains",
        href: "/domains",
        desc: "Live availability and yearly pricing",
      },
      {
        label: "Domain Extensions",
        href: "/#pricing",
        desc: "The extensions we support today",
      },
      {
        label: "Domain Pricing",
        href: "/#pricing",
        desc: "Registration and renewal prices, upfront",
      },
      { label: "Transfer a Domain", soon: true },
    ],
  },
  {
    label: "Web Hosting",
    items: [
      { label: "Shared Hosting", soon: true },
      { label: "WordPress Hosting", soon: true },
      { label: "Hosting Plans", soon: true },
    ],
  },
  {
    label: "Business Email",
    items: [
      { label: "Professional Email", soon: true },
      { label: "Email Plans", soon: true },
    ],
  },
  {
    label: "SSL & Security",
    items: [
      { label: "SSL Certificates", soon: true },
      { label: "Website Security", soon: true },
    ],
  },
];

function SoonBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-200">
      Soon
    </span>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`ml-1 h-3.5 w-3.5 transition-transform duration-300 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const triggerBase =
  "flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30";

export default function Navbar() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click / Escape.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Close menus on navigation; keep header state consistent across pages.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  const isActive = (href: string) =>
    href === "/domains"
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  const menuItemRow = (item: MenuItem) =>
    item.href ? (
      <Link
        key={item.label}
        href={item.href}
        onClick={() => setOpenMenu(null)}
        className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
      >
        <span className="text-sm font-semibold text-navy-950">{item.label}</span>
        {item.desc && (
          <span className="mt-0.5 block text-xs text-slate-500">{item.desc}</span>
        )}
      </Link>
    ) : (
      <span
        key={item.label}
        className="block cursor-not-allowed rounded-xl px-3 py-2.5"
        title="Coming soon"
      >
        <span className="text-sm font-semibold text-slate-400">
          {item.label}
          <SoonBadge />
        </span>
      </span>
    );

  return (
    <header className="animate-nav-drop sticky top-0 z-50 border-b border-slate-200 bg-black/85 px-4 backdrop-blur-md sm:px-6">
      <div
        ref={navRef}
        className="relative mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-4"
      >
        <Logo variant="light" />

        {/* ── Desktop navigation ──────────────────────────────── */}
        <ul
          aria-label="Main"
          onMouseLeave={() => setOpenMenu(null)}
          className="stagger hidden list-none items-center gap-1 lg:flex"
        >
          {MENUS.map((menu) => {
            const isOpen = openMenu === menu.label;
            return (
              <li key={menu.label} className="relative z-10">
                <button
                  type="button"
                  data-active={menu.items.some((i) => i.href && isActive(i.href))}
                  aria-expanded={isOpen}
                  onClick={() => setOpenMenu(isOpen ? null : menu.label)}
                  onMouseEnter={() => setOpenMenu(menu.label)}
                  className={`${triggerBase} ${
                    isOpen ||
                    menu.items.some((i) => i.href && isActive(i.href))
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {menu.label}
                  <ChevronDown open={isOpen} />
                </button>

                {isOpen && (
                  <div
                    onMouseEnter={() => setOpenMenu(menu.label)}
                    onMouseLeave={() => setOpenMenu(null)}
                    className="animate-menu-in absolute left-0 top-full z-30 w-80 pt-3"
                  >
                    <ul className="liquid-panel space-y-1 rounded-2xl p-2">
                      {menu.items.map(menuItemRow)}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* ── Right: cart + account actions ───────────────────── */}
        <div className="flex items-center gap-2">
          <CartLink />

          <Link
            href="/login"
            className="hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 sm:inline-flex"
          >
            Log in
          </Link>

          <Link
            href="/get-started"
            className="group hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-900/15 transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:inline-flex"
          >
            Get Started
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 lg:hidden"
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                  mobileOpen ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                  mobileOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                  mobileOpen ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>

        {/* ── Mobile glass sheet ──────────────────────────────── */}
        {mobileOpen && (
          <div className="animate-menu-in absolute inset-x-0 top-full mt-2 lg:hidden">
            <div className="liquid-panel max-h-[calc(100vh-6rem)] overflow-y-auto px-3 pb-4 pt-3 rounded-[22px]">
              {MENUS.map((menu) => (
                <div key={menu.label} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {menu.label}
                  </p>
                  <ul>{menu.items.map(menuItemRow)}</ul>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-slate-200 px-2 pt-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy-950"
                >
                  Log in
                </Link>
                <Link
                  href="/get-started"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-black/20 transition-all hover:bg-brand-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
