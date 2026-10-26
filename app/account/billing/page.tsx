import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { requireAccountUser } from "@/lib/account";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Billing & invoices" };

export default async function AccountBillingPage() {
  const user = await requireAccountUser();
  const orders = await getPrisma().order.findMany({
    where: { email: user.email },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, amount: true, currency: true, paymentRef: true, paymentProvider: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Payments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">Billing &amp; invoices</h1>
        <p className="mt-2 text-sm text-slate-500">Payments are verified server-side and shown from your order records.</p>
      </div>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        The current checkout stores payment status and transaction references, but does not generate downloadable invoices. Only verified order data is listed below.
      </div>
      <section className="overflow-hidden rounded-2xl border border-deep-blue/8 bg-white/90 shadow-sm">
        {orders.length ? (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-950">Order {order.id}</p>
                  <p className="mt-1 text-xs text-slate-400">{order.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {order.paymentProvider === "mock" ? "Local test payment" : "PayPal"}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-400">Transaction reference: {order.paymentRef ?? "Not available"}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <span className="text-xs text-slate-400 sm:hidden">Amount</span>
                  <span className="text-sm font-semibold tabular-nums text-navy-950">{formatMoney(order.amount / 100, order.currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <span className="text-xs text-slate-400 sm:hidden">Payment status</span>
                  <span className={`text-xs font-semibold ${order.status === "PAID" ? "text-green-700" : order.status === "PENDING" ? "text-amber-700" : "text-slate-500"}`}>{order.status}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-14 text-center">
            <h2 className="font-semibold text-navy-950">No payment records yet</h2>
            <p className="mt-2 text-sm text-slate-500">Completed and pending payments will appear here.</p>
            <Link href="/domains" className="mt-5 inline-flex text-sm font-semibold text-deep-blue hover:underline">Search domains →</Link>
          </div>
        )}
      </section>
    </div>
  );
}
