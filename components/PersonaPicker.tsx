import { useState } from "react";
import type { Persona } from "@/lib/personas";
import { isCustomPersonaId } from "@/lib/personas";

export default function PersonaPicker({
  personas,
  selectedId,
  onSelect,
  onRequestCreate,
  onDelete,
}: {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRequestCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<Persona | null>(null);

  return (
    <div className="flex w-full max-w-md flex-wrap justify-center gap-3">
      {personas
        .filter((p) => p.available)
        .map((persona) => {
          const selected = persona.id === selectedId;
          const deletable = isCustomPersonaId(persona.id);
          return (
            <div key={persona.id} className="relative flex flex-col items-center gap-1">
              <button onClick={() => onSelect(persona.id)} title={persona.description} className="flex flex-col items-center gap-1">
                <div
                  className={`relative h-14 w-14 overflow-hidden rounded-full ring-2 transition-all ${
                    selected ? "ring-sky-500 scale-105" : "ring-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- avatar art is either a local file or a generated data: URL, neither of which benefits from Next's remote-image loader */}
                  <img src={persona.images.closed} alt={persona.name} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <span className={`text-xs ${selected ? "font-semibold text-sky-600" : "text-slate-500"}`}>
                  {persona.name}
                </span>
              </button>

              {deletable && (
                <button
                  onClick={() => setPendingDelete(persona)}
                  title={`Remove ${persona.name}`}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white shadow hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

      <button onClick={onRequestCreate} title="Create your own character" className="flex flex-col items-center gap-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-2xl leading-none text-slate-400 hover:border-sky-400 hover:text-sky-500">
          +
        </div>
        <span className="text-xs text-slate-500">New</span>
      </button>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
            <p className="mb-4 text-sm text-slate-700">
              Remove <span className="font-semibold">{pendingDelete.name}</span>? This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
