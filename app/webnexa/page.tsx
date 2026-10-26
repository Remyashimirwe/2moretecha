import type { Metadata } from "next";
import Link from "next/link";
import WebNexaLanding from "@/components/webnexa/webnexa-landing";

export const metadata: Metadata = {
  title: { absolute: "WebNexa — Domains, Hosting, Websites & Security" },
  description:
    "WebNexa by 2moreTechs: search and register a domain, launch hosting, build your website, get business email and secure it — all in one place.",
  robots: { index: true, follow: true },
};

const FOOTER_LINKS = [
  { label: "Domains", href: "/domains" },
  { label: "Cart", href: "/cart" },
  { label: "Login", href: "/login" },
  { label: "Get Started", href: "/get-started" },
];

/** Stable across prerenders: computed once and cached at build time. */
async function copyrightYear(): Promise<number> {
  "use cache";
  return new Date().getFullYear();
}

export default async function WebNexaPage() {
  const year = await copyrightYear();

  return (
    <div className="flex-1 bg-[#001D39]">
      <WebNexaLanding />

      <footer className="border-t border-white/10 bg-[#001D39]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-[#6EA2B3]">
            © {year} WebNexa — powered by 2moreTechs.
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap list-none items-center gap-x-5 gap-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#BDD8E9] underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8] rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
