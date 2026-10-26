import { requireAccountUser } from "@/lib/account";
import { getPrisma } from "@/lib/prisma";
import SupportCenter from "@/components/support-center";

export default async function SupportPage() {
  const user = await requireAccountUser();
  const tickets = await getPrisma().supportTicket.findMany({
    where: { userId: user.id }, orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return <div className="mx-auto max-w-6xl space-y-7">
    <header><p className="text-sm font-semibold text-sky-700">HELP CENTER</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Support</h1><p className="mt-2 text-slate-600">Ask our team about your account, domains, services, or a payment.</p></header>
    <SupportCenter initialTickets={tickets.map((ticket) => ({ ...ticket, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString(), messages: ticket.messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })) }))} />
  </div>;
}
