import Image from "next/image";
import type { RobotState } from "@/lib/types";

const stateLabel: Record<RobotState, string> = {
  idle: "Neo is waiting",
  listening: "Neo is listening...",
  thinking: "Neo is thinking...",
  speaking: "Neo is speaking...",
  happy: "Neo is happy!",
};

export default function RobotFace({ state }: { state: RobotState }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative h-56 w-56 overflow-hidden rounded-[3rem] bg-slate-300 shadow-xl shadow-sky-300/50 ${
          state === "happy" ? "animate-happy-bounce" : "animate-float"
        }`}
      >
        <Image src="/neo-avatar.png" alt="Neo" fill sizes="224px" priority className="object-cover" />

        {/* A second, mouth-open frame of the same portrait, layered exactly
            on top and only rendered while speaking. Toggling its opacity
            (mouth-flap) alternates it with the closed-mouth image beneath,
            giving a real (if simple, 2-frame) talking animation instead of
            a synthetic overlay shape. */}
        {state === "speaking" && (
          <Image
            src="/neo-avatar-talk.png"
            alt=""
            fill
            sizes="224px"
            className="object-cover animate-mouth-flap"
          />
        )}
      </div>

      <p className="text-sm text-slate-500">{stateLabel[state]}</p>
    </div>
  );
}
