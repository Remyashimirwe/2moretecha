import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { iso, type OrderView } from "@/lib/order-view";
import OrderStatus from "@/components/order-status";

export const metadata = { title: "Order status", robots: { index: false, follow: false } };

// Payment/registration state must render fresh per request — this route is
// intentionally allowed to block instead of producing a static shell.
export const instant = false;

/**
 * Order confirmation + live registration progress.
 * Always rendered fresh from the database (never cached — payments state).
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!order) notFound();

  const view: OrderView = {
    id: order.id,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    paymentProvider: order.paymentProvider,
    createdAt: iso(order.createdAt),
    items: order.items.map((item) => ({
      domain: item.domain,
      tld: item.tld,
      years: item.years,
      amount: item.amount,
      status: item.status,
      rcOrderId: item.rcOrderId,
      registeredAt: iso(item.registeredAt),
      expiresAt: iso(item.expiresAt),
      lastError: item.lastError,
    })),
  };

  return <OrderStatus initial={view} />;
}
