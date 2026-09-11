import { Client, LocalAuth } from "whatsapp-web.js";
import QRCode from "qrcode";

// A real, persistently logged-in WhatsApp Web session, driven by an
// unofficial library (whatsapp-web.js -> Puppeteer). This lets Milo send
// WhatsApp messages autonomously, with no human review step — that's a
// deliberate, explicit choice the user made, understanding the tradeoffs:
// it's against WhatsApp's Terms of Service and risks the account being
// flagged, and there's no undo once a message is sent.
//
// The login session lives in .wwebjs_auth/ (gitignored — never commit it,
// it's equivalent to a live login credential for the linked account).

type WhatsAppStatus = "idle" | "starting" | "qr" | "ready" | "error" | "disabled";

type WhatsAppState = {
  client: Client | null;
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  error: string | null;
};

// Stored on globalThis so the client survives Next.js dev-mode module
// reloads instead of spinning up a new browser session on every edit.
const globalForWhatsApp = globalThis as unknown as { __miloWhatsApp?: WhatsAppState };

function getState(): WhatsAppState {
  if (!globalForWhatsApp.__miloWhatsApp) {
    globalForWhatsApp.__miloWhatsApp = {
      client: null,
      status: "idle",
      qrDataUrl: null,
      error: null,
    };
  }
  return globalForWhatsApp.__miloWhatsApp;
}

// whatsapp-web.js needs a real, persistently-running headless Chrome plus an
// on-disk login session that survives between requests — neither of which
// exist on serverless hosting. AWS Lambda (which powers Amplify's SSR
// hosting compute under the hood) always sets AWS_LAMBDA_FUNCTION_NAME in
// its runtime automatically, with no console configuration required — so
// this detects "running on Amplify" reliably even if a manually-set env
// var gets lost or mistyped. DISABLE_WHATSAPP=true remains as a manual
// override for any other host where this should stay off. Everywhere else
// (local dev, an EC2 box, the robot itself) WhatsApp stays enabled.
const isDisabled =
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  (process.env.DISABLE_WHATSAPP ?? "").trim().toLowerCase() === "true";

function startClient(): WhatsAppState {
  const state = getState();
  if (isDisabled) {
    state.status = "disabled";
    return state;
  }
  if (state.client) return state;

  state.status = "starting";
  state.error = null;

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  });

  client.on("qr", (qr) => {
    QRCode.toDataURL(qr)
      .then((dataUrl) => {
        state.qrDataUrl = dataUrl;
        state.status = "qr";
      })
      .catch(() => {
        state.status = "error";
        state.error = "Failed to render QR code.";
      });
  });

  client.on("ready", () => {
    state.status = "ready";
    state.qrDataUrl = null;
  });

  client.on("auth_failure", (message) => {
    state.status = "error";
    state.error = message;
  });

  client.on("disconnected", () => {
    state.status = "idle";
    state.client = null;
    client.destroy().catch(() => {});
  });

  client.initialize().catch((err) => {
    state.status = "error";
    state.error = err instanceof Error ? err.message : String(err);
  });

  state.client = client;
  return state;
}

export const isWhatsAppAvailable = !isDisabled;

export function getWhatsAppStatus() {
  const state = startClient();
  return { status: state.status, qrDataUrl: state.qrDataUrl, error: state.error };
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const state = startClient();
  if (state.status === "disabled") {
    return { ok: false, reason: "WhatsApp isn't available on this deployment." };
  }
  if (state.status !== "ready" || !state.client) {
    return { ok: false, reason: "WhatsApp isn't connected yet — scan the QR code first." };
  }

  const digits = phoneNumber.replace(/\D/g, "");

  try {
    const numberId = await state.client.getNumberId(digits);
    if (!numberId) {
      return { ok: false, reason: "That number doesn't appear to be on WhatsApp." };
    }
    await state.client.sendMessage(numberId._serialized, message);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Failed to send." };
  }
}
