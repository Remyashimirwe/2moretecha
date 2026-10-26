import { NextRequest, NextResponse } from "next/server";
import { createCheckout, type CheckoutContactInput, type CheckoutItemInput } from "@/lib/checkout";

/**
 * POST /api/checkout
 * Body: { contact: {...}, items: [{ domain, years }] }
 *
 * Server re-validates, re-checks availability and re-prices everything,
 * then creates a PENDING order + the payment order (PayPal or simulated).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { contact, items } = (body ?? {}) as {
    contact?: CheckoutContactInput;
    items?: CheckoutItemInput[];
  };

  try {
    const result = await createCheckout({
      contact: contact as CheckoutContactInput,
      items: items ?? [],
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[checkout] error:", err);
    const message =
      err instanceof Error && /ResellerClub|registry/i.test(err.message)
        ? "We couldn’t verify domain availability right now. Please try again in a moment."
        : "Something went wrong creating your order. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
