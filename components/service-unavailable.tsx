import Link from "next/link";

export default function ServiceUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Service management</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <section className="rounded-2xl border border-deep-blue/10 bg-white/90 p-6 shadow-sm sm:p-8">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Integration unavailable</span>
        <h2 className="mt-4 text-lg font-semibold text-navy-950">No service records to show</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          This project does not yet have a connected provider or database records for {title.toLowerCase()}. We haven’t created sample services or actions that could imply the service is active.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account/support" className="inline-flex min-h-10 items-center rounded-xl bg-deep-blue px-4 py-2 text-sm font-semibold text-white hover:bg-navy-950">Contact support</Link>
          <Link href="/account" className="inline-flex min-h-10 items-center rounded-xl border border-deep-blue/15 bg-white px-4 py-2 text-sm font-semibold text-deep-blue hover:bg-brand-50">Back to overview</Link>
        </div>
      </section>
    </div>
  );
}
