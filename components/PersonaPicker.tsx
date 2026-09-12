import Image from "next/image";
import type { Persona } from "@/lib/personas";

export default function PersonaPicker({
  personas,
  selectedId,
  onSelect,
}: {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
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
                <Image src={persona.images.closed} alt={persona.name} fill sizes="56px" className="object-cover" />
              </div>
              <span className={`text-xs ${selected ? "font-semibold text-sky-600" : "text-slate-500"}`}>
                {persona.name}
              </span>
            </button>
          );
        })}
    </div>
  );
}
