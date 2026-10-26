import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireAccountUser } from "@/lib/account";
import DomainActionsMenu from "@/components/domain-actions-menu";

export const metadata = { title: "My domains" };

const PAGE_SIZE = 15;
const KNOWN_STATUSES = new Set(["pending", "registering", "active", "failed"]);

function dateLabel(value: Date | null) {
  return value ? value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not available";
}

function Status({ value }: { value: string }) {
  const classes: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-green-600/15",
    registering: "bg-blue-50 text-blue-700 ring-blue-600/15",
    pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
    failed: "bg-red-50 text-red-700 ring-red-600/15",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset shadow-sm shadow-black/5 ${classes[value] ?? "bg-slate-100 text-slate-600 ring-slate-300"}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {value}
    </span>
  );
}

function pageHref(page: number, q: string, status: string, filter: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (filter) params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/account/domains${suffix ? `?${suffix}` : ""}`;
}

async function AccountDomainsContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; filter?: string; page?: string }>;
}) {
  await io();
  const user = await requireAccountUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const requestedStatus = (params.status ?? "").toLowerCase();
  const status = KNOWN_STATUSES.has(requestedStatus) ? requestedStatus : "";
  const filter = params.filter === "renewing" ? "renewing" : "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const now = new Date();
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const where = {
    order: { email: user.email },
    ...(q ? { domain: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status ? { status } : {}),
    ...(filter ? { status: "active", expiresAt: { gte: now, lte: monthFromNow } } : {}),
  };
  const prisma = getPrisma();
  const [items, total] = await Promise.all([
    prisma.orderItem.findMany({
      where,
      orderBy: [{ expiresAt: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        domain: true,
        status: true,
        years: true,
        expiresAt: true,
        updatedAt: true,
        order: { select: { status: true } },
      },
    }),
    prisma.orderItem.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || status || filter);

  const cell = "px-4 py-5 transition-colors group-hover:bg-[#EDF4FF]";

  return (
    <div className="relative isolate space-y-6">
      {/* Ambient page glow (decorative only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(55%_100%_at_12%_0%,rgba(37,99,235,0.18),transparent_70%),radial-gradient(45%_100%_at_88%_0%,rgba(56,189,248,0.16),transparent_72%)] blur-[2px]"
      />

      {/* Command bar */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-3 shadow-[0_24px_56px_-42px_rgba(16,28,58,0.75)] sm:p-3.5">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search domain names</span>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search domains"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F7F9FD] pl-11 pr-4 text-sm text-navy-950 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-600/10"
            />
          </label>
          <div className="flex gap-3 sm:contents">
            <label className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
              <select
                name="status"
                defaultValue={status}
                aria-label="Filter by registration record status"
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-[#F7F9FD] px-4 pr-9 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-600/10"
              >
                <option value="">All statuses</option>
                <option value="active">Active record</option>
                <option value="registering">Registering</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 my-auto h-4 w-4 text-slate-400" fill="currentColor"><path d="m3 6 5 5 5-5" /></svg>
            </label>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-2xl bg-navy-950 px-6 text-sm font-semibold text-white shadow-[0_14px_26px_-18px_rgba(16,28,58,0.95)] transition hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/25 active:scale-[0.98]"
            >
              Search
            </button>
          </div>
          <span aria-hidden className="hidden h-8 w-px bg-slate-200 sm:block" />
          <Link
            href="/account/domains/register"
            className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-brand-600 to-brand-700 px-5 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.95)] ring-1 ring-inset ring-white/15 transition hover:from-brand-600 hover:to-brand-700 hover:shadow-[0_18px_34px_-16px_rgba(37,99,235,0.9)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 active:scale-[0.98]"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M10 4v12M4 10h12" /></svg>
            Register a domain
          </Link>
          {filter && <input type="hidden" name="filter" value={filter} />}
        </form>
      </section>

      {/* Registry table */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_30px_70px_-48px_rgba(16,28,58,0.7)]">
        {items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-gradient-to-b from-brand-50 to-brand-100/70 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th scope="col" className="border-b-2 border-brand-600/40 px-6 py-4">Domain name</th>
                    <th scope="col" className="border-b-2 border-brand-600/40 px-4 py-4">Status</th>
                    <th scope="col" className="border-b-2 border-brand-600/40 px-4 py-4">Expiration date</th>
                    <th scope="col" className="border-b-2 border-brand-600/40 px-4 py-4">Auto-renew</th>
                    <th scope="col" className="border-b-2 border-brand-600/40 px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="group animate-pop-in odd:bg-white even:bg-[#F8FAFD]"
                      style={{ animationDelay: `${Math.min(index, 14) * 0.035}s` }}
                    >
                      <td className="relative px-6 py-5 transition-colors group-hover:bg-[#EDF4FF] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:origin-top before:scale-y-0 before:bg-gradient-to-b before:from-brand-600 before:to-sky-400 before:transition-transform before:duration-300 before:ease-out before:content-[''] group-hover:before:scale-y-100">
                        <div className="flex items-center gap-3.5">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy-950 to-navy-800 text-blue-100 shadow-[0_12px_24px_-16px_rgba(16,28,58,0.95)] ring-1 ring-white/10 transition duration-300 group-hover:from-brand-700 group-hover:to-navy-900 group-hover:shadow-[0_14px_26px_-14px_rgba(37,99,235,0.75)]">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold tracking-tight text-navy-950">{item.domain}</span>
                            <span className="mt-1 block text-xs text-slate-500">{item.years} {item.years === 1 ? "year" : "years"} <span className="text-slate-300">·</span> order {item.order.status.toLowerCase()}</span>
                          </span>
                        </div>
                      </td>
                      <td className={cell}><Status value={item.status} /></td>
                      <td className={cell}>
                        <span className="block text-sm font-medium tabular-nums text-navy-950">{dateLabel(item.expiresAt)}</span>
                        <span className="mt-1 block text-xs text-slate-500">Expiry date on file</span>
                      </td>
                      <td className={cell}>
                        <span className="flex items-center gap-2.5">
                          <button
                            type="button"
                            aria-label={`Auto-renewal status unavailable for ${item.domain}`}
                            disabled
                            title="Auto-renewal is not available through the current registrar connection"
                            className="relative h-5 w-9 cursor-not-allowed rounded-full bg-slate-200/90 ring-1 ring-inset ring-slate-300/70 opacity-80"
                          >
                            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                          </button>
                          <span className="text-xs font-medium text-slate-500">Unavailable</span>
                        </span>
                      </td>
                      <td className="px-6 py-5 transition-colors group-hover:bg-[#EDF4FF]">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled
                            title="Renewal checkout is not connected yet"
                            className="h-9 cursor-not-allowed rounded-xl border border-dashed border-slate-300 bg-white px-3 text-xs font-semibold text-slate-400"
                          >
                            Renew
                          </button>
                          <Link
                            href={`/account/domains/${item.id}`}
                            className="group/btn inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-600 to-brand-700 px-3.5 text-xs font-semibold text-white shadow-[0_10px_20px_-14px_rgba(37,99,235,1)] ring-1 ring-inset ring-white/15 transition hover:shadow-[0_12px_22px_-12px_rgba(37,99,235,0.95)]"
                          >
                            Manage
                            <span aria-hidden className="transition-transform duration-300 group-hover/btn:translate-x-0.5">→</span>
                          </Link>
                          <DomainActionsMenu domain={item.domain} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-[#F7F9FD] px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="tabular-nums">{total} {total === 1 ? "domain record" : "domain records"} · Page {page} of {pageCount}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1, q, status, filter)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-navy-950 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 3-5 5 5 5" /></svg>
                    Previous
                  </Link>
                )}
                {page < pageCount && (
                  <Link
                    href={pageHref(page + 1, q, status, filter)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-navy-950 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Next
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 3 5 5-5 5" /></svg>
                  </Link>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="relative overflow-hidden px-6 py-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_0%,rgba(37,99,235,0.10),transparent_70%)]"
            />
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-navy-950 to-navy-800 text-blue-100 shadow-[0_24px_44px_-26px_rgba(16,28,58,0.9)] ring-1 ring-white/10">
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
            </div>
            <h2 className="relative mt-6 font-semibold text-navy-950">{filtered ? "No domains match those filters" : "No domain orders yet"}</h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {filtered ? "Try changing your search or filter." : "When you register a domain, its order and registration record will appear here."}
            </p>
            {!filtered && (
              <Link
                href="/account/domains/register"
                className="relative mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.95)] transition hover:shadow-[0_18px_34px_-16px_rgba(37,99,235,0.9)]"
              >
                Search domains <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2.5 rounded-2xl border border-brand-100 bg-white/70 px-4 py-3 text-xs leading-5 text-slate-500 shadow-[0_12px_30px_-26px_rgba(16,28,58,0.7)]">
        <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9.2v4.3M10 6.6h.01" />
        </svg>
        <span>
          Your status and expiration date come from saved registration records. Renewal, auto-renew, DNS editing, contact changes, sharing, and folders will become available when those domain tools are connected.
        </span>
      </p>
    </div>
  );
}

function DomainsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading domains">
      <div className="h-[4.75rem] animate-pulse rounded-3xl bg-white shadow-sm" />
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
        <div className="h-14 animate-pulse bg-slate-200" />
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-2xl bg-white/70" />
    </div>
  );
}

export default function AccountDomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; filter?: string; page?: string }>;
}) {
  return (
    <Suspense fallback={<DomainsLoading />}>
      <AccountDomainsContent searchParams={searchParams} />
    </Suspense>
  );
}
