import { Suspense } from "react";
import Link from "next/link";
import DomainSearch from "@/components/domain-search";

export const metadata = {
  title: "Search Domain Names",
  description:
    "Check live domain availability across popular extensions and see transparent yearly prices — .com, .net, .org, .info, .co and more.",
};

const SUGGESTIONS = ["example.com", "mybusiness.net", "yourbrand.org", "startup.co", "kigali.ai"];

const features = [
  {
    title: "Live availability",
    body: "Every search hits the registry in real time — what you see is what’s actually free to register.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Transparent pricing",
    body: "Year-one and renewal prices are shown up front, in US dollars, before you commit.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </svg>
    ),
  },
  {
    title: "Local support",
    body: "Based in Kigali. Real people help you with registration, DNS and moving an existing domain.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21Z" strokeLinejoin="round" />
        <circle cx="12" cy="10.5" r="2.3" />
      </svg>
    ),
  },
];

export default function DomainsPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Light search panel keeps the search easy to scan on the black canvas. */}
      <section className="px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="relative mx-auto w-full max-w-6xl rounded-[2rem] border border-slate-200 bg-brand-50 px-6 py-12 shadow-sm sm:rounded-[2.5rem] sm:px-10 sm:py-16">
          <div className="relative mx-auto w-full max-w-3xl text-center">
            <h1 className="rise rise-1 text-3xl font-bold tracking-tight text-navy-950 sm:text-5xl">
              Find the perfect domain for your business.
            </h1>
            <p className="rise rise-2 mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
              Your online identity starts here. Search for your domain and bring your ideas to life.
            </p>

            <div className="rise rise-3 mt-8 text-left">
              <Suspense fallback={null}>
                <DomainSearch />
              </Suspense>
            </div>

            <div className="rise rise-4 mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="mr-1 text-slate-500">Popular:</span>
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/domains?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-3xl border border-slate-200 bg-brand-50 p-6 transition-all hover:-translate-y-1 hover:border-brand-300"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-brand-600">
              {f.icon}
            </span>
            <h2 className="mt-4 text-base font-semibold text-navy-950">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
