# 2-MoreTechs — Domain Storefront

The 2-MoreTechs website: customers search for a domain, see **live availability** and
transparent yearly prices, buy it with PayPal, and the domain is **registered
automatically** — all from one site.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 ·
Prisma 7 + PostgreSQL (Neon or local embedded dev DB) · ResellerClub HTTP API ·
PayPal Checkout (with simulated mode)

---

## What works today

### Milestone 1 — domain search
| Feature | Where |
| --- | --- |
| Branded homepage (navy/blue, responsive) | `/` |
| Domain search page | `/domains` |
| Live availability via ResellerClub (bulk check, one API call for all extensions) | `GET /api/domains/search?q=…` |
| Retail pricing from your real cost price + markup (`DOMAIN_RETAIL_MARKUP_PERCENT`) | `lib/pricing.ts` |
| Premium-domain pricing (costHash), trademark-claims flag | `lib/resellerclub.ts` |
| Demo mode when no API keys are set, so the site always works | `RESELLERCLUB_MODE` |

### Milestone 2 — cart → checkout → payment → automatic registration
| Feature | Where |
| --- | --- |
| Shopping cart (localStorage, header badge, 1–10 year periods) | `/cart`, `components/cart-context.tsx` |
| Checkout with registrant/WHOIS contact form | `/checkout` |
| **Server-side re-validation**: availability re-checked + prices re-computed (client prices are never trusted) | `lib/checkout.ts` |
| PayPal Checkout — order created, captured and **verified server-side** (status + amount + currency + custom_id) | `lib/paypal.ts` |
| PayPal webhook with signature verification (idempotent second path to fulfillment) | `POST /api/paypal/webhook` |
| Simulated payment mode so the whole flow runs before PayPal credentials exist | `PAYMENT_MODE="auto"` |
| Automatic provisioning after verified payment: ResellerClub customer → contact → `domains/register.json` | `lib/register-domain.ts` |
| Order status page with live registration progress + manual retry for failures | `/orders/[id]` |
| Guest checkout (email + contact details), no account needed to buy | — |

**Not built yet:** customer accounts/dashboard, DNS & renewals, then professional
email and web hosting.

---

## Quick start

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # then edit .env
npm run db:dev              # local embedded PostgreSQL on 127.0.0.1:5433 (see below)
npm run db:push             # create the tables
npm run dev                 # http://localhost:3000
```

### 1. Database

**Local development (no signup needed):** `npm run db:dev` starts an embedded
PostgreSQL inside the project (`./.devdb`, gitignored, port `5433`). The default
`.env` already points at it.

**Production / cloud (Neon):** set `DATABASE_URL` in `.env` and run
`npx prisma db push` once against it. The database backend is chosen purely by
`DATABASE_URL` — no code changes.

### 2. ResellerClub API keys (`.env`)

```env
RESELLERCLUB_USER_ID="your-reseller-id"
RESELLERCLUB_API_KEY="your-api-key"
RESELLERCLUB_API_BASE_URL="https://test.httpapi.com/api"   # sandbox → https://httpapi.com/api when live
```

- Panel → **Settings → API**: copy your user ID/API key and **add your server IP to the whitelist**.
- Start on the sandbox (`test.httpapi.com`) — it does not consume your balance.
- Leave the keys empty (or `RESELLERCLUB_MODE="mock"`) to run in **demo mode**:
  search *and* registration work end-to-end with simulated data.

> 🔐 Keys are read **only on the server** (route handlers). Never put them in
> `NEXT_PUBLIC_*` vars or client code.

### 3. PayPal (`.env`)

```env
PAYMENT_MODE="auto"          # paypal | mock | auto (auto = PayPal when creds exist)
PAYPAL_MODE="sandbox"
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
APP_URL="http://localhost:3000"
PAYPAL_WEBHOOK_ID=""         # optional but recommended (Dashboard → Webhooks)
```

- Create a **REST API app** at <https://developer.paypal.com> → copy client id/secret.
- Webhook: point `PAYMENT.CAPTURE.COMPLETED` (and `CHECKOUT.ORDER.COMPLETED`) at
  `https://your-domain/api/paypal/webhook`, then put its id in `PAYPAL_WEBHOOK_ID`.
- Without credentials the checkout uses **simulated payments** so you can test the
  full purchase flow locally.

### 4. Pricing & registration rules (`.env`)

```env
RESELLERCLUB_CURRENCY="USD"          # match your ResellerClub selling currency
DOMAIN_RETAIL_MARKUP_PERCENT="20"    # retail = your cost × 1.20
DOMAIN_SEARCH_TLDS="com,net,org,info,co"
DOMAIN_DEFAULT_NS="ns1.resellerclub.com,ns2.resellerclub.com"
DOMAIN_PRIVACY="false"               # WHOIS privacy (extra cost)
```

Retail price = your ResellerClub **cost price** (`products/customer-price.json`,
cached 6h) × markup, rounded up to the cent. Multi-year carts are priced as
*year 1 registration + (n−1) × renewal*. If a cost price isn't available for an
extension, the catalogue price in `lib/tlds.ts` is shown (flagged “base price”).

---

## How an order flows (Milestone 2)

```
/cart  →  /checkout (contact form)
          │  POST /api/checkout
          │    1. validate contact + items
          │    2. re-check availability (bulk API call)
          │    3. re-price on the server (never trust the browser)
          │    4. DB: Customer upsert + Order PENDING + OrderItems
          │    5. create payment order (PayPal or simulated) ← server-side amount
          ▼
        payment (PayPal buttons / simulated button)
          │  POST /api/checkout/{id}/capture
          │    1. capture + VERIFY status, amount, currency, custom_id
          │    2. Order PENDING → PAID exactly once (webhook is idempotent too)
          │    3. provision each item: pending → registering → active|failed
          │         ResellerClub: customers/signup.json → contacts/add.json
          │                      → domains/register.json → rcOrderId stored
          ▼
        /orders/{id}   live status page (polls every 3s while in flight,
                       manual "Retry registration" for failed items)
```

Safety rules encoded in the code:

- The browser can never mark an order paid — only `capture` (with PayPal
  verification) or a **signature-verified webhook** can.
- Provisioning runs only for `PAID` orders; items are claimed with conditional
  updates so a capture + webhook race can't register a domain twice.
- `failed` items are never retried automatically (no hammering the registry) —
  retry is explicit; crashed `registering` items resume after 2 minutes.

---

## Project structure

```
app/
  page.tsx                      Homepage (hero, pricing cards, how it works, services)
  domains/page.tsx              Search page (static shell + Suspense-wrapped client search)
  cart/page.tsx                 Cart (client, localStorage)
  checkout/page.tsx             Checkout: contact form → payment (client)
  orders/[id]/page.tsx          Order status (always fresh; instant=false)
  api/domains/search/route.ts   GET /api/domains/search?q=… → validated, priced results
  api/checkout/route.ts         POST → create PENDING order + payment order
  api/checkout/[id]/capture/    POST capture+verify+fulfil · GET retry provisioning
  api/orders/[id]/route.ts      GET public order status (polling)
  api/orders/[id]/retry/        POST manual retry for failed registrations
  api/paypal/config/route.ts    GET public PayPal client id for the SDK
  api/paypal/webhook/route.ts   POST signature-verified PayPal webhook
components/
  search-bar.tsx                Hero search → navigates to /domains?q=…
  domain-search.tsx             Client search UI + add-to-cart
  cart-context.tsx              Cart provider (localStorage-backed)
  cart-link.tsx                 Header cart badge
  order-status.tsx              Order status view + 3s poller + retry
lib/
  domain-search.ts              Input parsing/validation + search orchestration
  resellerclub.ts               Server-only API client: availability, prices,
                                signup/contact/register/details + mock mode
  paypal.ts                     Server-only payment client (create/capture/verify/webhook)
  checkout.ts                   Server-side order creation (validate/check/price)
  register-domain.ts            Fulfillment: mark PAID + provision items (idempotent)
  pricing.ts                    cost → retail pricing rules
  tlds.ts                       TLD catalogue (ResellerClub product keys, fallback prices)
  domain-types.ts               Client-safe response types
  order-view.ts                 Client-safe order status types
  money.ts                      Client-safe currency formatting
  prisma.ts                     Lazy Prisma client (PrismaPg adapter)
prisma/schema.prisma            Customer, Order, OrderItem
scripts/dev-db.mjs              Local embedded PostgreSQL (npm run db:dev)
```

### The API contract (ResellerClub)

- Availability: `GET https://domaincheck.httpapi.com/api/domains/available.json`
  with repeated `domain-name=` and `tlds=` params → hash map `domain → status`
  (`available`, `regthroughus`, `regthroughothers`, `unknown`), optional `costHash`
  for premium names. Response parsing accepts every documented shape.
- Cost prices: `GET …/products/customer-price.json` → `productKey → action →
  years → price` (keys like `domcno` for .com — full map in `lib/tlds.ts`).
- Registration workflow (POST with query params, auth in query):
  `customers/signup.json` → `contacts/add.json` → `domains/register.json`
  (all four contact roles point at the created contact; `invoice-option=KeepInvoice`
  so registrations are paid from your ResellerClub balance).

Official docs: [Check Availability](https://resellerclub.webpropanel.com/kb/check-domain-availability-api) ·
[Customer Pricing](https://resellerclub.webpropanel.com/kb/get-customer-pricing-api) ·
[Product Keys](https://resellerclub.webpropanel.com/kb/answer/1918)

---

## Roadmap

1. ✅ **Milestone 1 — Domain search**
2. ✅ **Milestone 2 — Sales:** cart, checkout, server-side payment verification,
   automatic registration after payment
3. 📇 **Milestone 3 — Management:** customer accounts + dashboard (domains,
   nameservers, expiry, renewals — ResellerClub renew/DNS APIs), resume-payment
   for abandoned checkouts
4. 📧 **Then:** professional email & web hosting (separate ResellerClub product APIs)

## Useful commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
npm run db:dev       # local embedded PostgreSQL (port 5433)
npm run db:push      # sync schema to DATABASE_URL
npx prisma generate  # regenerate the client (also runs on npm install)
```
