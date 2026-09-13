import type { VoiceGender } from "@/lib/personas";

// Same rationale as app/page.tsx's getVoiceForGender: browsers don't expose
// gender on a voice, so this is a best-effort classification combining
// known desktop voice names with the literal "female"/"male" substring
// Android/Chrome's local TTS voices embed in their internal names (e.g.
// "en-us-x-sfg#female_1-local"). The named lists are English-specific but
// harmless to check for other languages too — they simply won't match.
const MALE_NAMES = ["Guy", "David", "Daniel", "Alex", "Google UK English Male", "Fred", "Mark", "Ryan", "Tom"];
const FEMALE_NAMES = [
  "Aria",
  "Jenny",
  "Samantha",
  "Zira",
  "Susan",
  "Karen",
  "Linda",
  "Google UK English Female",
  "Google US English Female",
  "Victoria",
  "Fiona",
  "Moira",
  "Tessa",
];

function classify(voice: SpeechSynthesisVoice): "male" | "female" | null {
  const n = voice.name.toLowerCase();
  // "female" checked first: it's a substring of "male", so a naive
  // male-only check would misclassify a female-labeled voice.
  if (n.includes("female")) return "female";
  if (n.includes("male")) return "male";
  if (MALE_NAMES.some((name) => voice.name.includes(name))) return "male";
  if (FEMALE_NAMES.some((name) => voice.name.includes(name))) return "female";
  return null;
}

/**
 * Candidate voices for a language + broad gender category, for the user to
 * preview and pick a specific "tone" from. Falls back to every voice in
 * that language if none could be confidently classified, and further to
 * every voice at all if the device has none installed for that language,
 * so there's always something to choose from.
 */
export function getVoicesForGender(gender: VoiceGender, languageCode: string): SpeechSynthesisVoice[] {
  const allVoices = window.speechSynthesis.getVoices();
  // Match on the primary language subtag (e.g. "es" from "es-ES") rather
  // than the exact region, since a device's installed voice might be a
  // different regional variant (e.g. "es-MX") than the one requested.
  const primary = languageCode.split("-")[0].toLowerCase();
  const inLanguage = allVoices.filter((v) => v.lang.toLowerCase().startsWith(primary));
  const pool = inLanguage.length > 0 ? inLanguage : allVoices;

  // No mainstream engine has a dedicated child voice — offer the
  // female-leaning pool as candidates, same rationale as personas.ts.
  const wanted = gender === "child" ? "female" : gender;
  const matches = pool.filter((v) => classify(v) === wanted);
  return matches.length > 0 ? matches : pool;
}
