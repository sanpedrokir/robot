"use client";

import { useRef, useState } from "react";
import RobotFace from "@/components/RobotFace";
import ChatBox from "@/components/ChatBox";
import WhatsAppPanel from "@/components/WhatsAppPanel";
import MusicPlayer from "@/components/MusicPlayer";
import type { ChatMessage, RobotState } from "@/lib/types";

export default function Home() {
  const [robotState, setRobotState] = useState<RobotState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [conversationMode, setConversationModeState] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
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
    utterance.onend = () => {
      setRobotState("idle");
      if (conversationModeRef.current) startListening();
    };
    utterance.onerror = () => {
      setRobotState("idle");
      if (conversationModeRef.current) startListening();
    };
    window.speechSynthesis.speak(utterance);
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
    let replyFiles: string[] | undefined;
    let replyWhatsapp: ChatMessage["whatsapp"];
    let replySongVideoId: string | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send the whole conversation so far, not just the latest message,
          // so Bobby can remember what was said earlier.
          messages: history.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      replyText = data.reply;
      replyFiles = data.files;
      replyWhatsapp = data.whatsapp;
      replySongVideoId = data.song?.videoId;
    } catch {
      replyText = "Uh oh, my circuits glitched. Can you try that again?";
    }

    if (replySongVideoId) setNowPlaying(replySongVideoId);

    clearTimers();
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, sender: "milo", text: replyText, files: replyFiles, whatsapp: replyWhatsapp },
    ]);
    // Speak the reply either way (including the glitch message) so a
    // hands-free conversation doesn't just stall silently on a failure —
    // speak()'s onend/onerror is what resumes listening in that mode.
    setRobotState("speaking");
    speak(replyText);
    // Safety net in case speechSynthesis never fires onend (e.g. unsupported
    // browser or it silently fails) — sized to outlast a normal reading of
    // the reply so it doesn't cut off the speaking animation mid-sentence.
    const fallbackMs = Math.max(1800, replyText.length * 80);
    timers.current.push(setTimeout(() => setRobotState("idle"), fallbackMs));
  }

  return (
    <div className="flex flex-col flex-1 items-center gap-6 bg-zinc-50 py-10 px-4">

      <RobotFace state={robotState} />

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
              : "Start hands-free voice chat with Bobby"
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
