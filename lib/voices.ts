import type { VoiceGender } from "@/lib/personas";

// Same rationale as app/page.tsx's getVoiceForGender: browsers don't expose
// gender on a voice, so this is a best-effort classification combining
// known desktop voice names with the literal "female"/"male" substring
// Android/Chrome's local TTS voices embed in their internal names (e.g.
// "en-us-x-sfg#female_1-local"), plus naming conventions for other
// languages' common neural voices, where a literal "female"/"male"
// substring is never present at all (e.g. Microsoft/Edge's Mandarin
// voices — "Xiaoxiao", "Yunxi" — carry no such marker, so without this
// they'd all classify as unknown and the picker would fall back to an
// unfiltered, gender-mixed list regardless of what was requested).
const MALE_NAMES = [
  "Guy",
  "David",
  "Daniel",
  "Alex",
  "Google UK English Male",
  "Fred",
  "Mark",
  "Ryan",
  "Tom",
  // Microsoft/Edge Mandarin (zh-CN) neural voices are conventionally
  // named "Yun*" for male, "Xiao*" for female (see FEMALE_NAMES).
  "Yun",
  // Microsoft/Edge Cantonese (zh-HK) male neural voice.
  "WanLung",
];
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
  "Xiao",
  "HiuMaan",
  "HiuGaai",
];

export function classifyVoiceGender(voice: SpeechSynthesisVoice): "male" | "female" | null {
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

/** At most this many tones are ever offered — plenty to compare without an unwieldy list. */
const MAX_TONES = 4;

/**
 * Candidate voices for a language + broad gender category, for the user to
 * preview and pick a specific "tone" from — strictly gender-matched, never
 * an unfiltered "here's everything" fallback: a "Male voice" selection
 * should never surface a voice classified as female, even if that means
 * offering fewer tones (down to zero) than the device actually has
 * installed for that language.
 */
export function getVoicesForGender(gender: VoiceGender, languageCode: string): SpeechSynthesisVoice[] {
  const pool = findVoicesForLanguage(window.speechSynthesis.getVoices(), languageCode);

  // No mainstream engine has a dedicated child voice — offer the
  // female-leaning pool as candidates, same rationale as personas.ts.
  const wanted = gender === "child" ? "female" : gender;
  return pool.filter((v) => classifyVoiceGender(v) === wanted).slice(0, MAX_TONES);
}
