import fs from "fs/promises";
import path from "path";

// A simple local address book: { "Name": "+65XXXXXXXX" }. Edit
// data/contacts.json directly to add friends — no code changes needed.
const CONTACTS_FILE = path.join(process.cwd(), "data", "contacts.json");

export async function findContactNumber(name: string): Promise<string | null> {
  let contacts: Record<string, string>;
  try {
    const raw = await fs.readFile(CONTACTS_FILE, "utf-8");
    contacts = JSON.parse(raw);
  } catch {
    return null;
  }

  const key = Object.keys(contacts).find(
    (candidate) => candidate.trim().toLowerCase() === name.trim().toLowerCase()
  );
  return key ? contacts[key] : null;
}

// WhatsApp's "click to chat" link only accepts digits (with country code,
// no "+", spaces, or dashes), so we strip everything else here.
export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
