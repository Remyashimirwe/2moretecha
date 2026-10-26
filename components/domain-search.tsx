"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import TldPicker from "@/components/tld-picker";
import { buildDomainQuery, validateDomainInput } from "@/lib/search-query";
import { TLD_BY_KEY } from "@/lib/tlds";
import type { SearchResponse, SearchResult } from "@/lib/domain-types";
import { formatMoney } from "@/lib/money";
import { useCart } from "./cart-context";

const STATUS_ORDER: Record<string, number> = { available: 0, unknown: 1, unsupported: 2, taken: 3 };

/** Split an incoming ?q=name.ext into picker state when we know the extension. */
function parseInitial(q: string): { value: string; tld: string | null } {
  const dot = q.lastIndexOf(".");
  if (dot > 0) {
    const ext = q.slice(dot + 1).toLowerCase();
    if (TLD_BY_KEY[ext]) return { value: q.slice(0, dot), tld: ext };
  }
  return { value: q, tld: null };
}

function StatusPill({ result }: { result: SearchResult }) {
  const title = result.rawStatus ? `Registrar status: ${result.rawStatus}` : undefined;
  switch (result.status) {
    case "available":
      return (
        <span
          title={title}
          className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden />
          Available
        </span>
      );
    case "taken":
      return (
        <span
          title={title}
          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
        >
          Registered
        </span>
      );
    case "unsupported":
      return (
        <span
          title={title}
          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
        >
          Not offered
        </span>
      );
    default:
      return (
        <span
          title={title ?? "The registry didn’t answer — please search again."}
          className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
        >
          Unknown — retry
        </span>
      );
  }
}

function ResultRow({ result }: { result: SearchResult }) {
  const { add, remove, has } = useCart();
  const available = result.status === "available";
  const price = result.price;
  const renewal = result.renewalPrice;
  const inCart = has(result.domain);

  function onToggle() {
    if (inCart) {
      remove(result.domain);
      return;
    }
    if (!available || price === undefined) return;
    add({
      domain: result.domain,
      tld: result.tld,
      years: 1,
      priceMinor: Math.round(price * 100),
      renewalMinor: Math.round((renewal ?? price) * 100),
      currency: result.currency,
      premium: result.premium,
    });
  }

  return (
    <li
      className={`flex flex-col gap-3 border-b border-slate-100 px-4 py-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
        available ? "hover:bg-brand-50" : "bg-slate-50"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`truncate text-base font-semibold ${
              available ? "text-navy-950" : "text-slate-400"
            }`}
          >
            {result.domain}
          </span>
          {result.premium && (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
              Premium
            </span>
          )}
          <StatusPill result={result} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {available && price !== undefined && (
            <span>
              Renews at{" "}
                <span className="font-medium text-slate-700">
                {formatMoney(renewal ?? price, result.currency)}
              </span>
              /yr
            </span>
          )}
          {result.trademarkClaims && available && (
            <span className="text-amber-700" title="This name is listed in the Trademark Clearinghouse.">
              Trademark matches may apply
            </span>
          )}
          {result.priceSource === "catalog" && available && (
            <span className="text-slate-400">Base price — final price confirmed at checkout</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-right">
          {available && price !== undefined ? (
            <>
              <div className="text-lg font-bold text-navy-950 tabular-nums">
                {formatMoney(price, result.currency)}
              </div>
              <div className="text-xs text-slate-400">per year</div>
            </>
          ) : (
            <div className="text-sm font-medium text-slate-300">—</div>
          )}
        </div>
        <button
          type="button"
          disabled={!available}
          onClick={onToggle}
          title={available ? (inCart ? "Remove from cart" : "Add to cart") : "Not available"}
          className={
            inCart
              ? "rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-colors hover:bg-brand-700"
              : "rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-all hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
          }
        >
          {inCart ? "Added ✓" : "Select"}
        </button>
      </div>
    </li>
  );
}

export default function DomainSearch({ showCartSummary = true }: { showCartSummary?: boolean }) {
  const { items: cartItems } = useCart();
  const pathname = usePathname();
  const dashboardRoute = pathname.startsWith("/account/");
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initial = parseInitial(initialQuery);

  const [value, setValue] = useState(initial.value);
  const [tld, setTld] = useState<string | null>(initial.tld);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchedRef = useRef<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    searchedRef.current = trimmed;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/domains/search?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as SearchResponse & { error?: string };
      if (!res.ok) {
        setData(null);
        setError(json.error ?? "The search failed. Please try again.");
      } else {
        setData(json);
      }
      // Keep the URL shareable without triggering a server round-trip.
      window.history.replaceState(null, "", `${pathname}?q=${encodeURIComponent(trimmed)}`);
    } catch {
      setData(null);
      setError("We couldn’t reach the search service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  // Auto-search when someone arrives from the homepage (?q=…)
  useEffect(() => {
    if (initialQuery && searchedRef.current !== initialQuery) {
      setValue(parseInitial(initialQuery).value);
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateDomainInput(value, tld !== null);
    const q = problem ? null : buildDomainQuery(value, tld);
    if (problem || !q) {
      setError(problem ?? "Enter a domain name to search.");
      return;
    }
    setError(null);
    void runSearch(q);
  }

  const results = [...(data?.results ?? [])].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  );
  const availableCount = results.filter((r) => r.status === "available").length;
  const selectedResults = results.filter((result) =>
    cartItems.some((item) => item.domain === result.domain),
  );

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        role="search"
        aria-label="Domain search"
        className="flex w-full flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-lg shadow-navy-950/10 sm:flex-row sm:items-center sm:rounded-full"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <label htmlFor="domain-query" className="sr-only">
            Search for a domain name
          </label>
          <span className="pl-3 text-slate-400" aria-hidden>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="domain-query"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="your business name…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error !== null}
            className={`${dashboardRoute ? "h-10 text-sm sm:text-base" : "h-12 text-base sm:text-lg"} w-full min-w-0 bg-transparent px-2 text-navy-950 outline-none placeholder:text-slate-400`}
          />
          <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
          <TldPicker value={tld} onChange={setTld} compact={dashboardRoute} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`flex ${dashboardRoute ? "h-10 px-5" : "h-12 px-7"} w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-70 sm:w-auto sm:rounded-full`}
        >
          {loading && (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4 animate-spin">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
              <path d="M18 10a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {data?.mode === "mock" && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Demo mode:</span> availability below is simulated. Add your
          ResellerClub API keys to <code className="rounded bg-amber-400/20 px-1">.env</code> to see
          live results (see <code className="rounded bg-amber-400/20 px-1">.env.example</code>).
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between border-b border-slate-100 px-6 py-5 last:border-b-0"
            >
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-8 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && data && results.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-navy-950">
                {availableCount} of {results.length}
              </span>{" "}
              {results.length === 1 ? "domain is" : "domains are"} available for{" "}
              <span className="font-semibold text-navy-950">“{data.query}”</span>
            </p>
              <p className="text-xs text-slate-400">
              Live registry check · prices per year in {results[0]?.currency ?? "USD"}
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <ul>
              {results.map((r) => (
                <ResultRow key={r.domain} result={r} />
              ))}
            </ul>
          </div>

          {showCartSummary && selectedResults.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="font-semibold text-navy-950">
                  {selectedResults.length === 1
                    ? `${selectedResults[0].domain} is in your cart`
                    : `${selectedResults.length} domains are in your cart`}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Continue to checkout when you’re ready.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={dashboardRoute ? "/account/domains/register" : "/cart"}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-slate-50"
                >
                  View cart
                </Link>
                <Link
                  href={dashboardRoute ? "/account/checkout" : "/checkout"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Continue to checkout <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          )}

          <p className="mt-4 px-1 text-xs text-slate-500">
            Registration and renewal prices are shown in advance. Add a name to your cart, then
            check out securely — your domain is registered automatically after payment.
          </p>
        </div>
      )}

      {!loading && data && results.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">No results — try a different name.</p>
      )}

    </div>
  );
}
