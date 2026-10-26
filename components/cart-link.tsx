"use client";

import Link from "next/link";
import { useCart } from "./cart-context";

/** Header cart badge — shows how many domains are in the cart. */
export default function CartLink() {
  const { count, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
      aria-label={`Cart, ${hydrated ? count : 0} items`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          d="M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
      {hydrated && count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-light-blue px-1 text-[11px] font-bold text-deep-blue">
          {count}
        </span>
      )}
    </Link>
  );
}
