import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

const services = ["DOMAINS", "HOSTING", "BUSINESS_EMAIL", "SSL_SECURITY", "BILLING", "ACCOUNT", "OTHER"] as const;

async function currentUser() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return getPrisma().user.findUnique({ where: { email }, select: { id: true } });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const tickets = await getPrisma().supportTicket.findMany({
    where: { userId: user.id }, orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return Response.json(tickets, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const service = input.service;
  if (subject.length < 5 || subject.length > 160 || message.length < 10 || message.length > 5000 || !services.includes(service as typeof services[number])) {
    return Response.json({ error: "Enter a subject, service, and message (10–5,000 characters)." }, { status: 400 });
  }
  const ticket = await getPrisma().supportTicket.create({
    data: { userId: user.id, subject, service: service as typeof services[number], messages: { create: { body: message, sender: "CUSTOMER" } } },
    include: { messages: true },
  });
  return Response.json(ticket, { status: 201, headers: { "Cache-Control": "no-store" } });
}
