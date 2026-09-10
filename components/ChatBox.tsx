import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

function FileLink({ path }: { path: string }) {
  const [status, setStatus] = useState<"idle" | "opening" | "error">("idle");
  const name = path.split(/[/\\]/).pop() ?? path;

  async function open() {
    setStatus("opening");
    try {
      const res = await fetch("/api/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button
      onClick={open}
      title={path}
      className="block w-full truncate text-left text-xs underline decoration-dotted text-sky-700 hover:text-sky-900"
    >
      {status === "opening" ? "Opening…" : name}
      {status === "error" && <span className="text-red-500 no-underline"> (couldn&apos;t open)</span>}
    </button>
  );
}

export default function ChatBox({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full max-w-md h-64 overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white p-4 flex flex-col gap-2">
      {messages.length === 0 && (
        <p className="text-sm text-slate-400 text-center m-auto">
          Say hello to Milo!
        </p>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
            message.sender === "user"
              ? "self-end bg-sky-500 text-white"
              : "self-start bg-slate-100 text-slate-800"
          }`}
        >
          {message.text}

          {message.files && message.files.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
              {message.files.map((path) => (
                <FileLink key={path} path={path} />
              ))}
            </div>
          )}

          {message.whatsapp && (
            <div className="mt-2 border-t border-slate-200 pt-2">
              {message.whatsapp.sent ? (
                <span className="text-xs font-medium text-emerald-700">
                  ✅ Sent to {message.whatsapp.contactName}
                </span>
              ) : message.whatsapp.url ? (
                <a
                  href={message.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  Open WhatsApp draft to {message.whatsapp.contactName}
                </a>
              ) : (
                <span className="text-xs font-medium text-red-500">
                  Couldn&apos;t message {message.whatsapp.contactName}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
