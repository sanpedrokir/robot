import type { RobotState } from "@/lib/types";

function Eye({ state }: { state: RobotState }) {
  if (state === "happy") {
    return <div className="w-11 h-6 border-t-[3px] border-slate-600 rounded-t-full" />;
  }

  return (
    <div className="relative w-12 h-12 rounded-full bg-white shadow-inner shadow-slate-300 flex items-center justify-center overflow-hidden animate-blink">
      <div
        className={`w-5 h-5 rounded-full bg-slate-600 transition-transform duration-300 ${
          state === "thinking" ? "-translate-y-2" : ""
        }`}
      />
    </div>
  );
}

function Mouth({ state }: { state: RobotState }) {
  switch (state) {
    case "listening":
      return <div className="w-5 h-5 rounded-full bg-slate-600" />;
    case "thinking":
      return <div className="w-7 h-1.5 rounded-full bg-slate-600 translate-x-2" />;
    case "speaking":
      return <div className="w-8 rounded-full bg-slate-600 animate-talk" />;
    case "happy":
      return <div className="w-16 h-8 border-b-[3px] border-slate-600 rounded-b-full" />;
    case "idle":
    default:
      return <div className="w-10 h-4 border-b-[3px] border-slate-600 rounded-b-full" />;
  }
}

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
        className={`relative flex flex-col items-center gap-4 w-56 h-48 rounded-[3rem] bg-gradient-to-b from-sky-400 to-sky-600 shadow-xl shadow-sky-500/50 ${
          state === "happy" ? "animate-happy-bounce" : "animate-float"
        }`}
      >
        {/* Antenna */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-2 h-4 bg-slate-600" />
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
        </div>

        <div className="flex gap-6 mt-10">
          <Eye state={state} />
          <Eye state={state} />
        </div>

        <div className="flex items-end justify-center h-8">
          <Mouth state={state} />
        </div>

        {state === "happy" && (
          <>
            <div className="absolute left-4 top-24 w-4 h-3 rounded-full bg-rose-300/70" />
            <div className="absolute right-4 top-24 w-4 h-3 rounded-full bg-rose-300/70" />
          </>
        )}
      </div>

      <p className="text-sm text-slate-500">{stateLabel[state]}</p>
    </div>
  );
}
