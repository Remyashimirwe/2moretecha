"use client";

import { useState } from "react";

function Icon({ name }: { name: "message" | "ticket" | "send" }) {
  const paths = {
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
    ticket: <><path d="M2 9a3 3 0 0 0 0 6v4h20v-4a3 3 0 0 1 0-6V5H2z" /><path d="M13 5v2m0 4v2m0 4v2" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">{paths[name]}</svg>;
}

type Message = { id: string; sender: "CUSTOMER" | "SUPPORT"; body: string; createdAt: string };
type Ticket = { id: string; subject: string; service: string; status: string; createdAt: string; updatedAt: string; messages: Message[] };
const serviceLabels: Record<string, string> = { DOMAINS: "Domains", HOSTING: "Hosting", BUSINESS_EMAIL: "Business email", SSL_SECURITY: "SSL & security", BILLING: "Billing", ACCOUNT: "Account", OTHER: "Other" };
const statusLabels: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In progress", WAITING_FOR_CUSTOMER: "Waiting for you", CLOSED: "Closed" };

export default function SupportCenter({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = tickets.find((ticket) => ticket.id === selectedId);

  async function submit(event: React.FormEvent<HTMLFormElement>, mode: "new" | "reply") {
    event.preventDefault(); setBusy(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const values = mode === "new"
      ? { subject: form.get("subject"), service: form.get("service"), message: form.get("message") }
      : { message: form.get("message") };
    try {
      const response = mode === "new" ? await fetch("/api/account/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })
        : await fetch(`/api/account/support/${selectedId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send your message.");
      if (mode === "new") { setTickets((current) => [result, ...current]); setSelectedId(result.id); }
      else setTickets((current) => current.map((ticket) => ticket.id === selectedId ? { ...ticket, updatedAt: new Date().toISOString(), messages: [...ticket.messages, result] } : ticket));
      event.currentTarget.reset(); setNotice("Your message has been sent.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not send your message."); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Icon name="message" /> Your conversations</h2>
      {tickets.length ? <div className="mt-4 space-y-2">{tickets.map((ticket) => <button key={ticket.id} onClick={() => { setSelectedId(ticket.id); setNotice(""); }} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === ticket.id ? "border-sky-300 bg-sky-50" : "border-slate-100 hover:bg-slate-50"}`}><span className="block truncate font-semibold text-slate-900">{ticket.subject}</span><span className="mt-1 flex justify-between gap-2 text-xs text-slate-500"><span>{serviceLabels[ticket.service] ?? ticket.service}</span><span>{statusLabels[ticket.status] ?? ticket.status}</span></span></button>)}</div> : <p className="mt-4 text-sm leading-6 text-slate-600">No tickets yet. Send a message and our team can follow up here.</p>}
      <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 font-semibold text-slate-900"><Icon name="ticket" /> Start a conversation</h3><form onSubmit={(event) => submit(event, "new")} className="mt-3 space-y-3"><input required minLength={5} maxLength={160} name="subject" placeholder="What do you need help with?" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" /><select name="service" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="DOMAINS">Domains</option><option value="HOSTING">Hosting</option><option value="BUSINESS_EMAIL">Business email</option><option value="SSL_SECURITY">SSL & security</option><option value="BILLING">Billing</option><option value="ACCOUNT">Account</option><option value="OTHER">Other</option></select><textarea required minLength={10} maxLength={5000} name="message" rows={3} placeholder="Describe how we can help…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" /><button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? "Sending…" : "Send to support"}</button></form></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {selected ? <><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{serviceLabels[selected.service] ?? selected.service}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{selected.subject}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabels[selected.status] ?? selected.status}</span></div><div className="max-h-[460px] min-h-40 space-y-4 overflow-y-auto py-5">{selected.messages.map((message) => <article key={message.id} className={`max-w-[90%] rounded-2xl p-4 ${message.sender === "CUSTOMER" ? "ml-auto bg-sky-50" : "bg-slate-100"}`}><p className="mb-2 text-xs font-semibold text-slate-600">{message.sender === "CUSTOMER" ? "You" : "MoreTechs Support"} · {new Date(message.createdAt).toLocaleString()}</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{message.body}</p></article>)}</div>{selected.status === "CLOSED" ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">This conversation is closed. Start a new ticket if you need more help.</p> : <form onSubmit={(event) => submit(event, "reply")} className="flex gap-2 border-t border-slate-100 pt-4"><textarea required minLength={2} maxLength={5000} name="message" rows={2} placeholder="Write a reply…" className="min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" /><button disabled={busy} aria-label="Send reply" className="self-end rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-700 disabled:opacity-60"><Icon name="send" /></button></form>}</> : <div className="flex min-h-72 flex-col items-center justify-center text-center"><Icon name="message" /><h2 className="mt-3 font-semibold text-slate-900">Your support inbox</h2><p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">Choose a conversation or send a new message to get started.</p></div>}
      {notice && <p role="status" className="mt-3 text-sm text-sky-800">{notice}</p>}
    </section>
  </div>;
}
