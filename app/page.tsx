"use client";

import { useEffect, useRef, useState } from "react";
import RobotFace from "@/components/RobotFace";
import PersonaPicker from "@/components/PersonaPicker";
import ChatBox from "@/components/ChatBox";
import WhatsAppPanel from "@/components/WhatsAppPanel";
import MusicPlayer from "@/components/MusicPlayer";
import type { ChatMessage, RobotState } from "@/lib/types";
import { personas, getPersona, defaultPersona, type VoiceGender } from "@/lib/personas";

const PERSONA_STORAGE_KEY = "selectedPersonaId";

export default function Home() {
  const [personaId, setPersonaId] = useState(defaultPersona.id);
  const persona = getPersona(personaId);
  const personaRef = useRef(persona);
  personaRef.current = persona;

  useEffect(() => {
    const saved = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    // Deliberately deferred to after mount: localStorage isn't available
    // during SSR, so reading it during render would mismatch hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setPersonaId(saved);
  }, []);

  function selectPersona(id: string) {
    setPersonaId(id);
    window.localStorage.setItem(PERSONA_STORAGE_KEY, id);
  }

  const [robotState, setRobotState] = useState<RobotState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [conversationMode, setConversationModeState] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [mouthOpen, setMouthOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mouthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackFlapRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Recognition callbacks are created once per listening session and need
  // the up-to-date value, not the one closed over when they were set up —
  // a ref sidesteps that stale-closure problem.
  const conversationModeRef = useRef(false);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function setConversationMode(value: boolean) {
    conversationModeRef.current = value;
    setConversationModeState(value);
  }

  // Browsers don't expose gender/age on voices, so these are best-effort
  // preference lists of common voice names (across Windows/Edge neural
  // voices, Chrome's Google voices, and macOS). There's no dedicated
  // "child" voice on any mainstream engine. A pitched-up male voice still
  // carries adult-male formants and just sounds like a man talking in a
  // higher note, so pre-pubescent-sounding personas use the female/child
  // voice pool instead (physiologically closer to a young child's
  // fundamental frequency) and lean on a much higher pitch/rate on top
  // (see personas.ts) to read as younger and smaller.
  const voiceNamesByGender: Record<VoiceGender, string[]> = {
    male: ["Guy", "David", "Daniel", "Alex", "Google UK English Male"],
    female: ["Aria", "Jenny", "Samantha", "Zira", "Susan", "Karen", "Linda", "Google UK English Female", "Google US English Female"],
    child: ["Aria", "Jenny", "Samantha", "Zira", "Susan", "Karen", "Linda"],
  };

  function getVoiceForGender(gender: VoiceGender): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null; // not loaded yet — caller falls back to pitch/rate only

    for (const name of voiceNamesByGender[gender]) {
      const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
      if (match) return match;
    }
    return voices.find((v) => v.lang.startsWith("en")) ?? null;
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setRobotState("idle");
      if (conversationModeRef.current) startListening();
      return;
    }
    window.speechSynthesis.cancel(); // stop anything still playing from a prior reply
    // Safety net on top of the system prompt telling the model not to use
    // these — some TTS voices read emoji/markdown symbols out literally
    // (an emoji becomes "robot face emoji", "*" becomes "asterisk", and
    // some verbose voices even announce commas).
    const spokenText = text
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[*_~`#|,]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    // Pitch/rate come from the selected persona (see personas.ts) so each
    // one reads distinctly — e.g. Kenny lower/slower, Wolfie/Warrior much
    // higher to approximate a child's voice.
    utterance.pitch = personaRef.current.pitch;
    utterance.rate = personaRef.current.rate;

    // Safety net in case this utterance never fires onend (e.g. an
    // unsupported browser, or the engine silently hangs) — but unlike a
    // fixed timeout guessed from text length, this is a watchdog that
    // resets on every real sign of progress (each onboundary event), so
    // it only ever fires if speech has genuinely stalled, never because a
    // longer reply simply took more real time than a rough guess assumed
    // (that used to cut the speaking animation off mid-sentence).
    let watchdog: ReturnType<typeof setTimeout>;
    function resetWatchdog() {
      clearTimeout(watchdog);
      // Generous on purpose: some voices only report sentence-level (not
      // per-word) boundaries, and a single long sentence could otherwise
      // go several seconds between events even while speaking normally.
      watchdog = setTimeout(() => {
        setRobotState("idle");
        setMouthOpen(false);
        if (conversationModeRef.current) startListening();
      }, 8000);
    }

    function stopFallbackFlap() {
      if (fallbackFlapRef.current) {
        clearInterval(fallbackFlapRef.current);
        fallbackFlapRef.current = null;
      }
    }

    // Flap the mouth open briefly on each word/sentence boundary the
    // browser reports, instead of a fixed CSS animation running non-stop
    // for the whole speaking duration — this tracks actual speech rhythm
    // (including natural pauses) rather than a constant mechanical flap.
    let boundaryFired = false;
    utterance.onboundary = () => {
      boundaryFired = true;
      stopFallbackFlap(); // this browser does support boundary events after all
      setMouthOpen(true);
      if (mouthTimerRef.current) clearTimeout(mouthTimerRef.current);
      mouthTimerRef.current = setTimeout(() => setMouthOpen(false), 150);
      resetWatchdog();
    };
    utterance.onend = () => {
      clearTimeout(watchdog);
      stopFallbackFlap();
      setMouthOpen(false);
      if (mouthTimerRef.current) clearTimeout(mouthTimerRef.current);
      // A quick happy smile after finishing a reply, before settling back
      // to idle.
      setRobotState("happy");
      timers.current.push(setTimeout(() => setRobotState("idle"), 1600));
      if (conversationModeRef.current) startListening();
    };
    utterance.onerror = () => {
      clearTimeout(watchdog);
      stopFallbackFlap();
      setRobotState("idle");
      setMouthOpen(false);
      if (mouthTimerRef.current) clearTimeout(mouthTimerRef.current);
      if (conversationModeRef.current) startListening();
    };
    resetWatchdog(); // arm it up front in case boundary/end never fire at all

    function startSpeaking() {
      window.speechSynthesis.speak(utterance);
      // Some browsers (notably mobile ones — Android Chrome's TTS engine
      // support varies by device, and iOS Safari often doesn't fire it at
      // all) never send onboundary events, which would otherwise leave the
      // mouth permanently closed for the whole reply. If no boundary shows
      // up shortly after speech starts, fall back to a plain timed flap
      // instead — less precisely synced, but still moving.
      timers.current.push(
        setTimeout(() => {
          if (!boundaryFired && !fallbackFlapRef.current) {
            fallbackFlapRef.current = setInterval(() => {
              setMouthOpen((prev) => !prev);
            }, 220);
          }
        }, 500)
      );
    }

    // Chrome/Edge often report zero voices on the very first call of a
    // page load — getVoices() only populates after an internal async
    // fetch completes, signaled by the "voiceschanged" event. Without
    // waiting for that, the intro line silently falls back to the
    // browser's raw default voice while every later reply (once voices
    // have loaded) correctly gets the preferred one, making the intro
    // sound like a different voice from the rest of the conversation.
    if (window.speechSynthesis.getVoices().length > 0) {
      const voice = getVoiceForGender(personaRef.current.voiceGender);
      if (voice) utterance.voice = voice;
      startSpeaking();
    } else {
      let spoken = false;
      const trySpeak = () => {
        if (spoken) return; // the voiceschanged listener and the timeout below can both fire
        spoken = true;
        window.speechSynthesis.removeEventListener("voiceschanged", trySpeak);
        const voice = getVoiceForGender(personaRef.current.voiceGender);
        if (voice) utterance.voice = voice;
        startSpeaking();
      };
      window.speechSynthesis.addEventListener("voiceschanged", trySpeak);
      // Safety net in case this browser never fires voiceschanged.
      timers.current.push(setTimeout(trySpeak, 300));
    }
  }

  function startListening() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Sorry, your browser doesn't support voice input. Try Chrome or Edge.");
      setConversationMode(false);
      return;
    }

    // getUserMedia (which SpeechRecognition relies on) is only available in
    // secure contexts: https:// or http://localhost. Loading the app via a
    // LAN IP (e.g. http://192.168.x.x:3000) silently fails otherwise.
    if (!window.isSecureContext) {
      alert(
        "Voice input needs a secure connection. Open this page via https:// or http://localhost, not a plain IP address."
      );
      setConversationMode(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) handleSend(transcript);
    };
    recognition.onerror = (event) => {
      setMicOn(false);
      if (event.error === "aborted") return; // user clicked stop — no feedback needed
      if (event.error === "no-speech") {
        if (conversationModeRef.current) {
          // Just a natural pause in the conversation — keep waiting instead
          // of interrupting with a dialog every time the user goes quiet.
          startListening();
        } else {
          alert(
            "Didn't hear anything. Check that your microphone isn't muted and that Windows hasn't blocked browser microphone access (Settings > Privacy & security > Microphone)."
          );
        }
        return;
      }
      setConversationMode(false);
      alert(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser's site settings and try again."
          : `Voice input error: ${event.error}`
      );
    };
    recognition.onend = () => setMicOn(false);

    recognitionRef.current = recognition;
    setMicOn(true);
    recognition.start();
  }

  function toggleMic() {
    if (conversationModeRef.current) {
      setConversationMode(false);
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      clearTimers();
      if (fallbackFlapRef.current) {
        clearInterval(fallbackFlapRef.current);
        fallbackFlapRef.current = null;
      }
      setMouthOpen(false);
      setRobotState("idle");
      return;
    }
    setConversationMode(true);
    startListening();
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    clearTimers();
    const userMessage: ChatMessage = { id: Date.now(), sender: "user", text };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setRobotState("listening");
    timers.current.push(setTimeout(() => setRobotState("thinking"), 600));

    let replyText: string;
    let replyWhatsapp: ChatMessage["whatsapp"];
    let replySongVideoId: string | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: personaRef.current.id,
          // Send the whole conversation so far, not just the latest message,
          // so the persona can remember what was said earlier.
          messages: history.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      replyText = data.reply;
      replyWhatsapp = data.whatsapp;
      replySongVideoId = data.song?.videoId;
    } catch {
      replyText = "Uh oh, my circuits glitched. Can you try that again?";
    }

    if (replySongVideoId) setNowPlaying(replySongVideoId);

    clearTimers();
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, sender: "milo", text: replyText, whatsapp: replyWhatsapp },
    ]);
    // Speak the reply either way (including the glitch message) so a
    // hands-free conversation doesn't just stall silently on a failure —
    // speak()'s onend/onerror (and its internal watchdog) is what resumes
    // listening in that mode and resets to idle, including on failure.
    setRobotState("speaking");
    speak(replyText);
  }

  return (
    <div className="flex flex-col flex-1 items-center gap-6 bg-zinc-50 py-10 px-4">

      <RobotFace persona={persona} state={robotState} mouthOpen={mouthOpen} />

      <PersonaPicker personas={personas} selectedId={personaId} onSelect={selectPersona} />

      <WhatsAppPanel />

      {nowPlaying && <MusicPlayer videoId={nowPlaying} onClose={() => setNowPlaying(null)} />}

      <ChatBox messages={messages} />

      <div className="flex w-full max-w-md gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-full border-2 border-slate-200 px-4 py-2 text-sm text-black outline-none focus:border-sky-400"
        />
        <button
          onClick={toggleMic}
          title={
            conversationMode
              ? micOn
                ? "Listening… click to end hands-free chat"
                : "Hands-free chat is on — click to end"
              : "Start hands-free voice chat with Neo"
          }
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            conversationMode ? "bg-red-500 text-white animate-pulse" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          🎤
        </button>
        <button
          onClick={() => handleSend()}
          className="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
