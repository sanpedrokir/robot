"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "starting" | "qr" | "ready" | "error" | "disabled";

export default function WhatsAppPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/whatsapp/status");
        const data = await res.json();
        if (cancelled) return;
        setStatus(data.status);
        setQrDataUrl(data.qrDataUrl);
        setError(data.error);
      } catch {
        // network hiccup — the next poll will retry
      }
    }

    poll();
    // Stop polling once connected (or disabled) — nothing left to watch for.
    const interval = setInterval(() => {
      if (status !== "ready" && status !== "disabled") poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status]);

  if (status === "disabled") {
    return null;
  }

  if (status === "ready") {
    return (
      <p className="text-xs font-medium text-emerald-700">✅ WhatsApp connected — Neo can send messages</p>
    );
  }

  if (status === "error") {
    return <p className="text-xs font-medium text-red-500">WhatsApp connection error: {error}</p>;
  }

  if (status === "qr" && qrDataUrl) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white p-3">
        <p className="text-xs text-slate-600">Scan with WhatsApp on your phone to connect:</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URL, not worth an <Image> loader */}
        <img src={qrDataUrl} alt="WhatsApp QR code" className="h-40 w-40" />
      </div>
    );
  }

  return <p className="text-xs text-slate-400">Starting WhatsApp connection…</p>;
}
