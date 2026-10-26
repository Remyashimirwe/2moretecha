"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logOut } from "@/app/account/actions";

const navigation = [
  { label: "Overview", href: "/account", icon: "overview" },
  { label: "My Domains", href: "/account/domains", icon: "domains" },
  { label: "Web Hosting", href: "/account/hosting", icon: "hosting" },
  { label: "Business Email", href: "/account/email", icon: "email" },
  { label: "SSL & Security", href: "/account/security", icon: "security" },
  { label: "Orders", href: "/account/orders", icon: "orders" },
  { label: "Billing & Invoices", href: "/account/billing", icon: "billing" },
  { label: "Support Tickets", href: "/account/support", icon: "support" },
  { label: "Account Settings", href: "/account/settings", icon: "settings" },
] as const;

const SOON_LABELS = new Set(["Web Hosting", "Business Email", "SSL & Security"]);

function NavIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  const common = "h-[18px] w-[18px] shrink-0";
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    domains: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    hosting: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    security: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    orders: <><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    billing: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    support: <><path d="M4 18v-6a8 8 0 0 1 16 0v6" /><path d="M4 17h3v4H6a2 2 0 0 1-2-2v-2ZM20 17h-3v4h1a2 2 0 0 0 2-2v-2ZM8 21h8" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.08)" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={common} aria-hidden>
      {paths[name]}
    </svg>
  );
}

function DomainSectionIcon({ name }: { name: "grid" | "dns" | "person" | "shield" }) {
  const cls = "h-5 w-5 shrink-0";
  if (name === "dns") {
    return (
      <span className={`${cls} grid place-items-center rounded-full bg-brand-50 text-[7px] font-bold uppercase tracking-tight text-brand-700`} aria-hidden>
        DNS
      </span>
    );
  }
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.5-3.5 4-5 7.5-5s6 1.5 7.5 5" /></>,
    shield: <><path d="M12 22s7.5-3.5 7.5-10.5V5.5L12 2.5 4.5 5.5v6C4.5 18.5 12 22 12 22Z" /><circle cx="12" cy="10" r="2.2" /><path d="M8.5 16.2c.8-1.5 2-2.2 3.5-2.2s2.7.7 3.5 2.2" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
      {paths[name]}
    </svg>
  );
}

/* Shared navigation states for the bright, white dashboard rail. */
function railSurface(active: boolean) {
  return active
    ? "bg-brand-50 font-semibold text-brand-700"
    : "text-slate-300 hover:bg-white/10 hover:text-white";
}

function SoonBadge() {
  return (
    <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-inset ring-slate-200">
      Soon
    </span>
  );
}

function SideLink({
  href,
  icon,
  label,
  active,
  soon,
  onClick,
}: {
  href: string;
  icon: (typeof navigation)[number]["icon"];
  label: string;
  active: boolean;
  soon?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ${railSurface(active)}`}
    >
      <NavIcon name={icon} />
      <span className="truncate">{label}</span>
      {soon ? <SoonBadge /> : null}
    </Link>
  );
}

function pageTitle(pathname: string) {
  const exact = navigation.find((item) => item.href === pathname);
  if (exact) return exact.label;
  if (pathname === "/account/domains/register") return "Register a domain";
  if (pathname === "/account/checkout") return "Checkout";
  if (pathname.startsWith("/account/domains/")) return "Domain details";
  return "Your account";
}

export function DashboardShell({
  children,
  user,
  renewalCount,
  managedDomains,
}: {
  children: ReactNode;
  user: { name: string; email: string };
  renewalCount: number;
  managedDomains: { id: string; domain: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(pathname.startsWith("/account/domains"));
  const [contactOpen, setContactOpen] = useState(pathname === "/account/settings");
  const activeTitle = pageTitle(pathname);
  const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const mobileItems = navigation.filter((item) => ["Overview", "My Domains", "Orders", "Support Tickets"].includes(item.label));
  const activeMobileItem = mobileItems.some((item) => item.href === "/account"
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const domainsActive = pathname.startsWith("/account/domains");
  const domainWorkspace = /^\/account\/domains\/[^/]+$/.test(pathname);

  return (
    <div className="min-h-screen bg-black text-slate-300 lg:flex">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-navy-950/35 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${mobileOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} ${domainWorkspace ? "w-[88px] items-center px-2" : "w-72 px-4"} shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-black py-5 text-slate-700 shadow-[8px_0_28px_-28px_rgba(15,23,42,0.28)] lg:sticky lg:top-0 lg:flex lg:h-screen`}
      >

        {domainWorkspace ? <>
          <Link href="/account" aria-label="2MoreTechs home" className="relative mb-5 rounded-xl ring-1 ring-inset ring-slate-200" onClick={() => setMobileOpen(false)}>
            <Image src="/logo.png" alt="" width={42} height={42} className="h-10 w-10 rounded-xl object-cover" />
          </Link>
          <nav aria-label="Main navigation" className="relative flex-1 space-y-2 overflow-y-auto">
            {[
              { label: "Home", href: "/account", icon: "overview" as const },
              { label: "Domains", href: "/account/domains", icon: "domains" as const },
              { label: "Web hosting", href: "/account/hosting", icon: "hosting" as const },
              { label: "Email", href: "/account/email", icon: "email" as const },
              { label: "Security", href: "/account/security", icon: "security" as const },
              { label: "Orders", href: "/account/orders", icon: "orders" as const },
              { label: "Support", href: "/account/support", icon: "support" as const },
            ].map((item) => {
              const active = item.href === "/account" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return <Link key={item.href} href={item.href} title={item.label} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)} className={`relative flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] font-medium text-center transition ${active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-white/10 hover:text-white"}`}><NavIcon name={item.icon} /><span className="leading-tight">{item.label}</span></Link>;
            })}
          </nav>
        </> : <>
        <Link href="/account" className="relative mb-8 flex items-center gap-3 px-3" onClick={() => setMobileOpen(false)}>
          <span className="rounded-xl ring-1 ring-inset ring-slate-200">
            <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-navy-950">2<span className="text-brand-600">More</span>Techs</span>
        </Link>

        <div className="relative mb-3 flex items-center gap-3 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <span aria-hidden className="h-px flex-1 bg-slate-200" />
        </div>

        <nav
          aria-label="Account navigation"
          className="relative flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {navigation.filter((item) => item.label === "Overview").map((item) => {
            const active = pathname === item.href;
            return (
              <SideLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={active}
                soon={SOON_LABELS.has(item.label)}
                onClick={() => setMobileOpen(false)}
              />
            );
          })}

          <div>
            <button
              type="button"
              aria-expanded={domainsOpen}
              onClick={() => setDomainsOpen((open) => !open)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ${railSurface(domainsActive)}`}
            >
              <NavIcon name="domains" />
              <span>Domains</span>
              <svg
                viewBox="0 0 16 16"
                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-300 ${domainsOpen ? "rotate-180" : ""} ${domainsActive ? "text-brand-600" : "text-slate-400 group-hover:text-navy-950"}`}
                fill="currentColor"
                aria-hidden
              >
                <path d="m3 6 5 5 5-5" />
              </svg>
            </button>
            {domainsOpen && (
              <ul className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
                {[
                  { label: "My Domains", href: "/account/domains" },
                  { label: "Search Domains", href: "/account/domains/register" },
                ].map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`relative block rounded-lg px-3 py-2 text-[13px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
                          active
                            ? "bg-brand-50 font-semibold text-brand-700"
                            : "text-slate-500 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {active && <span aria-hidden className="absolute -left-[15px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500" />}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                {["Transfers", "DNS"].map((label) => (
                  <li key={label} className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] text-slate-400">
                    <span>{label}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-inset ring-slate-200">
                      Soon
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {navigation.filter((item) => !["Overview", "My Domains", "Account Settings"].includes(item.label)).map((item) => {
            const active = item.href === "/account"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SideLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={active}
                soon={SOON_LABELS.has(item.label)}
                onClick={() => setMobileOpen(false)}
              />
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              aria-expanded={contactOpen}
              onClick={() => setContactOpen((open) => !open)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ${railSurface(pathname === "/account/settings")}`}
            >
              <NavIcon name="settings" />
              <span>Contact &amp; profile</span>
              <svg
                viewBox="0 0 16 16"
                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-300 ${contactOpen ? "rotate-180" : ""} ${pathname === "/account/settings" ? "text-brand-600" : "text-slate-400 group-hover:text-navy-950"}`}
                fill="currentColor"
                aria-hidden
              >
                <path d="m3 6 5 5 5-5" />
              </svg>
            </button>
            {contactOpen && (
              <ul className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
                <li>
                  <Link
                    href="/account/settings"
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === "/account/settings" ? "page" : undefined}
                    className={`relative block rounded-lg px-3 py-2 text-[13px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
                      pathname === "/account/settings"
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-slate-500 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {pathname === "/account/settings" && <span aria-hidden className="absolute -left-[15px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500" />}
                    Contact profile &amp; settings
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </nav>
        </>}
      </aside>

      {domainWorkspace && <aside className="hidden w-[330px] shrink-0 border-r border-slate-200 bg-black px-4 py-5 text-slate-900 lg:sticky lg:top-0 lg:block lg:h-screen">
        <label htmlFor="sidebar-domain-picker" className="block px-1 text-sm font-semibold">Select domain</label>
        <select id="sidebar-domain-picker" value={pathname.split("/").at(-1)} onChange={(event) => { router.push(`/account/domains/${event.target.value}`); }} className="mt-2 h-[52px] w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-600/10">
          {managedDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.domain}</option>)}
        </select>
        <nav aria-label="Domain management sections" className="mt-3 space-y-1">
          {[
            { label: "Domain Overview", section: "overview", icon: "grid" as const },
            { label: "DNS / Nameservers", section: "dns", icon: "dns" as const },
            { label: "Domain Ownership", section: "ownership", icon: "person" as const },
            { label: "Brand protection", section: "protection", icon: "shield" as const },
          ].map((item) => {
            const active = (searchParams.get("section") ?? "overview") === item.section;
            return <Link key={item.section} href={`${pathname}${item.section === "overview" ? "" : `?section=${item.section}`}`} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${active ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><DomainSectionIcon name={item.icon} />{item.label}</Link>;
          })}
        </nav>
      </aside>}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-black/85 backdrop-blur-xl">
          <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center gap-3 px-4 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-950">{activeTitle}</p>
              <p className="hidden text-xs text-slate-400 sm:block">2-MoreTechs / Client portal</p>
            </div>
            <form action="/account/domains" method="get" className="hidden max-w-xs flex-1 md:block">
              <label className="sr-only" htmlFor="dashboard-search">Search domains</label>
              <div className="flex items-center gap-2 rounded-xl border border-deep-blue/10 bg-[#F3F6FB] px-3">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" strokeLinecap="round" /></svg>
                <input id="dashboard-search" name="q" placeholder="Search your domains" className="h-10 w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
              </div>
            </form>
            <Link href="/account/support" aria-label="Get help" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-deep-blue/5 hover:text-deep-blue">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.2 1.1-1.9 1.4-1.9 3M12 17.2h.01" strokeLinecap="round" /></svg>
            </Link>
            <Link href="/account/domains?filter=renewing" aria-label={`${renewalCount} upcoming renewals`} className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-deep-blue/5 hover:text-deep-blue">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {renewalCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{renewalCount > 9 ? "9+" : renewalCount}</span>}
            </Link>
            <div className="relative">
              <button type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex h-10 items-center gap-2 rounded-xl border border-deep-blue/10 bg-white px-2.5 text-left hover:bg-brand-50">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-deep-blue text-[10px] font-semibold text-white">{initials || "2M"}</span>
                <span className="hidden max-w-28 truncate text-xs font-medium text-slate-700 sm:block">{user.name}</span>
                <svg viewBox="0 0 16 16" className="hidden h-3.5 w-3.5 text-slate-400 sm:block" fill="currentColor" aria-hidden><path d="m4 6 4 4 4-4" /></svg>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-deep-blue/10 bg-white p-2 shadow-xl shadow-navy-950/10">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-navy-950">{user.name}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
                  <Link href="/account/settings" onClick={() => setProfileOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-brand-50 hover:text-deep-blue">Account settings</Link>
                  <form action={logOut}>
                    <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-red-50 hover:text-red-700">Log out</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-6 sm:px-7 sm:py-9 lg:pb-9">{children}</main>
      </div>

      <nav aria-label="Mobile dashboard navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-black/90 px-2 pt-2 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {mobileItems.map((item) => {
            const active = item.href === "/account"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors ${active ? "text-deep-blue" : "text-slate-400 hover:text-slate-700"}`}>
                  <NavIcon name={item.icon} />
                  <span className="truncate">{item.label === "My Domains" ? "Domains" : item.label === "Support Tickets" ? "Support" : item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" aria-expanded={mobileOpen} aria-current={!activeMobileItem ? "page" : undefined} onClick={() => setMobileOpen(true)} className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors ${!activeMobileItem ? "text-deep-blue" : "text-slate-400 hover:text-slate-700"}`}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
