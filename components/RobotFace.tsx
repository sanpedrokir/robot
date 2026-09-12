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
        className={`relative h-56 w-56 overflow-hidden rounded-[3rem] shadow-xl shadow-sky-300/50 ${
          state === "happy" ? "animate-happy-bounce" : "animate-float"
        }`}
      >
        <Image src="/neo-avatar.png" alt="Neo" fill sizes="224px" priority className="object-cover" />

        {/* Mouth overlay: a rough crop over the lips that pulses open/closed
            while speaking, giving the illusion of moving lips on top of an
            otherwise static portrait. Position is an estimate based on the
            source image's proportions — nudge the left/top percentages
            below if it doesn't line up once you see it live. */}
        <div
          className={`absolute rounded-full bg-rose-950/70 ${state === "speaking" ? "animate-talk-mouth" : "scale-y-0"}`}
          style={{ left: "44%", top: "57%", width: "13%", height: "5%" }}
        />
      </div>

      <p className="text-sm text-slate-500">{stateLabel[state]}</p>
    </div>
  );
}
