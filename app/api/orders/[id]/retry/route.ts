import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { provisionOrder } from "@/lib/register-domain";

/**
 * POST /api/orders/[id]/retry — manual retry for FAILED registrations
 * (failed items are never retried automatically to avoid hammering the
 * registry; the customer or admin triggers this explicitly).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Sign in to manage this order." }, { status: 401 });

  const prisma = getPrisma();

  const found = await prisma.order.findFirst({ where: { id, email }, select: { id: true, status: true } });
  if (!found) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (found.status !== "PAID") {
    return NextResponse.json({ error: "Only paid orders can be retried." }, { status: 409 });
  }

  // failed → pending, then provision again.
  await prisma.orderItem.updateMany({
    where: { orderId: id, status: "failed" },
    data: { status: "pending", lastError: null },
  });
  const result = await provisionOrder(id);
  return NextResponse.json({ ok: true, registration: result });
}
