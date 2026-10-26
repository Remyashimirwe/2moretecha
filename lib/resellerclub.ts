/**
 * Server-side ResellerClub HTTP API client.
 *
 * ⚠️ This module reads RESELLERCLUB_* secrets from the environment. Only import
 * it from server code (route handlers, server components, server actions) —
 * never from client components.
 *
 * Docs (official, mirrored):
 *  - Check availability: https://resellerclub.webpropanel.com/kb/check-domain-availability-api
 *  - Customer pricing:    https://resellerclub.webpropanel.com/kb/get-customer-pricing-api
 *  - Product keys:        https://resellerclub.webpropanel.com/kb/answer/1918
 */

import { TLD_CATALOG } from "./tlds";

export type AvailabilityStatus = "available" | "taken" | "unknown" | "unsupported";

export type PremiumInfo = {
  create?: number;
  renew?: number;
  transfer?: number;
  currency?: string;
};

export type AvailabilityEntry = {
  domain: string;
  status: AvailabilityStatus;
  /** Status exactly as ResellerClub returned it (available, regthroughus, ...). */
  rawStatus?: string;
  /** Present when the name is a premium / EAP domain. */
  premium?: PremiumInfo;
  trademarkClaims?: boolean;
};

/** productKey -> action -> years -> price (cost price, i.e. what you pay). */
export type CostPrices = Record<string, Record<string, Record<string, number>>>;

export type ApiErrorCode = "auth" | "network" | "bad-response" | "not-configured";

export class ResellerClubError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
  ) {
    super(message);
    this.name = "ResellerClubError";
  }
}

type Mode = "live" | "mock";

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** True for empty or obvious `.env.example` placeholder values. */
function isPlaceholder(value: string): boolean {
  if (!value) return true;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.startsWith("your") || normalized.includes("example") || normalized.includes("placeholder");
}

export function getCredentials(): { userId: string; apiKey: string } | null {
  const userId = readEnv("RESELLERCLUB_USER_ID");
  const apiKey = readEnv("RESELLERCLUB_API_KEY");
  if (isPlaceholder(userId) || isPlaceholder(apiKey)) return null;
  return { userId, apiKey };
}

/**
 * live = call ResellerClub, mock = deterministic local simulation.
 * Default "auto": live when credentials exist, otherwise mock so the site
 * still works end-to-end while you're setting things up.
 */
export function getMode(): Mode {
  const forced = readEnv("RESELLERCLUB_MODE").toLowerCase();
  if (forced === "mock") return "mock";
  if (forced === "live") return "live";
  return getCredentials() ? "live" : "mock";
}

function baseUrl(): string {
  return (readEnv("RESELLERCLUB_API_BASE_URL") || "https://test.httpapi.com/api").replace(/\/$/, "");
}

function domaincheckUrl(): string {
  // The availability check lives on its own host for both sandbox and live.
  const custom = readEnv("RESELLERCLUB_DOMAINCHECK_BASE_URL");
  if (custom) return custom.replace(/\/$/, "");
  return "https://domaincheck.httpapi.com/api";
}

function authParams(): URLSearchParams {
  const creds = getCredentials();
  if (!creds) throw new ResellerClubError("ResellerClub credentials are not configured.", "not-configured");
  const p = new URLSearchParams();
  p.set("auth-userid", creds.userId);
  p.set("api-key", creds.apiKey);
  return p;
}

async function apiGet(path: string, params: URLSearchParams, timeoutMs = 12_000): Promise<unknown> {
  const url = `${baseUrl()}${path}?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ResellerClubError(`Could not reach ResellerClub: ${message}`, "network");
  }
  if (res.status === 401 || res.status === 403) {
    throw new ResellerClubError("ResellerClub rejected the credentials (check user ID / API key / IP whitelist).", "auth");
  }
  if (!res.ok) {
    throw new ResellerClubError(`ResellerClub responded with HTTP ${res.status}.`, "bad-response");
  }
  try {
    return await res.json();
  } catch {
    throw new ResellerClubError("ResellerClub returned a non-JSON response.", "bad-response");
  }
}

/* ------------------------------------------------------------------ *
 * Availability
 * ------------------------------------------------------------------ */

export async function checkAvailability(
  names: string[],
  tlds: string[],
): Promise<AvailabilityEntry[]> {
  if (names.length === 0 || tlds.length === 0) return [];
  return getMode() === "mock"
    ? mockAvailability(names, tlds)
    : liveAvailability(names, tlds);
}

async function liveAvailability(names: string[], tlds: string[]): Promise<AvailabilityEntry[]> {
  const params = authParams();
  for (const n of names) params.append("domain-name", n);
  for (const t of tlds) params.append("tlds", t);

  const url = `${domaincheckUrl()}/domains/available.json?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ResellerClubError(`Could not reach ResellerClub: ${message}`, "network");
  }
  if (res.status === 401 || res.status === 403) {
    throw new ResellerClubError(
      "ResellerClub rejected the credentials (check user ID / API key / IP whitelist).",
      "auth",
    );
  }
  if (!res.ok) {
    throw new ResellerClubError(`ResellerClub responded with HTTP ${res.status}.`, "bad-response");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ResellerClubError("ResellerClub returned a non-JSON response.", "bad-response");
  }

  return parseAvailabilityResponse(data, names, tlds);
}

function toDomain(key: string, names: string[], tlds: string[]): string {
  const k = key.trim().toLowerCase();
  if (k.includes(".")) return k;
  // Key is a TLD (hash-map style response) → pair it with the queried name.
  const name = names[0] ?? "";
  if (tlds.includes(k) || names.length <= 1) return `${name}.${k}`;
  return `${name}.${k}`;
}

function normalizeStatus(raw: string): AvailabilityStatus {
  const s = raw.trim().toLowerCase();
  if (s === "available") return "available";
  if (s === "regthroughus" || s === "regthroughothers") return "taken";
  if (s === "unknown") return "unknown";
  if (s === "invalid" || s === "notsupported" || s === "not-supported") return "unsupported";
  // "registered" and anything else we don't recognise → treat as not available.
  if (s === "registered" || s === "sold" || s === "booked") return "taken";
  return "unknown";
}

function parseMoney(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parsePremium(value: unknown): PremiumInfo | undefined {
  if (!value || typeof value !== "object") return undefined;
  const hash = value as Record<string, unknown>;
  const costHash = (hash.costHash ?? hash["costhash"]) as Record<string, unknown> | undefined;
  if (!costHash || typeof costHash !== "object") return undefined;
  const info: PremiumInfo = {
    create: parseMoney(costHash.create),
    renew: parseMoney(costHash.renew),
    transfer: parseMoney(costHash.transfer),
    currency:
      typeof costHash.currencySymbol === "string" ? costHash.currencySymbol : undefined,
  };
  return info.create !== undefined || info.renew !== undefined ? info : undefined;
}

/**
 * The API returns a hash map of domain name → availability status. Over the
 * years a few shapes have circulated, so we accept:
 *   { "foo.com": { status: "available", costHash: {...} } }
 *   { "foo.com": "available" }
 *   [ { "domain-name": "foo.com", "status": "available" } ]
 *   { status: "available" }                  (single-domain responses)
 * Keys may be full domains or bare TLDs.
 */
function parseAvailabilityResponse(
  data: unknown,
  names: string[],
  tlds: string[],
): AvailabilityEntry[] {
  const out: AvailabilityEntry[] = [];

  const push = (domain: string, rawStatus: unknown, value?: unknown) => {
    const status = normalizeStatus(String(rawStatus ?? "unknown"));
    const existing = out.find((e) => e.domain === domain);
    const entry: AvailabilityEntry = {
      domain,
      status,
      rawStatus: String(rawStatus ?? "unknown"),
      premium: parsePremium(value),
      trademarkClaims:
        !!value && typeof value === "object" && !!(value as Record<string, unknown>)["tm-claims-key"],
    };
    if (existing) Object.assign(existing, entry);
    else out.push(entry);
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const domain = rec["domain-name"] ?? rec.domain ?? rec.name;
        if (domain) push(String(domain), rec.status, rec);
      }
    }
    return out;
  }

  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const keys = Object.keys(rec);

    // Single-object response: { "status": "..." } with no domain-ish keys.
    if ("status" in rec && keys.every((k) => ["status", "costHash", "tm-claims-key", "ror"].includes(k))) {
      const onlyDomain = names.length === 1 ? `${names[0]}.${tlds[0]}` : undefined;
      if (onlyDomain) push(onlyDomain, rec.status, rec);
      return out;
    }

    for (const key of keys) {
      const value = rec[key];
      if (value && typeof value === "object" && "status" in (value as object)) {
        const v = value as Record<string, unknown>;
        push(toDomain(key, names, tlds), v.status, v);
      } else if (typeof value === "string") {
        push(toDomain(key, names, tlds), value, { status: value });
      }
    }
    return out;
  }

  throw new ResellerClubError("Unrecognised availability response from ResellerClub.", "bad-response");
}

/* ------------------------------------------------------------------ *
 * Pricing (cost price → your retail price is applied in lib/pricing.ts)
 * ------------------------------------------------------------------ */

const PRICE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — their docs urge caching
let priceCache: { at: number; data: CostPrices } | null = null;

export async function getCostPrices(): Promise<CostPrices | null> {
  if (getMode() === "mock") return mockCostPrices();
  if (priceCache && Date.now() - priceCache.at < PRICE_CACHE_TTL_MS) return priceCache.data;

  const params = authParams();
  const data = await apiGet("/products/customer-price.json", params, 30_000);
  if (!data || typeof data !== "object") return null;
  priceCache = { at: Date.now(), data: data as CostPrices };
  return priceCache.data;
}

/** Test hook — clears the in-memory cost-price cache. */
export function clearPriceCache(): void {
  priceCache = null;
}

/* ------------------------------------------------------------------ *
 * Mock mode (no credentials / RESELLERCLUB_MODE=mock)
 * Deterministic so the same search always gives the same answer.
 * ------------------------------------------------------------------ */

function hash(str: string): number {
  // djb2
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

const MOCK_ALWAYS_TAKEN = new Set([
  "google", "facebook", "amazon", "twitter", "x", "apple", "microsoft", "netflix",
  "openai", "chatgpt", "meta", "instagram", "youtube", "linkedin", "paypal",
  "rwandan", "bank", "gov", "mail", "email", "shop", "store", "news", "test",
]);

/** % of names that are already registered, per TLD (`.com` is crowded). */
const MOCK_TAKEN_RATE: Record<string, number> = {
  com: 62, net: 45, org: 42, info: 30, co: 35, biz: 38, me: 40, io: 44, ai: 55,
};

function mockAvailability(names: string[], tlds: string[]): AvailabilityEntry[] {
  const out: AvailabilityEntry[] = [];
  for (const name of names) {
    for (const tld of tlds) {
      const domain = `${name}.${tld}`;
      const h = hash(domain);
      const takenRate = MOCK_TAKEN_RATE[tld] ?? 40;
      let status: AvailabilityStatus = "available";

      if (MOCK_ALWAYS_TAKEN.has(name)) status = "taken";
      else if (h % 100 < takenRate) status = "taken";

      const entry: AvailabilityEntry = { domain, status, rawStatus: status };
      if (status === "available" && h % 29 === 0) {
        entry.premium = { create: 250 + (h % 900), renew: 250 + (h % 900), currency: "$" };
      }
      out.push(entry);
    }
  }
  return out;
}

/**
 * Mock cost prices derived from the catalogue so the full pricing pipeline
 * (cost → markup → retail) runs exactly like it does in live mode.
 */
function mockCostPrices(): CostPrices {
  const markup = getMarkupPercent();
  const prices: CostPrices = {};
  for (const info of TLD_CATALOG) {
    const cost = Math.round((info.defaultRetail / (1 + markup / 100)) * 100) / 100;
    prices[info.productKey] = {
      addnewdomain: { "1": cost },
      renewdomain: { "1": cost },
      addtransferdomain: { "1": cost },
    };
  }
  return prices;
}

export function getMarkupPercent(): number {
  const raw = Number(process.env.DOMAIN_RETAIL_MARKUP_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : 20;
}

/* ------------------------------------------------------------------ *
 * Registration workflow (Milestone 2): customer → contact → domain
 * ------------------------------------------------------------------ */

export type ResellerProfile = {
  username: string; // email
  passwd: string;
  name: string;
  company?: string;
  addressLine1: string;
  city: string;
  state?: string;
  country: string;
  zipcode: string;
  phoneCc: string;
  phone: string;
};

export type ResellerContact = {
  email: string;
  name: string;
  company?: string;
  addressLine1: string;
  city: string;
  state?: string;
  country: string;
  zipcode: string;
  phoneCc: string;
  phone: string;
};

type DashedResponse = Record<string, unknown> & {
  status?: unknown;
  errorcode?: unknown;
  errorstr?: unknown;
};

/** Generic authenticated call against the main HTTP API host. */
async function callApi(
  path: string,
  params: Record<string, string | string[] | number | undefined>,
  opts: { method?: "GET" | "POST"; timeoutMs?: number } = {},
): Promise<DashedResponse> {
  const search = authParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v));
    } else {
      search.set(key, String(value));
    }
  }

  const url = `${baseUrl()}${path}?${search.toString()}`;
  const method = opts.method ?? "POST";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    });
  } catch (err) {
    throw new ResellerClubError(
      `Could not reach ResellerClub: ${err instanceof Error ? err.message : String(err)}`,
      "network",
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new ResellerClubError(
      "ResellerClub rejected the credentials (check user ID / API key / IP whitelist).",
      "auth",
    );
  }
  if (!res.ok) {
    throw new ResellerClubError(`ResellerClub responded with HTTP ${res.status}.`, "bad-response");
  }

  let data: DashedResponse;
  try {
    data = (await res.json()) as DashedResponse;
  } catch {
    throw new ResellerClubError("ResellerClub returned a non-JSON response.", "bad-response");
  }

  const status = String(data.status ?? "").toLowerCase();
  if (status === "error" || status === "failure" || data.errorstr) {
    const detail = String(data.errorstr ?? data.errorcode ?? "unknown error");
    throw new ResellerClubError(`ResellerClub: ${detail}`, "bad-response");
  }
  return data;
}

/** Creates a ResellerClub customer account; returns the customer id. */
export async function signupCustomer(profile: ResellerProfile): Promise<number> {
  if (getMode() === "mock") return 900_000 + Math.floor(Math.random() * 9_000);

  const data = await callApi("/customers/signup.json", {
    username: profile.username,
    passwd: profile.passwd,
    name: profile.name,
    company: profile.company ?? "",
    "address-line-1": profile.addressLine1,
    city: profile.city,
    state: profile.state ?? "",
    country: profile.country,
    zipcode: profile.zipcode,
    "phone-cc": profile.phoneCc,
    "phone": profile.phone,
    "lang-pref": "en",
  });
  const id = Number(data["customer-id"]);
  if (!Number.isFinite(id)) {
    throw new ResellerClubError("ResellerClub did not return a customer id.", "bad-response");
  }
  return id;
}

/** Existing ResellerClub customer id for a username (email), if any. */
export async function getCustomerByUsername(username: string): Promise<number | null> {
  if (getMode() === "mock") return null;
  try {
    const data = await callApi("/customers/details.json", { username }, { method: "GET" });
    const id = Number(data["customer-id"]);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/** Adds a contact (WHOIS record) for a customer; returns the contact id. */
export async function addContact(customerId: number, contact: ResellerContact): Promise<number> {
  if (getMode() === "mock") return 900_000 + Math.floor(Math.random() * 9_000);

  const data = await callApi("/contacts/add.json", {
    "customer-id": customerId,
    name: contact.name,
    company: contact.company ?? "",
    email: contact.email,
    "address-line-1": contact.addressLine1,
    city: contact.city,
    state: contact.state ?? "",
    country: contact.country,
    zipcode: contact.zipcode,
    "phone-cc": contact.phoneCc,
    phone: contact.phone,
    type: "Contact",
  });
  const id = Number(data["contact-id"]);
  if (!Number.isFinite(id)) {
    throw new ResellerClubError("ResellerClub did not return a contact id.", "bad-response");
  }
  return id;
}

export type RegisterDomainResult = {
  status: "SUCCESS";
  rcOrderId: number;
};

export type RegisterDomainInput = {
  domain: string;
  years: number;
  nameservers: string[];
  customerId: number;
  contactId: number;
};

/**
 * domains/register.json — the call that actually buys the domain.
 * Runs ONLY after payment has been verified server-side.
 */
export async function registerDomain(input: RegisterDomainInput): Promise<RegisterDomainResult> {
  if (getMode() === "mock") {
    return { status: "SUCCESS", rcOrderId: 1_000_000 + Math.floor(Math.random() * 8_999_999) };
  }

  const privacy = (process.env.DOMAIN_PRIVACY ?? "false").toLowerCase() === "true";
  const data = await callApi("/domains/register.json", {
    "domain-name": input.domain,
    years: input.years,
    ns: input.nameservers.slice(0, 13),
    "customer-id": input.customerId,
    "reg-contact-id": input.contactId,
    "admin-contact-id": input.contactId,
    "tech-contact-id": input.contactId,
    "billing-contact-id": input.contactId,
    "invoice-option": "KeepInvoice",
    ...(privacy ? { "purchase-privacy": "true" } : {}),
  });

  const rcOrderId = Number(data["order-id"] ?? data.orderid);
  const status = String(data.status ?? "").toLowerCase();
  if (status === "success" && Number.isFinite(rcOrderId)) {
    return { status: "SUCCESS", rcOrderId };
  }
  // Some responses only carry the order id.
  if (Number.isFinite(rcOrderId)) return { status: "SUCCESS", rcOrderId };
  throw new ResellerClubError(
    `Registration rejected: ${String(data.errorstr ?? data.errorcode ?? "no order id")}`,
    "bad-response",
  );
}

/** domains/details.json — live registration status/expiry for an order id. */
export async function getDomainDetails(rcOrderId: number): Promise<{
  status?: string;
  expiryDate?: string;
  liveExpiry?: string;
}> {
  if (getMode() === "mock") return { status: "Active" };
  const data = await callApi(
    "/domains/details.json",
    { "order-id": rcOrderId, options: "OrderDetails" },
    { method: "GET" },
  );
  return {
    status: data.status ? String(data.status) : undefined,
    expiryDate: data["expiry-date"] ? String(data["expiry-date"]) : undefined,
    liveExpiry: data["end-date"] ? String(data["end-date"]) : undefined,
  };
}

/** Default name servers for new domains; falls back to DOMAIN_DEFAULT_NS. */
export function defaultNameservers(): string[] {
  const raw = process.env.DOMAIN_DEFAULT_NS ?? "ns1.resellerclub.com,ns2.resellerclub.com";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list.slice(0, 13) : ["ns1.resellerclub.com", "ns2.resellerclub.com"];
}
