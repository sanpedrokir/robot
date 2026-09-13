export type VoiceGender = "male" | "female" | "child";

export type Persona = {
  id: string;
  name: string;
  description: string;
  /** Short self-description used to build the chat system prompt, e.g. "a playful Maltipoo AI companion". */
  role: string;
  images: { closed: string; smile: string; talk: string };
  voiceGender: VoiceGender;
  /** A specific browser voice's voiceURI, chosen by the user from candidates for voiceGender. Falls back to auto-picking one for voiceGender if unset or no longer available. */
  voiceURI?: string;
  pitch: number;
  rate: number;
  /** BCP-47 code (e.g. "es-ES") the persona speaks/listens/replies in. Defaults to English for personas created before this existed. */
  languageCode: string;
  /** Ready to show/select. Personas awaiting art assets stay hidden until flipped on. */
  available: boolean;
};

export type Language = { code: string; label: string };

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-PT", label: "Portuguese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "zh-CN", label: "Chinese" },
  { code: "zh-HK", label: "Cantonese" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ar-SA", label: "Arabic" },
  { code: "ms-MY", label: "Malay" },
  { code: "id-ID", label: "Indonesian" },
  { code: "fil-PH", label: "Filipino (Tagalog)" },
];

export function languageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}

export const personas: Persona[] = [
  {
    id: "neo",
    name: "Neo",
    description: "Neo, your handsome robot.",
    role: "a small friendly desktop AI robot",
    images: {
      closed: "/personas/neo/closed.png",
      smile: "/personas/neo/smile.png",
      talk: "/personas/neo/talk.png",
    },
    voiceGender: "male",
    pitch: 1.15,
    rate: 1.05,
    languageCode: "en-US",
    available: true,
  },
];

export const defaultPersona = personas[0];

export function getPersona(id: string): Persona {
  return personas.find((p) => p.id === id && p.available) ?? defaultPersona;
}

/** User-created personas are id-prefixed this way (see CreatePersonaModal) — only these are deletable. */
export function isCustomPersonaId(id: string): boolean {
  return id.startsWith("custom-");
}

/** Sensible starting pitch/rate per voice gender, used for user-created custom personas. */
export const defaultVoiceParams: Record<VoiceGender, { pitch: number; rate: number }> = {
  male: { pitch: 1.15, rate: 1.05 },
  female: { pitch: 1.15, rate: 1.0 },
  child: { pitch: 1.85, rate: 1.25 },
};

const CHILD_WORDS = ["child", "kid", "toddler", "baby", "little boy", "little girl", "young boy", "young girl", "schoolboy", "schoolgirl"];
const FEMALE_WORDS = [
  "lady",
  "woman",
  "women",
  "girl",
  "female",
  "queen",
  "princess",
  "mother",
  "grandmother",
  "grandma",
  "aunt",
  "sister",
  "wife",
  "actress",
  "waitress",
  "witch",
  "fairy",
  "mermaid",
  "nun",
  "duchess",
  "empress",
  "she ",
  "her ",
];

/**
 * Best-effort guess at voice gender from a typed character description, so
 * the create-persona form can default the voice picker sensibly (e.g. to
 * Female for "a kind old lady") instead of always defaulting to Male —
 * still just a starting point the user can override in the dropdown.
 */
export function guessVoiceGenderFromText(text: string): VoiceGender {
  const lower = text.toLowerCase();
  if (CHILD_WORDS.some((w) => lower.includes(w))) return "child";
  if (FEMALE_WORDS.some((w) => lower.includes(w))) return "female";
  return "male";
}
