import type { Persona } from "@/lib/personas";

export default function PersonaPicker({
  personas,
  selectedId,
  onSelect,
  onRequestCreate,
}: {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRequestCreate: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-wrap justify-center gap-3">
      {personas
        .filter((p) => p.available)
        .map((persona) => {
          const selected = persona.id === selectedId;
          return (
            <button
              key={persona.id}
              onClick={() => onSelect(persona.id)}
              title={persona.description}
              className="flex flex-col items-center gap-1"
            >
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
          );
        })}

      <button onClick={onRequestCreate} title="Create your own character" className="flex flex-col items-center gap-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-2xl leading-none text-slate-400 hover:border-sky-400 hover:text-sky-500">
          +
        </div>
        <span className="text-xs text-slate-500">New</span>
      </button>
    </div>
  );
}
