import Image from "next/image";
import type { RobotState } from "@/lib/types";

const stateLabel: Record<RobotState, string> = {
  idle: "Neo is waiting",
  listening: "Neo is listening...",
  thinking: "Neo is thinking...",
  speaking: "Neo is speaking...",
  happy: "Neo is happy!",
};

export default function RobotFace({ state, mouthOpen }: { state: RobotState; mouthOpen: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56 animate-float overflow-hidden rounded-[3rem] bg-slate-300 shadow-xl shadow-sky-300/50">
        <Image
          src={state === "happy" ? "/neo-avatar-smile.png" : "/neo-avatar.png"}
          alt="Neo"
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
            Neo is speaking. */}
        {state === "speaking" && (
          <Image
            src="/neo-avatar-talk.png"
            alt=""
            fill
            sizes="224px"
            className={`object-cover transition-opacity duration-100 ${mouthOpen ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>

      <p className="text-sm text-slate-500">{stateLabel[state]}</p>
    </div>
  );
}
