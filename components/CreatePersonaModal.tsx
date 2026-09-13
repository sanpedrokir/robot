import { useState } from "react";
import type { Persona, VoiceGender } from "@/lib/personas";
import { defaultVoiceParams, guessVoiceGenderFromText } from "@/lib/personas";
import { resizeDataUrl } from "@/lib/customPersonas";

export default function CreatePersonaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (persona: Persona) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("male");
  // Once the user picks a voice themselves, stop overriding it as they keep
  // typing — the auto-guess is only meant to save a step, not fight them.
  const [voiceTouched, setVoiceTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [error, setError] = useState("");

  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (!voiceTouched) setVoiceGender(guessVoiceGenderFromText(value));
  }

  async function handleGenerate() {
    if (!name.trim() || !description.trim()) return;
    setStatus("generating");
    setError("");
    try {
      const res = await fetch("/api/generate-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      let data: { closed?: string; smile?: string; talk?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error("The server didn't return a valid response — please try again.");
      }
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      if (!data.closed || !data.smile || !data.talk) throw new Error("The server didn't return complete images.");

      const [closed, smile, talk] = await Promise.all([
        resizeDataUrl(data.closed),
        resizeDataUrl(data.smile),
        resizeDataUrl(data.talk),
      ]);

      const persona: Persona = {
        id: `custom-${Date.now()}`,
        name: name.trim().slice(0, 30),
        description: `${name.trim()}, a custom character.`,
        role: `an original fictional character described as: ${description.trim()}`,
        images: { closed, smile, talk },
        voiceGender,
        ...defaultVoiceParams[voiceGender],
        available: true,
      };
      onCreated(persona);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Create a character</h2>

        <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gandalf"
          disabled={status === "generating"}
          className="mb-3 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-sky-400"
        />

        <label className="mb-1 block text-xs font-medium text-slate-600">
          Describe the character (fictional characters only — not real people)
        </label>
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="e.g. a wise old wizard with a long grey beard and a pointy hat"
          disabled={status === "generating"}
          rows={3}
          className="mb-3 w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-sky-400"
        />

        <label className="mb-1 block text-xs font-medium text-slate-600">Voice</label>
        <select
          value={voiceGender}
          onChange={(e) => {
            setVoiceTouched(true);
            setVoiceGender(e.target.value as VoiceGender);
          }}
          disabled={status === "generating"}
          className="mb-4 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm text-black outline-none focus:border-sky-400"
        >
          <option value="male">Male voice</option>
          <option value="female">Female voice</option>
          <option value="child">Child voice</option>
        </select>

        {status === "error" && <p className="mb-3 text-xs text-red-500">{error}</p>}
        {status === "generating" && (
          <p className="mb-3 text-xs text-slate-500">Creating your character… this can take up to 30 seconds.</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={status === "generating"}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={status === "generating" || !name.trim() || !description.trim()}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {status === "generating" ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
