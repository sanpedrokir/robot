export type VoiceGender = "male" | "female" | "child";

export type Persona = {
  id: string;
  name: string;
  description: string;
  /** Short self-description used to build the chat system prompt, e.g. "a playful Maltipoo AI companion". */
  role: string;
  images: { closed: string; smile: string; talk: string };
  voiceGender: VoiceGender;
  pitch: number;
  rate: number;
  /** Ready to show/select. Personas awaiting art assets stay hidden until flipped on. */
  available: boolean;
};

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
    available: true,
  },
  {
    id: "diora",
    name: "Elodie",
    description: "Elodie, always up for a chat.",
    role: "a warm and chatty AI companion",
    images: {
      closed: "/personas/diora/closed.png",
      smile: "/personas/diora/smile.png",
      talk: "/personas/diora/talk.png",
    },
    voiceGender: "female",
    pitch: 1.15,
    rate: 1.0,
    available: true,
  },
  {
    id: "diora2",
    name: "Diora",
    description: "Diora, sweet and easygoing.",
    role: "a sweet and easygoing AI companion",
    images: {
      closed: "/personas/diora2/closed.png",
      smile: "/personas/diora2/smile.png",
      talk: "/personas/diora2/talk.png",
    },
    voiceGender: "female",
    pitch: 1.2,
    rate: 1.0,
    available: true,
  },
  {
    id: "kenny",
    name: "Kenny",
    description: "Kenny, a straight-talking guy.",
    role: "a straight-talking, no-nonsense AI companion",
    images: {
      closed: "/personas/kenny/closed.png",
      smile: "/personas/kenny/smile.png",
      talk: "/personas/kenny/talk.png",
    },
    voiceGender: "male",
    pitch: 0.85,
    rate: 0.95,
    available: true,
  },
  {
    id: "bobby",
    name: "Bobby",
    description: "Bobby, here to keep it fresh.",
    role: "a fresh, confident AI companion with rapper energy",
    images: {
      closed: "/personas/bobby/closed.png",
      smile: "/personas/bobby/smile.png",
      talk: "/personas/bobby/talk.png",
    },
    voiceGender: "male",
    pitch: 1.0,
    rate: 1.1,
    available: true,
  },
  {
    id: "james",
    name: "James",
    description: "James, a good ol' Golden Retriever.",
    role: "a loyal, friendly Golden Retriever AI companion",
    images: {
      closed: "/personas/james/closed.png",
      smile: "/personas/james/smile.png",
      talk: "/personas/james/talk.png",
    },
    voiceGender: "male",
    pitch: 1.1,
    rate: 1.0,
    available: true,
  },
  {
    id: "wolfie",
    name: "Wolfie",
    description: "Wolfie, a playful Maltipoo.",
    role: "a playful, energetic Maltipoo AI companion",
    images: {
      closed: "/personas/wolfie/closed.png",
      smile: "/personas/wolfie/smile.png",
      talk: "/personas/wolfie/talk.png",
    },
    voiceGender: "child",
    pitch: 1.85,
    rate: 1.25,
    available: true,
  },
  {
    id: "warrior",
    name: "Warrior",
    description: "Warrior, a spirited Shih Tzu.",
    role: "a spirited, feisty Shih Tzu AI companion",
    images: {
      closed: "/personas/warrior/closed.png",
      smile: "/personas/warrior/smile.png",
      talk: "/personas/warrior/talk.png",
    },
    voiceGender: "child",
    pitch: 1.7,
    rate: 1.15,
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
