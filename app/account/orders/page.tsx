import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { formatMoney } from "@/lib/money";
import { requireAccountUser } from "@/lib/account";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Orders" };

function dateLabel(value: Date) {
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Status({ value }: { value: string }) {
  const classes: Record<string, string> = {
    PAID: "bg-green-50 text-green-700",
    PENDING: "bg-amber-50 text-amber-700",
    FAILED: "bg-red-50 text-red-700",
    CANCELLED: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes[value] ?? classes.CANCELLED}`}>{value.toLowerCase()}</span>;
}

async function AccountOrdersContent() {
  await io();
  const user = await requireAccountUser();
  const orders = await getPrisma().order.findMany({
    where: { email: user.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paymentProvider: true,
      paymentRef: true,
      createdAt: true,
      items: { select: { domain: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Account history</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">Orders</h1>
        <p className="mt-2 text-sm text-slate-500">Orders placed with {user.email}.</p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-deep-blue/8 bg-white/90 shadow-sm">
        {orders.length ? (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-950">{order.items.map((item) => item.domain).join(", ") || "Domain order"}</p>
                  <p className="mt-1 text-xs text-slate-400">Order {order.id} · {dateLabel(order.createdAt)}</p>
                  {order.paymentRef && <p className="mt-1 break-all font-mono text-[11px] text-slate-400">Payment ref: {order.paymentRef}</p>}
                  <p className="mt-1 text-xs text-slate-400">{order.paymentProvider === "mock" ? "Local test payment" : "PayPal"}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <Status value={order.status} />
                  <span className="text-sm font-semibold tabular-nums text-navy-950">{formatMoney(order.amount / 100, order.currency)}</span>
                  <Link href={`/orders/${order.id}`} className="text-sm font-semibold text-deep-blue hover:underline">Details</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-14 text-center">
            <h2 className="font-semibold text-navy-950">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-500">Your domain orders will appear here.</p>
            <Link href="/domains" className="mt-5 inline-flex text-sm font-semibold text-deep-blue hover:underline">Find a domain →</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function OrdersLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading orders">
      <div className="h-20 animate-pulse rounded-xl bg-white" />
      <div className="h-72 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}

export default function AccountOrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <AccountOrdersContent />
    </Suspense>
  );
}
