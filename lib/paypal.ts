/**
 * Server-only payment service: PayPal Checkout (Orders v2) + a simulated
 * "mock" mode so checkout can be built and tested before PayPal credentials
 * exist (same pattern as the ResellerClub client).
 *
 * SECURITY RULES encoded here:
 *  - PayPal secrets never leave the server.
 *  - capturePaymentOrder() re-verifies status/amount/currency/custom_id
 *    against OUR order before anything is marked paid.
 *  - Webhook signatures are verified before they can move an order.
 */

const PAYPAL_HOSTS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

export type PaymentMode = "paypal" | "mock";

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: "not-configured" | "network" | "verification" | "api",
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function isPlaceholder(v: string): boolean {
  if (!v) return true;
  const n = v.toLowerCase().replace(/[^a-z0-9]/g, "");
  return n.startsWith("your") || n.includes("example");
}

function paypalCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = env("PAYPAL_CLIENT_ID");
  const clientSecret = env("PAYPAL_CLIENT_SECRET");
  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) return null;
  return { clientId, clientSecret };
}

export function getPaymentMode(): PaymentMode {
  const forced = env("PAYMENT_MODE").toLowerCase();
  if (forced === "mock") return "mock";
  if (forced === "paypal") return "paypal";
  return paypalCreds() ? "paypal" : "mock";
}

function apiHost(): string {
  return env("PAYPAL_MODE").toLowerCase() === "live" ? PAYPAL_HOSTS.live : PAYPAL_HOSTS.sandbox;
}

function appUrl(): string {
  return (env("APP_URL") || "http://localhost:3000").replace(/\/$/, "");
}

/** Minor units (cents) → PayPal decimal string. */
export function minorToMajor(minor: number): string {
  return (minor / 100).toFixed(2);
}

/* ------------------------------------------------------------------ *
 * Access token (cached)
 * ------------------------------------------------------------------ */

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const creds = paypalCreds();
  if (!creds) throw new PaymentError("PayPal credentials are not configured.", "not-configured");

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`${apiHost()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new PaymentError(
      `Could not reach PayPal: ${err instanceof Error ? err.message : String(err)}`,
      "network",
    );
  }
  if (!res.ok) throw new PaymentError(`PayPal auth failed (HTTP ${res.status}).`, "api");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return tokenCache.token;
}

async function paypalPost<T>(path: string, body: unknown): Promise<T> {
  return paypalRequest<T>(path, "POST", body);
}

async function paypalGet<T>(path: string): Promise<T> {
  return paypalRequest<T>(path, "GET");
}

async function paypalRequest<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${apiHost()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new PaymentError(
      `Could not reach PayPal: ${err instanceof Error ? err.message : String(err)}`,
      "network",
    );
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = (json.message as string) ?? (json.name as string) ?? `HTTP ${res.status}`;
    throw new PaymentError(`PayPal API error: ${detail}`, "api");
  }
  return json as T;
}

/** Fetch our custom_id (internal order id) from a PayPal order. */
export async function getPaypalOrderCustomId(paypalOrderId: string): Promise<string | null> {
  const data = await paypalGet<{
    purchase_units?: Array<{ custom_id?: string }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
  return data.purchase_units?.[0]?.custom_id ?? null;
}

/* ------------------------------------------------------------------ *
 * Create / capture
 * ------------------------------------------------------------------ */

export type CreatePaymentInput = {
  orderId: string;
  amountMinor: number;
  currency: string;
  description: string;
};

export async function createPaymentOrder(
  input: CreatePaymentInput,
): Promise<{ paymentOrderId: string }> {
  if (getPaymentMode() === "mock") {
    return { paymentOrderId: `MOCK-${input.orderId}` };
  }

  const created = await paypalPost<{ id: string }>("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: input.orderId, // ← how a capture/webhook is tied back to OUR order
        description: input.description,
        amount: {
          currency_code: input.currency,
          value: minorToMajor(input.amountMinor),
        },
      },
    ],
    application_context: {
      brand_name: "2-MoreTechs",
      return_url: `${appUrl()}/orders/${input.orderId}`,
      cancel_url: `${appUrl()}/checkout?canceled=1`,
      user_action: "PAY_NOW",
    },
  });

  return { paymentOrderId: created.id };
}

export type CaptureResult = {
  paymentRef: string;
  payerEmail?: string;
};

/**
 * Captures the payment and VERIFIES it against our order:
 * status COMPLETED + amount + currency + custom_id must all match,
 * otherwise PaymentError("verification") is thrown and the order stays PENDING.
 */
export async function capturePaymentOrder(paymentOrderId: string, expected: {
  orderId: string;
  amountMinor: number;
  currency: string;
}): Promise<CaptureResult> {
  if (getPaymentMode() === "mock") {
    if (!paymentOrderId.startsWith(`MOCK-${expected.orderId}`)) {
      throw new PaymentError("Simulated payment does not match this order.", "verification");
    }
    return { paymentRef: `MOCKCAP-${expected.orderId.slice(-8)}` };
  }

  type CaptureResponse = {
    status: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount?: { currency_code?: string; value?: string };
        }>;
      };
    }>;
  };

  const captured = await paypalPost<CaptureResponse>(
    `/v2/checkout/orders/${encodeURIComponent(paymentOrderId)}/capture`,
    {},
  );

  if (captured.status !== "COMPLETED") {
    throw new PaymentError(`PayPal order is ${captured.status}, not COMPLETED.`, "verification");
  }

  const unit = captured.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];

  if (unit?.custom_id !== expected.orderId) {
    throw new PaymentError("Payment is not linked to this order.", "verification");
  }
  if (capture?.amount?.currency_code !== expected.currency) {
    throw new PaymentError("Payment currency does not match the order.", "verification");
  }
  const paidValue = Number(capture?.amount?.value ?? "NaN");
  if (!Number.isFinite(paidValue) || Math.round(paidValue * 100) !== expected.amountMinor) {
    throw new PaymentError("Payment amount does not match the order.", "verification");
  }
  if (capture?.status !== "CAPTURED") {
    throw new PaymentError(`Capture status is ${capture?.status ?? "unknown"}.`, "verification");
  }

  return { paymentRef: capture.id };
}

/* ------------------------------------------------------------------ *
 * Webhook verification (defense in depth on top of direct capture)
 * ------------------------------------------------------------------ */

type WebhookAuthHeaders = Record<string, string>;

/**
 * Verifies a PayPal webhook transmission with
 * POST /v1/notifications/verify-webhook-signature.
 * Requires PAYPAL_WEBHOOK_ID (Dashboard → Webhooks → your webhook id).
 */
export async function verifyWebhookSignature(
  headers: WebhookAuthHeaders,
  rawBody: string,
): Promise<boolean> {
  const webhookId = env("PAYPAL_WEBHOOK_ID");
  if (!webhookId || isPlaceholder(webhookId)) return false;

  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;

  const result = await paypalPost<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      auth_algo: lower["paypal-auth-algo"],
      cert_url: lower["paypal-cert-url"],
      transmission_id: lower["paypal-transmission-id"],
      transmission_sig: lower["paypal-transmission-sig"],
      transmission_time: lower["paypal-transmission-time"],
      webhook_event: JSON.parse(rawBody),
      webhook_id: webhookId,
    },
  );
  return result.verification_status === "SUCCESS";
}
