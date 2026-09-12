import Image from "next/image";
import type { RobotState } from "@/lib/types";
import type { Persona } from "@/lib/personas";

const stateVerb: Record<RobotState, string> = {
  idle: "is waiting",
  listening: "is listening...",
  thinking: "is thinking...",
  speaking: "is speaking...",
  happy: "is happy!",
};

export default function RobotFace({
  persona,
  state,
  mouthOpen,
}: {
  persona: Persona;
  state: RobotState;
  mouthOpen: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56 animate-float overflow-hidden rounded-[3rem] bg-slate-300 shadow-xl shadow-sky-300/50">
        <Image
          src={state === "happy" ? persona.images.smile : persona.images.closed}
          alt={persona.name}
          fill
          sizes="224px"
          priority
          className="object-cover"
        />

        {/* A second, mouth-open frame of the same portrait, layered exactly
            on top. Its visibility is driven by mouthOpen (toggled per
            speech word/sentence boundary in app/page.tsx) rather than a
            fixed CSS animation, so it tracks actual speech rhythm —
            including pauses — instead of flapping non-stop the whole time
            the persona is speaking. */}
        {state === "speaking" && (
          <Image
            src={persona.images.talk}
            alt=""
            fill
            sizes="224px"
            className={`object-cover transition-opacity duration-100 ${mouthOpen ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>

      <p className="text-sm text-slate-500">
        {persona.name} {stateVerb[state]}
      </p>
    </div>
  );
}
