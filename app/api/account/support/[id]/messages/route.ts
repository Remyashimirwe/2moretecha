import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request, context: RouteContext<"/api/account/support/[id]/messages">) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return Response.json({ error: "Ticket not found." }, { status: 404 });
  const ticket = await prisma.supportTicket.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true } });
  if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
  if (ticket.status === "CLOSED") return Response.json({ error: "This ticket is closed." }, { status: 409 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 2 || message.length > 5000) return Response.json({ error: "Message must be 2–5,000 characters." }, { status: 400 });
  const [, result] = await prisma.$transaction([
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } }),
    prisma.supportTicketMessage.create({ data: { ticketId: ticket.id, sender: "CUSTOMER", body: message } }),
  ]);
  return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
}
