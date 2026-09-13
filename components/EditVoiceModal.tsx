import { useEffect, useState } from "react";
import type { Persona, VoiceGender } from "@/lib/personas";
import { defaultVoiceParams, DEEP_VOICE_PITCH_FACTOR, SUPPORTED_LANGUAGES } from "@/lib/personas";
import { getVoicesForGender } from "@/lib/voices";
import type { PersonaOverride } from "@/lib/personaOverrides";

export default function EditVoiceModal({
  persona,
  onClose,
  onSave,
}: {
  persona: Persona;
  onClose: () => void;
  onSave: (override: PersonaOverride) => void;
}) {
  const [languageCode, setLanguageCode] = useState(persona.languageCode || "en-US");
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(persona.voiceGender);
  const [deepVoice, setDeepVoice] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesConfident, setVoicesConfident] = useState(true);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(persona.voiceURI ?? null);

  const pitch = defaultVoiceParams[voiceGender].pitch * (deepVoice ? DEEP_VOICE_PITCH_FACTOR : 1);

  useEffect(() => {
    function refresh() {
      const { voices: list, confident } = getVoicesForGender(voiceGender, languageCode);
      setVoices(list);
      setVoicesConfident(confident);
      setSelectedVoiceURI((current) => (current && list.some((v) => v.voiceURI === current) ? current : (list[0]?.voiceURI ?? null)));
    }
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [voiceGender, languageCode]);

  function previewVoice(voice: SpeechSynthesisVoice, pitchOverride = pitch) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hi, this is how I sound.");
    utterance.voice = voice;
    utterance.pitch = pitchOverride;
    utterance.rate = defaultVoiceParams[voiceGender].rate;
    window.speechSynthesis.speak(utterance);
  }

  function handleSave() {
    const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    onSave({
      languageCode,
      voiceGender,
      voiceURI: selectedVoice?.voiceURI,
      pitch,
      rate: defaultVoiceParams[voiceGender].rate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">{persona.name}&apos;s language &amp; voice</h2>

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

        {voiceGender !== "child" && (
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={deepVoice}
              onChange={(e) => {
                setDeepVoice(e.target.checked);
                const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
                const newPitch = defaultVoiceParams[voiceGender].pitch * (e.target.checked ? DEEP_VOICE_PITCH_FACTOR : 1);
                if (selectedVoice) previewVoice(selectedVoice, newPitch);
              }}
            />
            Deeper voice
          </label>
        )}

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
          {voices.length === 0 && <p className="text-xs text-slate-400">Loading voices…</p>}
        </div>
        <p className="mb-4 text-[11px] text-slate-400">
          {!voicesConfident
            ? `Couldn't tell which installed voice is ${voiceGender} for this language — showing all ${voices.length} available voice${voices.length === 1 ? "" : "s"} below, so preview each to find one that fits.`
            : "Voice options depend on what's installed on this device."}
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
