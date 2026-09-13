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
 * Picks the best-matching pool of voices for a language code: an exact
 * regional match first, then any voice sharing just the primary subtag
 * (e.g. "es" from "es-ES", to still match an "es-MX" voice), then every
 * voice as a last resort. The exact match matters most for language pairs
 * that share a primary subtag but aren't mutually intelligible — "zh-HK"
 * (Cantonese) vs "zh-CN" (Mandarin) — where falling back to prefix
 * matching alone would happily hand a Cantonese persona a Mandarin voice.
 */
export function findVoicesForLanguage(voices: SpeechSynthesisVoice[], languageCode: string): SpeechSynthesisVoice[] {
  const lower = languageCode.toLowerCase();
  const exact = voices.filter((v) => v.lang.toLowerCase() === lower);
  if (exact.length > 0) return exact;

  const primary = lower.split("-")[0];
  const inLanguage = voices.filter((v) => v.lang.toLowerCase().startsWith(primary));
  return inLanguage.length > 0 ? inLanguage : voices;
}

export type GenderedVoices = {
  voices: SpeechSynthesisVoice[];
  /** False when none of the returned voices could be confidently classified as the requested gender — they're just every voice available in that language, unfiltered, so the UI shouldn't claim they're all e.g. "female". */
  confident: boolean;
};

/**
 * Candidate voices for a language + broad gender category, for the user to
 * preview and pick a specific "tone" from. Falls back to every voice in
 * that language if none could be confidently classified — flagged via
 * `confident: false` so callers can be honest about it rather than
 * silently presenting an unfiltered list as if it were gender-matched
 * (classification is a name-string heuristic and often has nothing to go
 * on for non-English voice names).
 */
export function getVoicesForGender(gender: VoiceGender, languageCode: string): GenderedVoices {
  const pool = findVoicesForLanguage(window.speechSynthesis.getVoices(), languageCode);

  // No mainstream engine has a dedicated child voice — offer the
  // female-leaning pool as candidates, same rationale as personas.ts.
  const wanted = gender === "child" ? "female" : gender;
  const matches = pool.filter((v) => classify(v) === wanted);
  return matches.length > 0 ? { voices: matches, confident: true } : { voices: pool, confident: false };
}
