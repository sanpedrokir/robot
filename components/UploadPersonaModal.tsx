import { useEffect, useRef, useState } from "react";
import type { Persona, VoiceGender } from "@/lib/personas";
import { defaultVoiceParams, SUPPORTED_LANGUAGES } from "@/lib/personas";
import { fileToDataUrl, resizeDataUrl } from "@/lib/customPersonas";
import { getVoicesForGender } from "@/lib/voices";

export default function UploadPersonaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (persona: Persona) => void;
}) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState("en-US");
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("male");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [error, setError] = useState("");
  // A voice valid for one language's pool can also turn up in a different
  // language's pool (e.g. a device with no real voices for a language
  // falls back to showing every voice, which can overlap with another,
  // unrelated language's real list) — so a URI carried over across a
  // *language* change isn't actually meaningful and must be re-picked
  // fresh, even though it's fine to preserve across a gender-only change.
  const prevLanguageRef = useRef(languageCode);

  // getVoices() can return an empty list until the browser's async voice
  // fetch completes (signaled by "voiceschanged") — refresh once that
  // fires, and again whenever the chosen language or gender changes.
  useEffect(() => {
    function refresh() {
      setVoicesLoaded(window.speechSynthesis.getVoices().length > 0);
      const list = getVoicesForGender(voiceGender, languageCode);
      setVoices(list);
      const languageChanged = prevLanguageRef.current !== languageCode;
      prevLanguageRef.current = languageCode;
      setSelectedVoiceURI((current) =>
        !languageChanged && current && list.some((v) => v.voiceURI === current) ? current : (list[0]?.voiceURI ?? null)
      );
    }
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [voiceGender, languageCode]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await fileToDataUrl(file);
      setPhoto(await resizeDataUrl(raw));
      setError("");
    } catch {
      setError("Couldn't read that photo — try a different file.");
    }
  }

  function previewVoice(voice: SpeechSynthesisVoice) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hi, this is how I sound.");
    utterance.voice = voice;
    utterance.pitch = defaultVoiceParams[voiceGender].pitch;
    utterance.rate = defaultVoiceParams[voiceGender].rate;
    window.speechSynthesis.speak(utterance);
  }

  function handleCreate() {
    if (!name.trim() || !photo) return;
    const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    const persona: Persona = {
      id: `custom-${Date.now()}`,
      name: name.trim().slice(0, 30),
      description: `${name.trim()}, a custom character.`,
      role: `an original fictional character named ${name.trim()}`,
      images: { closed: photo, smile: photo, talk: photo },
      voiceGender,
      voiceURI: selectedVoice?.voiceURI,
      languageCode,
      ...defaultVoiceParams[voiceGender],
      available: true,
    };
    onCreated(persona);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Upload a photo</h2>

        <label className="mb-1 block text-xs font-medium text-slate-600">Photo</label>
        <input type="file" accept="image/*" onChange={handlePhotoChange} className="mb-3 w-full text-sm text-slate-600" />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local data: URL preview, not worth Next's image loader
          <img src={photo} alt="Preview" className="mx-auto mb-3 h-24 w-24 rounded-full object-cover" />
        )}

        <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mom"
          className="mb-3 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-sky-400"
        />

        <label className="mb-1 block text-xs font-medium text-slate-600">Language</label>
        <select
          value={languageCode}
          onChange={(e) => setLanguageCode(e.target.value)}
          className="mb-3 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-sky-400"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-medium text-slate-600">Voice</label>
        <select
          value={voiceGender}
          onChange={(e) => setVoiceGender(e.target.value as VoiceGender)}
          className="mb-3 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-sky-400"
        >
          <option value="male">Male voice</option>
          <option value="female">Female voice</option>
          <option value="child">Child voice</option>
        </select>

        <label className="mb-1 block text-xs font-medium text-slate-600">Pick the tone closest to what you want</label>
        <div className="mb-2 flex max-h-40 flex-col gap-2 overflow-y-auto">
          {voices.map((voice, i) => (
            <button
              key={voice.voiceURI}
              onClick={() => {
                setSelectedVoiceURI(voice.voiceURI);
                previewVoice(voice);
              }}
              className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-sm ${
                selectedVoiceURI === voice.voiceURI ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-600"
              }`}
            >
              Tone {i + 1}
              <span>▶</span>
            </button>
          ))}
          {voices.length === 0 && !voicesLoaded && <p className="text-xs text-slate-400">Loading voices…</p>}
          {voices.length === 0 && voicesLoaded && (
            <p className="text-xs text-slate-400">
              No installed {voiceGender} voice found for this language — it&apos;ll use your device&apos;s default voice for this language instead.
            </p>
          )}
        </div>
        <p className="mb-4 text-[11px] text-slate-400">Voice options depend on what&apos;s installed on this device.</p>

        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !photo}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
