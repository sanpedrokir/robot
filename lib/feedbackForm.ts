import type { Browser, ElementHandle } from "puppeteer-core";
import { isServerlessHosting } from "./runtimeEnv";

// This targets one specific, fixed FormSG form — its field IDs are stable
// for a published form (FormSG never renumbers existing fields), so we
// select by them directly instead of by label text. FormSG responses are
// end-to-end encrypted client-side before submission, and there's no public
// API for submitting on a form's behalf (only for decrypting webhooks as the
// form owner) — so this drives the real form page in a real browser instead
// of trying to replicate that encryption ourselves.
const FORM_URL = "https://form.gov.sg/6aa142967686add66dc6cb3f";
const NAME_FIELD_ID = "6aa142ad00beac544cb13384";
const EMAIL_FIELD_ID = "6aa142ad00beac544cb13385";
const FEEDBACK_FIELD_ID = "6aa142ad00beac544cb13388";

function byId(id: string) {
  return `[id="${id}"]`;
}

// Unlike WhatsApp, this doesn't need a persistent session across requests —
// just a Chrome binary for the few seconds it takes to fill and submit. AWS
// Lambda (Amplify's SSR compute) has no bundled desktop Chrome, so there we
// launch @sparticuz/chromium's Lambda-packaged binary via puppeteer-core
// instead; everywhere else (local dev, EC2, the robot) the full `puppeteer`
// package's own downloaded Chrome is simpler and works fine.
async function launchBrowser(): Promise<Browser> {
  if (isServerlessHosting) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as unknown as Promise<Browser>;
}

// @sparticuz/chromium on Amplify's Lambda runtime is untested in production
// (verified locally and via documentation, not against real Amplify infra),
// so keep a manual kill switch to disable it there without a code change if
// it turns out not to work in practice — mirrors DISABLE_WHATSAPP.
export const isFeedbackFormAvailable = (process.env.DISABLE_FEEDBACK_FORM ?? "").trim().toLowerCase() !== "true";

export async function submitFeedbackForm(input: {
  name: string;
  email: string;
  feedbackDetail: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.goto(FORM_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector(byId(NAME_FIELD_ID), { timeout: 30000 });

    await page.type(byId(NAME_FIELD_ID), input.name, { delay: 5 });
    await page.type(byId(EMAIL_FIELD_ID), input.email, { delay: 5 });
    await page.type(byId(FEEDBACK_FIELD_ID), input.feedbackDetail, { delay: 5 });

    const submitButton = await page.evaluateHandle(() =>
      [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Submit now"))
    );
    const buttonEl = submitButton.asElement() as ElementHandle<Element> | null;
    if (!buttonEl) {
      return { ok: false, reason: "Couldn't find the form's submit button — its layout may have changed." };
    }

    const disabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, buttonEl);
    if (disabled) {
      return {
        ok: false,
        reason: "The form rejected one of the values (e.g. an invalid email address) — please try again.",
      };
    }

    await buttonEl.click();

    // FormSG shows a "Thank you" confirmation after a successful submit.
    const confirmed = await page
      .waitForFunction(() => document.body.innerText.toLowerCase().includes("thank you"), { timeout: 20000 })
      .then(() => true)
      .catch(() => false);

    if (!confirmed) {
      return {
        ok: false,
        reason: "Submitted, but couldn't confirm the form accepted it — please check manually.",
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Failed to submit the form." };
  } finally {
    await browser.close();
  }
}
