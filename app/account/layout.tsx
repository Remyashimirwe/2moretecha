import type { ReactNode } from "react";
import { Suspense } from "react";
import { io } from "next/cache";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAccountUser } from "@/lib/account";
import { getPrisma } from "@/lib/prisma";

export const metadata = { robots: { index: false, follow: false } };

function AccountLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-sky-100" aria-hidden />
        <h1 className="mt-5 text-lg font-semibold text-slate-900">Loading your account</h1>
        <p className="mt-1 text-sm text-slate-500">Getting your dashboard ready…</p>
      </div>
    </main>
  );
}

async function AuthenticatedDashboard({ children }: { children: ReactNode }) {
  await io();
  const user = await requireAccountUser();
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const renewalCount = await getPrisma().orderItem.count({
    where: {
      status: "active",
      expiresAt: { gte: now, lte: soon },
      order: { email: user.email },
    },
  });
  const managedDomains = await getPrisma().orderItem.findMany({
    where: { order: { email: user.email } },
    orderBy: { domain: "asc" },
    distinct: ["domain"],
    select: { id: true, domain: true },
  });

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email }}
      renewalCount={renewalCount}
      managedDomains={managedDomains}
    >
      {children}
    </DashboardShell>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}
