# WebNexa — premium interactive 3D hero page

Route: **`/webnexa`** · Source: `components/webnexa/**`, `app/webnexa/page.tsx`

A standalone landing page for **WebNexa** (powered by 2moreTechs): deep-navy hero,
live domain search, and a lazy-loaded Three.js scene (globe, floating extensions,
laptop, server rack, security shield, cloud + data particles). The existing
2-MoreTechs homepage and chrome are untouched — `/webnexa` is registered as a
"focused" route in `components/site-chrome.tsx`, so the site navbar/footer do not
wrap it.

---

## 1. Dependencies

Already installed in this repo:

```bash
npm install three @react-three/fiber @react-three/drei framer-motion lucide-react
npm install -D @types/three
```

| Package | Version used | Purpose |
| --- | --- | --- |
| `three` | 0.186 | WebGL rendering |
| `@react-three/fiber` | 9.8 | React renderer for three |
| `@react-three/drei` | 10.7 | `Float`, `useTexture`, helpers |
| `framer-motion` | 14 | entrance/menu animations (reduced-motion aware) |
| `lucide-react` | 1.61 | icons |

Run it:

```bash
npm run dev      # then open http://localhost:3000/webnexa
npm run build    # production build (route is statically prerendered)
```

## 2. File map

```
app/webnexa/page.tsx                     server component: metadata, layout, footer
components/webnexa/
  webnexa-landing.tsx                    client shell: one shared scene state
  site-header.tsx                        nav + "Powered by 2moreTechs" + mobile menu
  hero.tsx                               two-column hero copy + benefits
  domain-search.tsx                      real availability search (see §3)
  service-strip.tsx                      five services, hover ⇄ 3D link
  support-band.tsx                       conversion band (#webnexa-support)
  types.ts                               SceneState / SearchPhase contract
  scene/
    scene-loader.tsx                     dynamic import, WebGL + motion checks,
                                         viewport/visibility gating, SVG fallback
    hero-scene.tsx                       Canvas, lights, parallax, composition
    globe.tsx                            textured earth, atmosphere, arcs, packets,
                                         scanning ring while a search runs
    domain-labels.tsx                    .com/.net/.org/.co.tz sprite labels
    laptop.tsx                           screen texture mirrors the real search
    server-rack.tsx                      chassis + pulsing status LEDs
    shield.tsx                           extruded shield + lock, hover reaction
    cloud-and-particles.tsx              cloud upload + luminous data particles
    scene-fallback.tsx                   static SVG fallback (loading/no WebGL/reduced motion)
    scene-utils.ts                       canvas textures, palette, lat/lng maths
public/webnexa/earth-globe.jpg           2048×1024 earth map (~247 KB, blue marble)
```

## 3. Domain-search architecture

**Client** (`domain-search.tsx`)

- Validates and normalises input (`lib/search-query.ts`), then calls the server.
- Guards duplicate submissions (`inFlight` ref + disabled button) and aborts
  superseded requests with `AbortController`.
- Renders availability, price and renewal price **only** when the API returned
  them. No price or status is ever fabricated client-side.
- If an exact search comes back unavailable, it runs a second, real keyword
  check and only then offers alternatives (each with its own verified status).
- Cart lines are display-only: the server re-checks availability and re-prices
  every item at checkout (`components/cart-context.tsx`).

**Server**

| Endpoint | What it does |
| --- | --- |
| `GET /api/domains/search?q=…` | Validates/normalises, asks ResellerClub for availability, prices results with `lib/pricing.ts`. Rate limited: 30 requests/minute per IP → `429` + `Retry-After`. |
| `GET /api/domains/prices?tlds=com,net,…` | Server-side retail quotes for the extension chips. Rate limited: 60/minute per IP. Extensions that are not actually sold are **omitted**, never invented. |

Rate limiting lives in `lib/rate-limit.ts` (in-memory sliding window,
per-process). Behind a multi-instance deployment, swap the `Map` for a shared
store (Redis/Upstash/Postgres) — call sites stay identical.

**Development mode** — when `RESELLERCLUB_MODE=auto` and no credentials exist,
`lib/resellerclub.ts` runs its deterministic mock. The UI shows a permanent,
clearly-labelled *Demo mode* banner in that case, and the laptop screen shows
"Checking availability…" instead of pretending to succeed. To go live, configure
credentials (§4) — no code change is needed.

## 4. Connecting the real ResellerClub API

All credentials stay **server-side** (`.env` is never shipped to the browser).

```bash
# .env  — values are placeholders, never real secrets
RESELLERCLUB_USER_ID="your-reseller-id"
RESELLERCLUB_API_KEY="your-api-key"
# sandbox first: https://test.httpapi.com/api   live: https://httpapi.com/api
RESELLERCLUB_BASE_URL="https://test.httpapi.com/api"
RESELLERCLUB_MODE="auto"        # auto | live | mock
RESELLERCLUB_CURRENCY="USD"
DOMAIN_RETAIL_MARKUP_PERCENT="20"
DOMAIN_SEARCH_TLDS="com,net,org,info,co"
```

1. ResellerClub control panel → **Settings → API** → generate the key.
2. Add your server's public IP to the API **IP whitelist**.
3. Copy the values above into `.env`, set `RESELLERCLUB_MODE=live` (or leave
   `auto`), restart the server.
4. Verify: `curl 'localhost:3000/api/domains/prices?tlds=com,net'` should return
   `"mode":"live"` and `"source":"resellerclub"`, and searching a name should
   return the registrar's real status.
5. Before taking payments, confirm the availability + price re-validation
   performed server-side at checkout (`app/api/checkout/*`).

Security rules the code already follows — keep them when extending:

- Never expose `RESELLERCLUB_*` to the client (no `NEXT_PUBLIC_` prefix).
- Validate every query parameter on the server, even after client validation.
- Rate-limit all registrar-facing endpoints.
- Never trust prices or payment status submitted by the browser.

## 5. Performance & accessibility

- The whole scene is `next/dynamic` with `ssr: false`, loaded only when the
  container nears the viewport; before that (and without WebGL, or with
  `prefers-reduced-motion`) an SVG fallback renders instantly.
- `frameloop="never"` while off-screen or when the tab is hidden.
- DPR capped (2 desktop / 1.5 mobile), particle counts halved on mobile, one
  draw call for all network arcs, canvas textures for labels and the laptop UI
  (no font downloads).
- Animation loops use refs only — no `setState` in `useFrame`.
- Search form is plain HTML: labelled input/select, `aria-live` status region,
  `role="search"`, visible focus rings, `Escape` clears a result, and it works
  with the 3D scene completely absent.
- The decorative scene wrapper is `aria-hidden`; the fallback keeps an
  `aria-label` for the one case where it is the only visual.

## 6. Tuning

- Palette: `components/webnexa/scene/scene-utils.ts` (`PALETTE`) plus the
  Tailwind arbitrary values (`#001D39`, `#0A4174`, `#49769F`, `#4E8EA2`,
  `#6EA2B3`, `#7BBDE8`, `#BDD8E9`) used across the page.
- Extension labels in 3D: `LABELS` in `domain-labels.tsx`.
- Service ⇄ object mapping: `ServiceKey` in `types.ts` and the `highlight`
  checks in `hero-scene.tsx`.
- Earth map: `public/webnexa/earth-globe.jpg`.
