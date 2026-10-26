/**
 * Post-payment provisioning: verified payment → ResellerClub customer →
 * contact → domains/register.json → order ids stored.
 *
 * Guarantees:
 *  - only runs for orders whose status is PAID (payment verified server-side)
 *  - idempotent: markOrderPaid() flips PENDING→PAID exactly once (capture and
 *    webhook can both arrive), and each item is claimed (pending→registering)
 *    with a conditional update so it is never registered twice
 *  - failures are recorded per item and retried, never lost
 */
import { getPrisma } from "./prisma";
import {
  addContact,
  defaultNameservers,
  getCustomerByUsername,
  getDomainDetails,
  getMode,
  registerDomain,
  signupCustomer,
} from "./resellerclub";
import { randomBytes } from "node:crypto";

export type ProvisionResult = {
  registered: number;
  failed: number;
  remaining: number;
};

/** PENDING → PAID exactly once. Returns false if it was already handled. */
export async function markOrderPaid(orderId: string, paymentRef: string): Promise<boolean> {
  const prisma = getPrisma();
  const res = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paymentRef },
  });
  return res.count === 1;
}

/**
 * Registers every pending item of a PAID order. Safe to call repeatedly
 * (from the capture endpoint, the webhook and the status page poller).
 */
export async function provisionOrder(orderId: string): Promise<ProvisionResult> {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });

  if (!order || order.status !== "PAID") {
    return { registered: 0, failed: 0, remaining: 0 };
  }

  const customer = order.customer;
  if (!customer) {
    return { registered: 0, failed: 0, remaining: order.items.length };
  }

  const nameservers = defaultNameservers();
  const result: ProvisionResult = { registered: 0, failed: 0, remaining: 0 };
  // A "registering" item older than this is considered crashed mid-flight
  // (e.g. server restart) and gets picked up again.
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000);

  for (const item of order.items) {
    if (item.status === "active" || item.status === "failed") continue;

    // Claim the item (pending/stale → registering) — prevents double runs.
    const claimed = await prisma.orderItem.updateMany({
      where: {
        id: item.id,
        OR: [
          { status: "pending" },
          { status: "registering", updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: "registering", lastError: null },
    });
    if (claimed.count === 0) {
      if (item.status !== "active") result.remaining++;
      continue;
    }

    try {
      /* 1. ResellerClub customer */
      let rcCustomerId = customer.rcCustomerId;
      if (rcCustomerId == null) {
        try {
          rcCustomerId = await signupCustomer({
            username: customer.email,
            // Random password: we never need it again — RC owns the account auth.
            passwd: randomBytes(16).toString("base64url"),
            name: customer.name ?? customer.email,
            company: customer.company ?? undefined,
            addressLine1: customer.addressLine1 ?? "",
            city: customer.city ?? "",
            state: customer.state ?? undefined,
            country: customer.country ?? "",
            zipcode: customer.zipcode ?? "",
            phoneCc: customer.phoneCc ?? "",
            phone: customer.phone ?? "",
          });
        } catch (err) {
          // Username may already exist from an earlier attempt.
          const existing = await getCustomerByUsername(customer.email);
          if (existing == null) throw err;
          rcCustomerId = existing;
        }
        await prisma.customer.update({
          where: { id: customer.id },
          data: { rcCustomerId },
        });
      }

      /* 2. Contact (WHOIS) */
      let rcContactId = customer.rcContactId;
      if (rcContactId == null) {
        rcContactId = await addContact(rcCustomerId, {
          email: customer.email,
          name: customer.name ?? customer.email,
          company: customer.company ?? undefined,
          addressLine1: customer.addressLine1 ?? "",
          city: customer.city ?? "",
          state: customer.state ?? undefined,
          country: customer.country ?? "",
          zipcode: customer.zipcode ?? "",
          phoneCc: customer.phoneCc ?? "",
          phone: customer.phone ?? "",
        });
        await prisma.customer.update({
          where: { id: customer.id },
          data: { rcContactId },
        });
      }

      /* 3. Register the domain (payment already verified) */
      const res = await registerDomain({
        domain: item.domain,
        years: item.years,
        nameservers,
        customerId: rcCustomerId,
        contactId: rcContactId,
      });

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + item.years);

      // Best effort: pull the registry's exact expiry date in live mode.
      if (getMode() === "live") {
        try {
          const details = await getDomainDetails(res.rcOrderId);
          const raw = details.expiryDate ?? details.liveExpiry;
          if (raw) {
            const parsed = new Date(raw);
            if (!Number.isNaN(parsed.getTime())) expiresAt.setTime(parsed.getTime());
          }
        } catch {
          /* keep the computed date */
        }
      }

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          status: "active",
          rcOrderId: res.rcOrderId,
          registeredAt: now,
          expiresAt,
          lastError: null,
        },
      });
      result.registered++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { status: "failed", lastError: message.slice(0, 500) },
      });
      result.failed++;
      console.error(`[provision] ${item.domain} failed: ${message}`);
    }
  }

  return result;
}

/**
 * The full "payment verified" pipeline used by capture + webhook:
 * mark paid (idempotent) and provision what's pending.
 */
export async function fulfillOrder(orderId: string, paymentRef: string): Promise<ProvisionResult> {
  await markOrderPaid(orderId, paymentRef);
  return provisionOrder(orderId);
}
