import Link from "next/link";
import HeroSearch from "@/components/hero-search";
import HeroCtas from "@/components/hero-ctas";
import { POPULAR_TLDS, TLD_BY_KEY } from "@/lib/tlds";
import { formatMoney } from "@/lib/money";

const steps = [
  { n: "1", title: "Search", body: "Type a name and see live availability across popular extensions." },
  { n: "2", title: "Choose", body: "Pick your extension and registration period with clear yearly pricing." },
  { n: "3", title: "Pay", body: "Create your account and pay securely — card payments and local options." },
  { n: "4", title: "Manage", body: "Your domain is registered automatically and managed from your dashboard." },
];

const services = [
  {
    name: "Domain names",
    status: "Available now",
    live: true,
    body: "Search, register and manage .com, .net, .org and dozens more extensions from one dashboard.",
    href: "/domains",
  },
  {
    name: "Professional email",
    status: "Coming soon",
    live: false,
    body: "Your own @yourbusiness.com mailboxes — webmail, mobile and desktop, with spam protection.",
  },
  {
    name: "Web hosting",
    status: "Coming soon",
    live: false,
    body: "Fast, secure hosting with SSL and one-click setup for WordPress and your own sites.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-black px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.09),transparent_68%)]" />
        <div className="relative mx-auto w-full max-w-5xl">
          <div className="text-center">
            <h1 className="rise rise-1 text-4xl font-bold leading-[1.08] tracking-tight text-navy-950 sm:text-6xl lg:text-7xl">
              Your next big idea
              <span className="block text-brand-600">deserves a great domain.</span>
            </h1>
            <p className="rise rise-2 mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Find your domain. Launch your website. Grow your business. Everything you need to
              get online, in one place.
            </p>

            <div className="rise rise-3 relative z-20 mx-auto mt-10 max-w-2xl">
              <HeroSearch />
            </div>

            <div className="rise rise-4 mt-7">
              <HeroCtas />
              <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-500">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                  className="h-4 w-4 text-brand-600"
                >
                  <path
                    d="M10 2 4 5v4.5c0 3.6 2.5 6.9 6 8 3.5-1.1 6-4.4 6-8V5l-6-3Z"
                    strokeLinejoin="round"
                  />
                  <path d="m7.5 10 1.8 1.8L13 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Your online journey starts here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing snapshot */}
      <section id="pricing" className="mx-auto my-4 w-full max-w-6xl scroll-mt-24 rounded-[2rem] bg-brand-50 px-4 py-16 text-navy-950 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Pricing
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
              Popular extensions, honest prices
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Registration and renewal pricing per year. Search for live availability.
            </p>
          </div>
          <Link
            href="/domains"
            className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100"
          >
            Search all extensions
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {POPULAR_TLDS.map((tld) => {
            const info = TLD_BY_KEY[tld];
            if (!info) return null;
            return (
              <Link
                key={tld}
                href={`/domains?q=mybusiness.${tld}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-navy-950">.{tld}</span>
                </div>
                <div className="mt-3 text-2xl font-bold text-brand-600 tabular-nums">
                  {formatMoney(info.defaultRetail)}
                  <span className="text-sm font-medium text-slate-400">/yr</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Renews at the same rate</p>
                <p className="mt-3 text-sm text-slate-600 group-hover:text-navy-950">
                  {info.tagline}
                </p>
              </Link>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Prices are indicative in USD and confirmed at checkout; some premium names cost more.
        </p>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-black">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Process
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
            How it works
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-navy-950">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="hosting" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          Services
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
          One home for your business online
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Domains are live today. Professional email and web hosting are being built on the same
          account and dashboard next.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.name}
              className={`flex flex-col rounded-3xl border p-6 ${
                s.live
                  ? "border-brand-200 bg-brand-50 ring-1 ring-brand-200"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-navy-950">{s.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                    s.live
                      ? "bg-green-100 text-green-700 ring-green-200"
                      : "bg-slate-100 text-slate-500 ring-slate-200"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
              {s.live && s.href ? (
                <Link
                  href={s.href}
                  className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900"
                >
                  Start searching
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              ) : (
                <span className="mt-5 text-sm font-medium text-slate-400">In development</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA — contained deep-navy panel, the signature surface */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-brand-50 px-6 py-14 shadow-sm sm:rounded-[2.5rem] sm:px-10">
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
              Ready to claim your name?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Search your business name now — you’ll know in seconds whether it’s free and exactly
              what it costs per year.
            </p>
            <Link
              href="/domains"
              className="rounded-full bg-brand-600 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Find your domain
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
