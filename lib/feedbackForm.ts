import puppeteer from "puppeteer";
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

export const isFeedbackFormAvailable = !isServerlessHosting;

export async function submitFeedbackForm(input: {
  name: string;
  email: string;
  feedbackDetail: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (isServerlessHosting) {
    return { ok: false, reason: "Submitting feedback isn't available on this deployment." };
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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
    const buttonEl = submitButton.asElement();
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

    await (buttonEl as import("puppeteer").ElementHandle<Element>).click();

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
