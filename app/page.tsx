"use client";

import { useRef, useState } from "react";
import RobotFace from "@/components/RobotFace";
import ChatBox from "@/components/ChatBox";
import WhatsAppPanel from "@/components/WhatsAppPanel";
import type { ChatMessage, RobotState } from "@/lib/types";

export default function Home() {
  const [robotState, setRobotState] = useState<RobotState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [micOn, setMicOn] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function toggleMic() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Sorry, your browser doesn't support voice input. Try Chrome or Edge.");
      return;
    }

    // getUserMedia (which SpeechRecognition relies on) is only available in
    // secure contexts: https:// or http://localhost. Loading the app via a
    // LAN IP (e.g. http://192.168.x.x:3000) silently fails otherwise.
    if (!window.isSecureContext) {
      alert(
        "Voice input needs a secure connection. Open this page via https:// or http://localhost, not a plain IP address."
      );
      return;
    }

    if (micOn) {
      recognitionRef.current?.stop();
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
        alert(
          "Didn't hear anything. Check that your microphone isn't muted and that Windows hasn't blocked browser microphone access (Settings > Privacy & security > Microphone)."
        );
        return;
      }
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
    let ok = true;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send the whole conversation so far, not just the latest message,
          // so Milo can remember what was said earlier.
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
    } catch {
      ok = false;
      replyText = "Uh oh, my circuits glitched. Can you try that again?";
    }

    clearTimers();
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, sender: "milo", text: replyText, files: replyFiles, whatsapp: replyWhatsapp },
    ]);
    setRobotState(ok ? "speaking" : "idle");
    timers.current.push(setTimeout(() => setRobotState("idle"), 1800));
  }

  return (
    <div className="flex flex-col flex-1 items-center gap-6 bg-zinc-50 py-10 px-4">
      <h1 className="text-2xl font-bold text-slate-800">Milo the Robot</h1>

      <RobotFace state={robotState} />

      <WhatsAppPanel />

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
          title={micOn ? "Listening… click to stop" : "Speak to Milo"}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            micOn ? "bg-red-500 text-white animate-pulse" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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
