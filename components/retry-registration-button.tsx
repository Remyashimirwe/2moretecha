"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryRegistrationButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/retry`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not retry registration.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={retry} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-deep-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-950 disabled:cursor-wait disabled:opacity-60">
        {busy ? "Retrying…" : "Retry registration"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
