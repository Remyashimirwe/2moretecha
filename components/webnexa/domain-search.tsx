"use client";

/**
 * WebNexa hero domain search.
 *
 * Talks to the existing server-side search API (GET /api/domains/search →
 * ResellerClub when credentials are configured, clearly-labelled demo mode
 * otherwise). Availability, prices and renewal prices are only ever rendered
 * from the API response — nothing here invents a result. Alternatives are
 * suggested only after their own real availability check comes back.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowRight, Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { TLD_CATALOG } from "@/lib/tlds";
import { buildDomainQuery, validateDomainInput } from "@/lib/search-query";
import { formatMoney } from "@/lib/money";
import { useCart } from "@/components/cart-context";
import type { SearchResponse, SearchResult } from "@/lib/domain-types";
import type { SceneState } from "./types";

type Phase = SceneState["phase"];

type PriceQuote = {
  tld: string;
  price: number;
  renewalPrice: number;
  currency: string;
  source: "resellerclub" | "catalog";
};

type Props = {
  /** Partial scene-state updates (query, focus, phase, results) */
  onChange: (patch: Partial<SceneState>) => void;
};

const MAX_ALTERNATIVES = 3;

export default function DomainSearch({ onChange }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [tld, setTld] = useState("com");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [alternatives, setAlternatives] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [prices, setPrices] = useState<PriceQuote[]>([]);

  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { add, has } = useCart();

  /**
   * Cart lines are display-only — the server re-checks availability and
   * re-prices everything at checkout, so a stale browser price can never
   * become a paid price.
   */
  function addResult(result: SearchResult) {
    if (result.price === undefined) return;
    const renewal = result.renewalPrice ?? result.price;
    add({
      domain: result.domain,
      tld: result.tld,
      years: 1,
      priceMinor: Math.round(result.price * 100),
      renewalMinor: Math.round(renewal * 100),
      currency: result.currency,
      premium: result.premium,
    });
    router.push("/cart");
  }

  // Server-quoted extension prices. Rendered only if the backend answered —
  // and the endpoint omits any extension it cannot really price.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/domains/prices?tlds=${TLD_CATALOG.map((t) => t.tld).join(",")}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { mode?: string; prices?: PriceQuote[] };
        if (Array.isArray(json.prices) && json.prices.length > 0) {
          setPrices(json.prices);
          setDemoMode(json.mode === "mock");
        }
      } catch {
        /* price labels are optional — the search still works without them */
      }
    })();
    return () => controller.abort();
  }, []);

  function updatePhase(next: Phase, patch: Partial<SceneState> = {}) {
    setPhase(next);
    onChange({ phase: next, ...patch });
  }

  async function runSearch(q: string): Promise<SearchResponse | null> {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const res = await fetch(`/api/domains/search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    const json = (await res.json()) as SearchResponse & { error?: string };
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error(json.error ?? "Too many searches — please wait a moment and try again.");
      }
      throw new Error(json.error ?? "Search failed — please try again in a moment.");
    }
    return json;
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // never fire duplicate submissions

    const problem = validateDomainInput(value, Boolean(tld));
    const q = problem ? null : buildDomainQuery(value, tld);
    if (problem || !q) {
      setError(problem ?? "Enter a domain name to search.");
      updatePhase("error");
      inputRef.current?.focus();
      return;
    }

    inFlight.current = true;
    setError(null);
    setResults([]);
    setAlternatives([]);
    setSearched(q);
    updatePhase("searching", { query: value.trim().toLowerCase(), suggestion: null, priceLabel: null });

    try {
      const data = await runSearch(q);
      if (!data) return;
      setDemoMode(data.mode === "mock");
      setResults(data.results);

      const primary = data.results[0];
      if (!primary) {
        updatePhase("error", { priceLabel: null });
        setError("We couldn't check that name — please try again.");
        return;
      }

      if (primary.status === "available") {
        updatePhase("available", {
          priceLabel: primary.price !== undefined ? `${formatMoney(primary.price, primary.currency)}/yr` : null,
        });
        return;
      }

      // Unavailable (or unknown): only suggest alternatives we actually
      // checked. A keyword search against the registrar gives real answers.
      let suggestion: string | null = null;
      if (data.kind === "exact") {
        try {
          const keyword = data.query.split(".")[0];
          const alt = await runSearch(keyword);
          const available = (alt?.results ?? []).filter(
            (r) => r.status === "available" && r.domain !== primary.domain,
          );
          if (available.length > 0) {
            setAlternatives(available.slice(0, MAX_ALTERNATIVES));
            suggestion = available[0].domain;
          }
        } catch {
          /* alternatives are a bonus — a failed follow-up never hides the result */
        }
      }
      updatePhase("unavailable", { suggestion, priceLabel: null });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Search failed — please try again.";
      setError(message);
      updatePhase("error", { priceLabel: null });
    } finally {
      inFlight.current = false;
    }
  }

  function onInputKeydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && (results.length > 0 || error)) {
      setResults([]);
      setAlternatives([]);
      setError(null);
      updatePhase("idle", { suggestion: null, priceLabel: null });
    }
  }

  const searching = phase === "searching";

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={onSearch}
        role="search"
        aria-label="Domain search"
        className="rounded-[26px] border border-white/15 bg-white p-2 shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)] focus-within:ring-4 focus-within:ring-[#7BBDE8]/40 sm:rounded-full"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="ml-3 h-5 w-5 shrink-0 text-[#49769F]" aria-hidden />
            <label htmlFor="webnexa-domain" className="sr-only">
              Search for a domain name
            </label>
            <input
              id="webnexa-domain"
              ref={inputRef}
              name="q"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="yourbusiness"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onChange({ query: e.target.value });
                if (phase === "error" || phase === "unavailable" || phase === "available") {
                  updatePhase("idle", { suggestion: null, priceLabel: null });
                }
              }}
              onFocus={() => onChange({ focused: true })}
              onBlur={() => onChange({ focused: false })}
              onKeyDown={onInputKeydown}
              aria-describedby="webnexa-domain-help"
              aria-invalid={phase === "error"}
              className="h-12 w-full min-w-0 bg-transparent text-[16px] font-medium text-[#001D39] outline-none placeholder:text-[#49769F]/70"
            />
          </div>

          <div className="relative shrink-0 border-t border-slate-200 pt-2 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0">
            <label htmlFor="webnexa-extension" className="sr-only">
              Domain extension
            </label>
            <select
              id="webnexa-extension"
              value={tld}
              onChange={(e) => setTld(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl bg-[#F3F6FB] pl-4 pr-10 text-sm font-semibold text-[#0A4174] outline-none focus:ring-2 focus:ring-[#7BBDE8] sm:w-auto"
            >
              {TLD_CATALOG.map((item) => (
                <option key={item.tld} value={item.tld}>
                  .{item.tld}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 -rotate-90 text-[#0A4174] sm:top-[calc(50%+1px)]"
            >
              <path d="m7 4 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <button
            type="submit"
            disabled={searching}
            className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[20px] bg-gradient-to-b from-[#0A4174] to-[#001D39] px-6 text-sm font-semibold text-white transition hover:from-[#49769F] hover:to-[#0A4174] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7BBDE8]/50 disabled:cursor-wait disabled:opacity-80 sm:rounded-full"
          >
            {searching ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Checking…
              </>
            ) : (
              <>
                Search
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>

      <p id="webnexa-domain-help" className="sr-only">
        Type a name, pick an extension, then press Enter to check availability.
      </p>

      {/* Extension prices — only what the server actually quoted. */}
      {prices.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Extension prices">
          {prices.map((p) => (
            <li
              key={p.tld}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#BDD8E9]"
            >
              <span className="font-semibold text-white">.{p.tld}</span>{" "}
              <span className="tabular-nums">{formatMoney(p.price, p.currency)}</span>
              <span className="text-[#6EA2B3]">/yr</span>
            </li>
          ))}
        </ul>
      )}

      {/* Live status region for screen readers and sighted users. */}
      <div
        aria-live="polite"
        aria-busy={searching}
        className="mt-4 space-y-3"
        id="webnexa-domain-status"
      >
        {searching && (
          <p className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#BDD8E9]">
            <LoaderCircle className="h-4 w-4 animate-spin text-[#7BBDE8]" aria-hidden />
            Checking availability…
          </p>
        )}

        {phase === "error" && error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]"
          >
            <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {phase === "available" && results[0] && (
          <AvailableCard result={results[0]} onAdd={() => addResult(results[0])} inCart={has(results[0].domain)} />
        )}

        {phase === "unavailable" && results[0] && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#fecaca]">
              <X className="h-4 w-4" aria-hidden />
              <span className="break-all">{results[0].domain}</span>
              <span className="font-normal text-[#BDD8E9]">is already taken.</span>
            </p>

            {alternatives.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6EA2B3]">
                  Checked &amp; available right now
                </p>
                <ul className="mt-2 space-y-2">
                  {alternatives.map((alt) => (
                    <li
                      key={alt.domain}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#001D39]/60 px-3 py-2.5"
                    >
                      <span className="min-w-0 break-all text-sm text-white">{alt.domain}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        {alt.price !== undefined && (
                          <span className="text-xs tabular-nums text-[#BDD8E9]">
                            {formatMoney(alt.price, alt.currency)}/yr
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => addResult(alt)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#0A4174] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#49769F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8]"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          {has(alt.domain) ? "In cart" : "Add"}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#BDD8E9]">
                Try a different name or extension — we&apos;ll check it for real.
              </p>
            )}
          </div>
        )}
      </div>

      {demoMode && (
        <p className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3.5 py-2.5 text-xs leading-5 text-[#FDE68A]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" aria-hidden />
          <span>
            <strong className="font-semibold">Demo mode:</strong> availability and prices are
            simulated until ResellerClub API credentials are configured on the server.
          </span>
        </p>
      )}

      {searched && !searching && results.length === 0 && phase === "idle" && (
        <p className="mt-4 text-sm text-[#6EA2B3]">
          Search again to see live availability for{" "}
          <span className="font-medium text-[#BDD8E9]">{searched}</span>.
        </p>
      )}
    </div>
  );
}

function AvailableCard({
  result,
  onAdd,
  inCart,
}: {
  result: SearchResult;
  onAdd: () => void;
  inCart: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-4 sm:p-5">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#BBF7D0]">
        <Check className="h-4 w-4" aria-hidden />
        <span className="break-all">{result.domain}</span>
        <span className="font-normal text-[#BDD8E9]">is available</span>
        {result.premium && (
          <span className="rounded-full bg-[#F59E0B]/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#FDE68A]">
            Premium
          </span>
        )}
      </p>

      {result.price !== undefined && (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[#BDD8E9]">
          <span className="text-2xl font-semibold tabular-nums text-white">
            {formatMoney(result.price, result.currency)}
            <span className="text-sm font-medium text-[#BDD8E9]">/yr</span>
          </span>
          {result.renewalPrice !== undefined && (
            <span className="text-xs tabular-nums">
              Renews at {formatMoney(result.renewalPrice, result.currency)}/yr
            </span>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#001D39] transition hover:bg-[#BDD8E9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7BBDE8]/60"
        >
          {inCart ? "In cart" : "Continue to checkout"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <Link
          href={`/domains?q=${encodeURIComponent(result.domain)}`}
          className="text-sm font-medium text-[#7BBDE8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8] rounded"
        >
          See registration options
        </Link>
      </div>
    </div>
  );
}

/** Cart is display-only: the server re-checks availability and price at checkout. */
export type { PriceQuote };
