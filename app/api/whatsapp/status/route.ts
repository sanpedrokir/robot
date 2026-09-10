import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp";

// Polled by the frontend to show "scan this QR code" or "connected".
// The first call lazily starts the WhatsApp client/browser session.
export async function GET() {
  const status = getWhatsAppStatus();
  return NextResponse.json(status);
}
