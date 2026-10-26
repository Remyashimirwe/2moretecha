import { NextRequest, NextResponse } from "next/server";
import { getPaypalOrderCustomId, getPaymentMode, verifyWebhookSignature } from "@/lib/paypal";
import { fulfillOrder } from "@/lib/register-domain";

/**
 * POST /api/paypal/webhook
 *
 * Defense in depth: PayPal's servers tell us a payment really completed
 * (the capture endpoint verifies independently). Every event is
 * signature-verified, then run through the same idempotent fulfill pipeline,
 * so duplicates and ordering issues are harmless.
 *
 * Setup: PayPal Dashboard → Webhooks → create webhook for
 * PAYMENT.CAPTURE.COMPLETED (+ CHECKOUT.ORDER.COMPLETED) pointing at
 * https://yourdomain/api/paypal/webhook, then put its id in PAYPAL_WEBHOOK_ID.
 */
type PaypalEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    state?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

export async function POST(request: NextRequest) {
  if (getPaymentMode() === "mock") {
    // Simulated payments have no webhooks; acknowledge blindly.
    return NextResponse.json({ ignored: "mock-mode" });
  }

  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let verified = false;
  try {
    verified = await verifyWebhookSignature(headers, raw);
  } catch (err) {
    console.error("[webhook] verification error:", err);
  }
  if (!verified) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: PaypalEvent;
  try {
    event = JSON.parse(raw) as PaypalEvent;
  } catch {
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  const type = event.event_type ?? "";
  const relevant =
    type.includes("CAPTURE.COMPLETED") || type.includes("ORDER.COMPLETED");
  if (!relevant) {
    return NextResponse.json({ ignored: type });
  }

  // Find OUR order id: capture events carry custom_id directly or via the
  // parent PayPal order.
  let ourOrderId: string | null = event.resource?.custom_id ?? null;
  if (!ourOrderId) {
    const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
    if (paypalOrderId) {
      try {
        ourOrderId = await getPaypalOrderCustomId(paypalOrderId);
      } catch (err) {
        console.error("[webhook] could not resolve paypal order:", err);
      }
    }
  }
  if (!ourOrderId) {
    return NextResponse.json({ ignored: "no custom_id" });
  }

  try {
    const paymentRef = event.resource?.id ?? "webhook";
    const result = await fulfillOrder(ourOrderId, paymentRef);
    return NextResponse.json({ ok: true, orderId: ourOrderId, registration: result });
  } catch (err) {
    console.error("[webhook] fulfillment error:", err);
    // 200 anyway: PayPal would retry forever on 5xx; our capture endpoint
    // and the order page poller both retry provisioning idempotently.
    return NextResponse.json({ ok: false, deferred: true });
  }
}
