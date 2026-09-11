import type { RobotState } from "@/lib/types";

function Eye({ state }: { state: RobotState }) {
  if (state === "happy") {
    return <div className="w-9 h-5 border-t-4 border-slate-800 rounded-t-full" />;
  }

  return (
    <div className="relative w-10 h-10 rounded-full bg-white border-4 border-slate-800 flex items-center justify-center overflow-hidden animate-blink">
      <div
        className={`w-4 h-4 rounded-full bg-slate-800 transition-transform duration-300 ${
          state === "thinking" ? "-translate-y-2" : ""
        }`}
      />
    </div>
  );
}

function Mouth({ state }: { state: RobotState }) {
  switch (state) {
    case "listening":
      return <div className="w-5 h-5 rounded-full bg-slate-800" />;
    case "thinking":
      return <div className="w-7 h-1.5 rounded-full bg-slate-800 translate-x-2" />;
    case "speaking":
      return <div className="w-8 rounded-full bg-slate-800 animate-talk" />;
    case "happy":
      return <div className="w-16 h-8 border-b-4 border-slate-800 rounded-b-full" />;
    case "idle":
    default:
      return <div className="w-10 h-4 border-b-4 border-slate-800 rounded-b-full" />;
  }
}

const stateLabel: Record<RobotState, string> = {
  idle: "Bobby is waiting",
  listening: "Bobby is listening...",
  thinking: "Bobby is thinking...",
  speaking: "Bobby is speaking...",
  happy: "Bobby is happy!",
};

export default function RobotFace({ state }: { state: RobotState }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative flex flex-col items-center gap-4 w-56 h-48 rounded-[3rem] bg-sky-100 border-4 border-slate-800 shadow-lg ${
          state === "happy" ? "animate-happy-bounce" : "animate-float"
        }`}
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-2 h-4 bg-slate-800" />
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
