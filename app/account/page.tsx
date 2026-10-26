import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireAccountUser } from "@/lib/account";
import { formatMoney } from "@/lib/money";
import { getMode } from "@/lib/resellerclub";

export const metadata = { title: "Account overview" };
export const instant = false;

function dateLabel(value: Date | null) {
  if (!value) return "Date pending";
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Status({ value }: { value: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-green-50 text-green-700 ring-green-600/15",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-600/15",
    FAILED: "bg-red-50 text-red-700 ring-red-600/15",
    CANCELLED: "bg-slate-100 text-slate-600 ring-slate-400/15",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[value] ?? styles.CANCELLED}`}>{value.toLowerCase().replaceAll("_", " ")}</span>;
}

function Summary({ label, value, detail, href, icon }: { label: string; value: string | number; detail: string; href?: string; icon: ReactNode }) {
  const body = (
    <div className="group flex h-full min-h-36 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-colors duration-200 hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[12rem] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-deep-blue">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-navy-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
  return href ? <Link href={href} className="group block">{body}</Link> : body;
}

function AccountLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading account overview">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-11 w-40 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-white" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        <div className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-white" />
      </div>
      <div className="h-52 animate-pulse rounded-2xl border border-slate-100 bg-white" />
    </div>
  );
}

function CardHeader({ title, subtitle, href, linkLabel, icon }: { title: string; subtitle: string; href?: string; linkLabel?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-deep-blue">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold text-navy-950">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {href && linkLabel && <Link href={href} className="shrink-0 text-xs font-semibold text-deep-blue transition-colors hover:text-navy-800">{linkLabel}</Link>}
    </div>
  );
}

async function AccountOverview() {
  await io();
  const user = await requireAccountUser();
  const prisma = getPrisma();
  const now = new Date();
  const nextRenewalWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [orders, activeDomains, renewalsDue, upcomingRenewalItems, needsAction, ticketCount] = await Promise.all([
    prisma.order.findMany({
      where: { email: user.email },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
        items: { select: { domain: true, status: true } },
      },
    }),
    prisma.orderItem.count({
      where: { status: "active", order: { email: user.email, status: "PAID" } },
    }),
    prisma.orderItem.count({
      where: {
        status: "active",
        expiresAt: { gte: now, lte: nextRenewalWindow },
        order: { email: user.email, status: "PAID" },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        status: "active",
        expiresAt: { gte: now, lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
        order: { email: user.email, status: "PAID" },
      },
      orderBy: { expiresAt: "asc" },
      take: 5,
      select: { id: true, domain: true, expiresAt: true },
    }),
    prisma.order.count({
      where: {
        email: user.email,
        OR: [
          { status: "PENDING" },
          { items: { some: { status: "failed" } } },
        ],
      },
    }),
    prisma.supportTicket.count({ where: { userId: user.id, status: { not: "CLOSED" } } }),
  ]);

  const mode = getMode();
  const hasOrders = orders.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-blue">Your account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">Overview</h1>
          <p className="mt-2 text-sm text-slate-500">A clear snapshot of your domains, orders and renewals.</p>
        </div>
        <Link href="/account/domains/register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800">
          Register a domain <span aria-hidden>→</span>
        </Link>
      </section>

      {mode === "mock" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Registrar is in local demo mode. Domain statuses below reflect your saved order records; live registrar status is not connected.
        </div>
      )}

      {/* Summary cards */}
      <section aria-label="Account summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Domains in your account" value={activeDomains} detail="From paid domain orders" href="/account/domains" icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>} />
        <Summary label="Web hosting" value="—" detail="Service integration unavailable" href="/account/hosting" icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>} />
        <Summary label="Business email" value="—" detail="Service integration unavailable" href="/account/email" icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>} />
        <Summary label="Renewals in 30 days" value={renewalsDue} detail="Based on saved expiry dates" href="/account/domains?filter=renewing" icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3" /></svg>} />
      </section>

      {/* Orders + sidebar */}
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <CardHeader
            title="Recent orders"
            subtitle="Your latest account transactions"
            href="/account/orders"
            linkLabel="View all"
            icon={<svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21V3Z" /><path d="M9 8h6M9 12h6" strokeLinecap="round" /></svg>}
          />
          {hasOrders ? (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 5).map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-950">{order.items.map((item) => item.domain).join(", ") || "Domain order"}</p>
                    <p className="mt-1 text-xs text-slate-400">Order {order.id.slice(-8).toUpperCase()} · {dateLabel(order.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <Status value={order.status} />
                    <span className="text-sm font-semibold tabular-nums text-navy-950">{formatMoney(order.amount / 100, order.currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-navy-950">Your order history starts here</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">You haven&apos;t placed an order yet. Search for a domain to get started.</p>
              <Link href="/account/domains/register" className="mt-5 inline-flex text-sm font-semibold text-deep-blue hover:underline">Search domains →</Link>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* Needs attention */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-navy-950">Needs your attention</h2>
                <p className="mt-1 text-xs text-slate-400">Pending payments or registrations</p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-deep-blue">
                <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M10 2.5 18 17H2l8-14.5Z" strokeLinejoin="round" /><path d="M10 7v4m0 2.5h.01" strokeLinecap="round" /></svg>
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tabular-nums text-navy-950">{needsAction}</p>
            {needsAction > 0 ? (
              <Link href="/account/orders" className="mt-3 inline-flex text-sm font-semibold text-deep-blue hover:underline">Review orders →</Link>
            ) : (
              <p className="mt-2 text-sm text-slate-500">You&apos;re all caught up.</p>
            )}
          </section>

          {/* Quick links */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-navy-950">Quick links</h2>
            <div className="mt-4 grid gap-2">
              <Link href="/account/billing" className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50 px-4 py-3 text-sm font-medium text-navy-900 transition-colors hover:bg-slate-100">Payments &amp; billing <span aria-hidden>→</span></Link>
              <Link href="/account/support" className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50 px-4 py-3 text-sm font-medium text-navy-900 transition-colors hover:bg-slate-100">Support tickets <span className="text-xs text-slate-500">{ticketCount} open</span></Link>
            </div>
          </section>
        </div>
      </div>

      {/* Upcoming renewals */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <CardHeader
          title="Upcoming renewals"
          subtitle="Saved expiry dates for the next 90 days"
          href="/account/domains?filter=renewing"
          linkLabel="View domains"
          icon={<svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3" /></svg>}
        />
        {upcomingRenewalItems.length ? (
          <ul className="divide-y divide-slate-100">
            {upcomingRenewalItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6">
                <Link href={`/account/domains/${item.id}`} className="truncate text-sm font-semibold text-navy-950 hover:text-deep-blue">{item.domain}</Link>
                <span className="shrink-0 text-sm tabular-nums text-slate-500">{dateLabel(item.expiresAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-7 text-sm text-slate-500 sm:px-6">No saved expiry dates fall within the next 90 days.</p>
        )}
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountOverview />
    </Suspense>
  );
}
