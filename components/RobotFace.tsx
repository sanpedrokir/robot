import type { RobotState } from "@/lib/types";
import { isCustomPersonaId, type Persona } from "@/lib/personas";

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
  // AI-generated custom characters' three frames aren't posed as tightly
  // against each other as the hand-crafted fixed avatars (each is a
  // separate edit rather than a matched set), so rapidly flapping between
  // them while speaking reads as jumpy — hold a single static talking
  // frame instead, then the smile frame once done (handled below by the
  // "happy" state, same for every persona).
  const custom = isCustomPersonaId(persona.id);

  const baseImage =
    state === "happy" ? persona.images.smile : state === "speaking" && custom ? persona.images.talk : persona.images.closed;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56 animate-float overflow-hidden rounded-[3rem] bg-slate-300 shadow-xl shadow-sky-300/50">
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar art is either a local file or a generated data: URL, neither of which benefits from Next's remote-image loader */}
        <img src={baseImage} alt={persona.name} className="absolute inset-0 h-full w-full object-cover" />

        {/* A second, mouth-open frame of the same portrait, layered exactly
            on top. Its visibility is driven by mouthOpen (toggled per
            speech word/sentence boundary in app/page.tsx) rather than a
            fixed CSS animation, so it tracks actual speech rhythm —
            including pauses — instead of flapping non-stop the whole time
            the persona is speaking. Skipped for custom personas, which
            already show a static talking frame above instead. */}
        {state === "speaking" && !custom && (
          // eslint-disable-next-line @next/next/no-img-element -- same as above
          <img
            src={persona.images.talk}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-100 ${mouthOpen ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>

      <p className="text-sm text-slate-500">
        {persona.name} {stateVerb[state]}
      </p>
    </div>
  );
}
