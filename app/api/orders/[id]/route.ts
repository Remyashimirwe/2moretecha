import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { provisionOrder } from "@/lib/register-domain";

/**
 * GET /api/orders/[id] — public, unguessable id (cuid).
 * Used by the order status page to poll payment + registration progress.
 * Also retries provisioning for PAID orders with unfinished items (cheap,
 * idempotent, item-level claims prevent double registration).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const accountEmail = session?.user?.email?.trim().toLowerCase();
  const prisma = getPrisma();

  const order = await prisma.order.findFirst({
    where: { id, ...(accountEmail ? { email: accountEmail } : {}) },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paymentProvider: true,
      createdAt: true,
      items: {
        select: {
          domain: true,
          tld: true,
          years: true,
          amount: true,
          status: true,
          rcOrderId: true,
          registeredAt: true,
          expiresAt: true,
          lastError: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Background retry: PAID but items unfinished → try to register now.
  if (order.status === "PAID" && order.items.some((i) => i.status !== "active")) {
    try {
      await provisionOrder(order.id);
    } catch (err) {
      console.error("[orders] provisioning retry failed:", err);
    }
    const refreshed = await prisma.order.findFirst({
      where: { id, ...(accountEmail ? { email: accountEmail } : {}) },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paymentProvider: true,
        createdAt: true,
        items: {
          select: {
            domain: true,
            tld: true,
            years: true,
            amount: true,
            status: true,
            rcOrderId: true,
            registeredAt: true,
            expiresAt: true,
            lastError: true,
          },
        },
      },
    });
    if (refreshed) return NextResponse.json(refreshed, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}
