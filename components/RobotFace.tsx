import type { RobotState } from "@/lib/types";

function Eye({ state }: { state: RobotState }) {
  if (state === "happy") {
    return <div className="w-9 h-5 border-t-[3px] border-slate-600 rounded-t-full" />;
  }

  return (
    <div className="relative w-10 h-10 rounded-full bg-white shadow-inner shadow-slate-300 flex items-center justify-center overflow-hidden animate-blink">
      <div
        className={`w-4 h-4 rounded-full bg-slate-600 transition-transform duration-300 ${
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
        className={`relative flex flex-col items-center gap-4 w-56 h-48 rounded-[3rem] bg-gradient-to-b from-sky-100 to-sky-200 shadow-xl shadow-sky-300/50 ${
          state === "happy" ? "animate-happy-bounce" : "animate-float"
        }`}
      >
        {/* Cap */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="h-9 w-20 rounded-t-full bg-red-500" />
          <div className="-mt-1 h-2.5 w-24 rounded-full bg-red-600" />
        </div>

        {/* Antenna, poking out through the top of the cap */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
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

        {/* Necklace — chunky gold chain with a bling medallion */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="h-4 w-28 rounded-b-full border-b-[5px] border-yellow-500" />
          <div className="relative -mt-1 h-7 w-7 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg shadow-yellow-500/50 ring-2 ring-yellow-200">
            <div className="absolute left-1.5 top-1 h-1.5 w-1.5 rounded-full bg-white/70" />
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">{stateLabel[state]}</p>
    </div>
  );
}
