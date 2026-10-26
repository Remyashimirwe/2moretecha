"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import TldPicker from "@/components/tld-picker";
import { buildDomainQuery, validateDomainInput } from "@/lib/search-query";
import type { SearchResult } from "@/lib/domain-types";
import { formatMoney } from "@/lib/money";

type Status = "idle" | "loading" | "error" | "results";

const MAX_SHOWN = 4;

/**
 * Hero domain search: name + extension picker (the modern split style),
 * validated client-side, then queried against the existing availability API
 * (GET /api/domains/search → ResellerClub or demo mode). Availability and
 * prices shown are exactly what the backend returns — nothing is fabricated.
 */
export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [tld, setTld] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function chooseTld(next: string | null) {
    setTld(next);
    if (status === "error") setStatus("idle");
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const problem = validateDomainInput(query, tld !== null);
    const q = problem ? null : buildDomainQuery(query, tld);
    if (problem || !q) {
      setStatus("error");
      setError(problem ?? "Enter a domain name to search.");
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/domains/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { results?: SearchResult[]; error?: string };
      if (!res.ok) {
        setStatus("error");
        setError(json.error ?? "Search failed — please try again in a moment.");
        return;
      }
      setResults(json.results ?? []);
      setSearched(q);
      setStatus("results");
    } catch {
      setStatus("error");
      setError("Network error — check your connection and try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        onSubmit={onSearch}
        role="search"
        aria-label="Domain search"
        className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_-18px_rgba(15,23,42,0.18)] transition-shadow focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-600/10 sm:flex-row sm:items-center sm:rounded-full"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <label htmlFor="hero-domain-input" className="sr-only">
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
            id="hero-domain-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="your business name…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={status === "error"}
            className="h-12 w-full min-w-0 bg-transparent px-2 text-base text-navy-950 outline-none placeholder:text-slate-400 sm:text-lg"
          />
          <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
          <TldPicker value={tld} onChange={chooseTld} />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm shadow-brand-900/15 transition-all hover:bg-brand-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-70 sm:w-auto sm:rounded-full"
        >
          {status === "loading" ? (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4 animate-spin">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
              <path d="M18 10a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" strokeLinecap="round" />
            </svg>
          )}
          Search Domains
        </button>
      </form>

      {/* Status regions */}
      <div role="status" aria-live="polite" className="mt-3">
        {status === "error" && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {status === "loading" && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {status === "results" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
            <ul>
              {results.slice(0, MAX_SHOWN).map((r) => (
                <li
                  key={r.domain}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50"
                >
                  <span className="truncate text-sm font-semibold text-navy-950">{r.domain}</span>
                  {r.status === "available" ? (
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold tabular-nums text-brand-700">
                        {r.price !== undefined ? `${formatMoney(r.price, r.currency)}/yr` : "—"}
                      </span>
                      <Link
                        href={`/domains?q=${encodeURIComponent(r.domain)}`}
                      className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                      >
                        Get it →
                      </Link>
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      Taken
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {results.length > MAX_SHOWN && (
              <Link
                href={`/domains?q=${encodeURIComponent(searched)}`}
                className="block bg-slate-50 px-4 py-2.5 text-center text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                See all {results.length} results →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
