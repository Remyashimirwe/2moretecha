import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import RetryRegistrationButton from "@/components/retry-registration-button";
import { requireAccountUser } from "@/lib/account";
import { getPrisma } from "@/lib/prisma";
import { getDomainDetails, getMode } from "@/lib/resellerclub";

export const metadata = { title: "Domain details" };
export const instant = false;

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function RecordStatus({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-green-50 text-green-700 ring-green-600/20"
      : status === "failed"
        ? "bg-red-50 text-red-600 ring-red-500/20"
        : status === "registering"
          ? "bg-sky-50 text-sky-700 ring-sky-500/20"
          : "bg-amber-50 text-amber-700 ring-amber-500/25";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset backdrop-blur-sm ${tone}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function CardTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-deep-blue ring-1 ring-inset ring-white/70 shadow-sm shadow-navy-950/5">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold tracking-tight text-navy-950">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-100 py-3 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular-nums text-navy-950">{value}</dd>
    </div>
  );
}

export default async function AccountDomainDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ section?: string }> }) {
  const user = await requireAccountUser();
  const { id } = await params;
  const item = await getPrisma().orderItem.findFirst({
    where: { id, order: { email: user.email } },
    select: {
      id: true,
      domain: true,
      tld: true,
      years: true,
      amount: true,
      status: true,
      rcOrderId: true,
      registeredAt: true,
      expiresAt: true,
      lastError: true,
      order: { select: { id: true, status: true, paymentRef: true, createdAt: true, currency: true } },
    },
  });
  if (!item) notFound();
  const section = (await searchParams).section;

  let providerDetails: { status?: string; expiryDate?: string; liveExpiry?: string } | null = null;
  let providerAvailable = false;
  if (getMode() === "live" && item.rcOrderId != null) {
    try {
      providerDetails = await getDomainDetails(item.rcOrderId);
      providerAvailable = true;
    } catch {
      providerAvailable = false;
    }
  }
  const providerExpiry = providerDetails?.expiryDate ?? providerDetails?.liveExpiry;

  return (
    section === "dns" || section === "ownership" || section === "protection" ? (
    <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_56px_-42px_rgba(16,28,58,0.75)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">{item.domain}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">{section === "dns" ? "DNS / Nameservers" : section === "ownership" ? "Domain Ownership" : "Brand protection"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{section === "dns" ? "DNS records and nameserver changes are not available through the current registrar connection." : section === "ownership" ? "Domain ownership verification is not available through the current registrar connection." : "Brand protection tools are not available through the current registrar connection."}</p>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This section is ready for management tools once the registrar connection supports it.</div>
    </section>
    ) : (
    <div className="relative isolate mx-auto max-w-5xl space-y-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(50%_100%_at_20%_0%,rgba(37,99,235,0.16),transparent_70%),radial-gradient(45%_100%_at_85%_10%,rgba(56,189,248,0.14),transparent_72%)] blur-[2px]"
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-brand-50 via-white to-brand-100 px-5 py-6 text-navy-950 shadow-[0_34px_70px_-46px_rgba(16,28,58,0.95)] sm:px-8 sm:py-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(16,28,58,0.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_80%_at_80%_10%,black,transparent_75%)]" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
        <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute -bottom-10 right-6 h-52 w-52 text-navy-950/[0.07] sm:right-16" fill="none" stroke="currentColor" strokeWidth="0.9">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
          <ellipse cx="12" cy="12" rx="4.2" ry="9" />
        </svg>

        <div className="relative">
          <Link
            href="/account/domains"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-navy-950"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 3-5 5 5 5" /></svg>
            My domains
          </Link>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Domain record</p>
              <h1 className="mt-2 break-all text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">{item.domain}</h1>
              <div aria-hidden className="mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-brand-600 to-sky-400" />
            </div>
            <RecordStatus status={item.status} />
          </div>
        </div>
      </section>

      {/* Detail cards */}
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_26px_60px_-46px_rgba(16,28,58,0.8)] sm:p-6">
          <CardTitle
            icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.4 2.4 4.6-5" /></svg>}
            title="Registration"
          />
          <dl className="mt-4 text-sm">
            <Row label="Local order status" value={<span className="capitalize">{item.status}</span>} />
            <Row label="Registration date on file" value={dateLabel(item.registeredAt)} />
            <Row label="Expiry date on file" value={dateLabel(item.expiresAt)} />
            <Row label="Term" value={`${item.years} ${item.years === 1 ? "year" : "years"}`} />
          </dl>
          {item.status === "failed" && item.order.status === "PAID" && (
            <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-900">Payment was received, but the local registration attempt failed.</p>
              <div className="mt-3">
                <RetryRegistrationButton orderId={item.order.id} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_26px_60px_-46px_rgba(16,28,58,0.8)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <CardTitle
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.4 9.2 3.9 3.9 0 0 1 17 18H7Z" /><path d="M12 12v4m0 0 1.6-1.6M12 16l-1.6-1.6" /></svg>}
              title="Registrar status"
              hint="Retrieved from the provider when connected"
            />
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${providerAvailable ? "bg-green-50 text-green-700 ring-green-600/15" : "bg-slate-100 text-slate-500 ring-slate-300/60"}`}>
              {providerAvailable ? "Live lookup" : "Unavailable"}
            </span>
          </div>
          {providerAvailable ? (
            <dl className="mt-4 text-sm">
              <Row label="Provider status" value={providerDetails?.status ?? "Not returned"} />
              <Row label="Provider expiry" value={dateLabel(providerExpiry)} />
              <Row label="Auto-renewal" value={<span className="font-medium text-slate-500">Not exposed by current integration</span>} />
            </dl>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#F7F9FD] p-4 text-sm leading-6 text-slate-500 ring-1 ring-inset ring-slate-100">
              A live registrar lookup is not available for this domain right now. The date above is the saved order record, not a fresh registrar result.
            </p>
          )}
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs leading-5 text-slate-400">
            <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10" cy="10" r="7.5" /><path d="M10 9.2v4.3M10 6.6h.01" /></svg>
            <span>DNS, nameserver, WHOIS contact and renewal changes are not available through the current provider integration.</span>
          </div>
        </div>
      </section>

      {/* Order information */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_26px_60px_-46px_rgba(16,28,58,0.8)] sm:p-6">
        <CardTitle
          icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21V3Z" /><path d="M9.5 8.5h5M9.5 12h5" /></svg>}
          title="Order information"
        />
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-[#F7F9FD] p-4 transition-colors hover:border-brand-100 hover:bg-brand-50/70">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Order</dt>
            <dd className="mt-1.5 break-all font-mono text-xs font-medium text-navy-900">{item.order.id}</dd>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-[#F7F9FD] p-4 transition-colors hover:border-brand-100 hover:bg-brand-50/70">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Payment status</dt>
            <dd className="mt-1.5 font-semibold text-navy-950">{item.order.status}</dd>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-[#F7F9FD] p-4 transition-colors hover:border-brand-100 hover:bg-brand-50/70">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Payment reference</dt>
            <dd className="mt-1.5 break-all font-mono text-xs font-medium text-navy-900">{item.order.paymentRef ?? "Not available"}</dd>
          </div>
        </dl>
      </section>
    </div>
    )
  );
}
