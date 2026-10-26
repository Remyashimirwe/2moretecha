import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { capturePaymentOrder, PaymentError } from "@/lib/paypal";
import { fulfillOrder, provisionOrder } from "@/lib/register-domain";

/**
 * POST /api/checkout/[id]/capture
 *
 * Captures the payment FOR THIS ORDER server-side and verifies
 * status + amount + currency + custom_id before marking it PAID and
 * provisioning the domains. The browser's "success" page alone can never
 * move an order forward — only this endpoint (or the webhook) can.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prisma = getPrisma();

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Idempotent: already paid (double click, or webhook got there first).
  if (order.status === "PAID") {
    return NextResponse.json({ orderId: order.id, status: "PAID", alreadyPaid: true });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: `Order is ${order.status} and cannot be captured.` },
      { status: 409 },
    );
  }
  if (!order.paymentOrderId) {
    return NextResponse.json({ error: "No payment is attached to this order." }, { status: 409 });
  }

  /* 1. Capture + verify (throws PaymentError on any mismatch) */
  let paymentRef: string;
  try {
    const captured = await capturePaymentOrder(order.paymentOrderId, {
      orderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
    });
    paymentRef = captured.paymentRef;
  } catch (err) {
    if (err instanceof PaymentError) {
      const status =
        err.code === "verification" ? 402 : err.code === "not-configured" ? 503 : 502;
      console.error(`[capture] ${err.code}: ${err.message}`);
      return NextResponse.json(
        { error: err.code === "verification" ? "Payment could not be verified." : err.message },
        { status },
      );
    }
    console.error("[capture] unexpected:", err);
    return NextResponse.json({ error: "Payment failed unexpectedly." }, { status: 500 });
  }

  /* 2. Mark PAID (idempotent) + provision domains */
  try {
    const provision = await fulfillOrder(order.id, paymentRef);
    return NextResponse.json({
      orderId: order.id,
      status: "PAID",
      registration: provision,
    });
  } catch (err) {
    // Money captured but provisioning crashed — order stays PAID/verifiable;
    // the status page keeps retrying via /api/orders/[id].
    console.error("[capture] provisioning error:", err);
    return NextResponse.json({
      orderId: order.id,
      status: "PAID",
      registration: { registered: 0, failed: 0, remaining: order.items.length },
      warning: "Payment received — registration is still processing.",
    });
  }
}

/**
 * GET /api/checkout/[id]/capture — not supported; use GET /api/orders/[id].
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Convenience for the order page poller: if an order is PAID but has
  // pending items (e.g. a previous provisioning attempt failed), retry now.
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "PAID" && order.items.some((i) => i.status !== "active")) {
    await provisionOrder(order.id);
  }
  return NextResponse.json({ ok: true });
}
