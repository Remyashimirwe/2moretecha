import { NextResponse } from "next/server";
import { getPaymentMode } from "@/lib/paypal";

/**
 * GET /api/paypal/config — public PayPal settings for the checkout SDK.
 * The client id is public by design; the secret never leaves the server.
 */
export async function GET() {
  const mode = getPaymentMode();
  if (mode === "mock") {
    return NextResponse.json({ mode: "mock" });
  }
  const clientId = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
  const sandbox = (process.env.PAYPAL_MODE ?? "sandbox").toLowerCase() !== "live";
  return NextResponse.json({ mode: "paypal", clientId, sandbox });
}
