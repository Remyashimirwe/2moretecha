"use client";

import { Suspense, useState } from "react";
import CheckoutFlow from "@/components/checkout-flow";
import DashboardDomainCart from "@/components/dashboard-domain-cart";
import DomainSearch from "@/components/domain-search";
import { useCart } from "@/components/cart-context";

function SearchLoading() {
  return <div className="h-14 animate-pulse rounded-full bg-slate-200/70" aria-label="Loading domain search" />;
}

export default function DashboardDomainWorkspace() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { count, hydrated } = useCart();
  const currentStep = checkoutOpen ? 3 : hydrated && count > 0 ? 2 : 1;
  const steps = ["Find a domain", "Review cart", "Checkout"];

  return (
    <div className="space-y-6">
      <ol aria-label="Domain registration steps" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-[0_16px_40px_-34px_rgba(16,28,58,0.8)] sm:px-5">
        {steps.map((step, index) => {
          const number = index + 1;
          const complete = number < currentStep;
          const active = number === currentStep;
          return (
            <li key={step} className={`flex items-center gap-2 text-xs font-medium sm:text-sm ${active ? "text-deep-blue" : complete ? "text-green-700" : "text-slate-400"}`} aria-current={active ? "step" : undefined}>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition-shadow ${active ? "bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-[0_10px_18px_-10px_rgba(37,99,235,1)]" : complete ? "bg-green-100 text-green-700 ring-1 ring-inset ring-green-600/15" : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200"}`}>
                {complete ? "✓" : number}
              </span>
              {step}
              {number < steps.length && <span className="ml-1 text-slate-300" aria-hidden>—</span>}
            </li>
          );
        })}
      </ol>

      {checkoutOpen ? (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-brand-50 shadow-[0_26px_60px_-46px_rgba(16,28,58,0.8)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(16,28,58,0.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(75%_80%_at_90%_0%,black,transparent_75%)]" />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="relative px-5 pt-6 sm:px-8">
            <button type="button" onClick={() => setCheckoutOpen(false)} className="text-sm font-medium text-slate-500 transition-colors hover:text-navy-950">
              ← Back to domain search
            </button>
          </div>
          <div className="relative">
            <Suspense fallback={<SearchLoading />}>
              <CheckoutFlow onBackToCart={() => setCheckoutOpen(false)} />
            </Suspense>
          </div>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="relative min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-brand-50 px-5 py-7 text-navy-950 shadow-[0_26px_60px_-46px_rgba(16,28,58,0.8)] sm:px-8 sm:py-8">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(16,28,58,0.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_80%_at_85%_5%,black,transparent_75%)]" />
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
            <div className="relative">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Find your next domain</h1>
              <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">
                Search for a name, choose an available domain, then review your cart before checkout.
              </p>
              <div className="mt-5">
                <Suspense fallback={<SearchLoading />}>
                  <DomainSearch showCartSummary={false} />
                </Suspense>
              </div>
            </div>
          </section>
          <DashboardDomainCart onCheckout={() => setCheckoutOpen(true)} />
        </div>
      )}
    </div>
  );
}
