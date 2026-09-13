import type { Persona } from "@/lib/personas";

const STORAGE_KEY = "personaOverrides";

export type PersonaOverride = Partial<Pick<Persona, "languageCode" | "voiceGender" | "voiceURI" | "pitch" | "rate">>;

/**
 * Per-persona language/voice overrides, keyed by persona id, stored
 * separately from the personas themselves — this is what lets a fixed
 * built-in persona like Neo have its language/voice changed (it isn't
 * stored in IndexedDB like custom personas are, so it can't be edited in
 * place) as well as letting a custom persona's voice be tweaked later
 * without regenerating/re-uploading it.
 */
export function getPersonaOverrides(): Record<string, PersonaOverride> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePersonaOverride(id: string, override: PersonaOverride): void {
  const all = getPersonaOverrides();
  all[id] = override;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function applyPersonaOverride(persona: Persona, overrides: Record<string, PersonaOverride>): Persona {
  const override = overrides[persona.id];
  return override ? { ...persona, ...override } : persona;
}
