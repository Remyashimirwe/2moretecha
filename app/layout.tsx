import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { CartProvider } from "@/components/cart-context";
import BackToTop from "@/components/back-to-top";
import Logo from "@/components/logo";
import SiteChrome from "@/components/site-chrome";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://2moretechs.com"),
  applicationName: "2-MoreTechs",
  title: {
    default: "2-MoreTechs | Domain Names for Your Business",
    template: "%s | 2-MoreTechs",
  },
  description:
    "Find and register a domain for your business with live availability and clear yearly pricing. 2-MoreTechs helps businesses in Rwanda and beyond get online.",
  keywords: ["domain names", "domain registration", "Rwanda domains", "business domains", "2-MoreTechs"],
  creator: "2-MoreTechs",
  publisher: "2-MoreTechs",
  icons: {
    icon: "/logo.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_RW",
    siteName: "2-MoreTechs",
    title: "2-MoreTechs | Domain Names for Your Business",
    description:
      "Find a domain name your business can grow into, with live availability and transparent yearly pricing.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "2-MoreTechs — Find a domain your business can grow into" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "2-MoreTechs | Domain Names for Your Business",
    description:
      "Find a domain name your business can grow into, with live availability and transparent yearly pricing.",
    images: ["/opengraph-image.png"],
  },
};

/**
 * The current year, rendered from a cache so the layout can be statically
 * prerendered (Next 16 Cache Components forbids un-cached `new Date()` at
 * render time). Refreshed daily.
 */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body id="top" className="min-h-full flex flex-col bg-black" suppressHydrationWarning>
        <CartProvider>
        <SiteChrome
          footer={
            <footer className="border-t border-slate-200 bg-black text-slate-700">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                <div className="flex flex-col gap-6 border-b border-slate-200 py-10 sm:flex-row sm:items-end sm:justify-between sm:py-12">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                      Your next chapter starts online
                    </p>
                    <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-navy-950 sm:text-3xl">
                      Find a name your business can grow into.
                    </h2>
                  </div>
                  <Link
                    href="/domains"
                    className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-3 border-b border-brand-300 pb-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-700 hover:text-brand-800"
                  >
                    Search domains
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </Link>
                </div>

                <div className="grid gap-10 py-10 sm:grid-cols-2 md:grid-cols-12 md:gap-8 md:py-14">
                  <div className="space-y-4 sm:col-span-2 md:col-span-4">
                    <Logo variant="light" />
                    <p className="max-w-sm text-sm leading-6 text-slate-600">
                      Domains and digital services for businesses in Rwanda and beyond. Start with
                      your name; build everything else from there.
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      Kigali, Rwanda
                    </p>
                  </div>

                  <nav aria-label="Explore" className="md:col-span-2">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-950">
                      Explore
                    </h3>
                    <ul className="mt-4 space-y-3 text-sm text-slate-600">
                      <li>
                        <Link href="/domains" className="transition-colors hover:text-brand-700">
                          Find a domain
                        </Link>
                      </li>
                      <li>
                        <Link href="/#pricing" className="transition-colors hover:text-brand-700">
                          Pricing
                        </Link>
                      </li>
                      <li>
                        <Link href="/#hosting" className="transition-colors hover:text-brand-700">
                          Our services
                        </Link>
                      </li>
                      <li>
                        <Link href="/cart" className="transition-colors hover:text-brand-700">
                          Your cart
                        </Link>
                      </li>
                    </ul>
                  </nav>

                  <div className="md:col-span-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-950">
                      Services
                    </h3>
                    <ul className="mt-4 space-y-3 text-sm">
                        <li className="flex items-center gap-2 text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden />
                        Domain registration
                        <span className="text-xs text-slate-400">Live</span>
                      </li>
                      <li className="text-slate-400">Web hosting · Coming soon</li>
                      <li className="text-slate-400">Professional email · Coming soon</li>
                      <li className="text-slate-400">SSL &amp; security · Coming soon</li>
                    </ul>
                  </div>

                  <div className="md:col-span-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-950">
                      Get in touch
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Need a hand finding the right domain? Our team is based in Kigali.
                    </p>
                    <a
                      href="mailto:hello@2moretechs.com"
                      className="mt-3 inline-flex text-sm font-medium text-brand-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-brand-900"
                    >
                      hello@2moretechs.com
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <span>© <CopyrightYear /> 2-MoreTechs. All rights reserved.</span>
                  <span>
                    Domain availability and wholesale pricing are provided by our registrar partner.
                    Prices shown in USD.
                  </span>
                  <BackToTop />
                </div>
              </div>
            </footer>
          }
        >
          {children}
        </SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
