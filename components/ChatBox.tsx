import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

export default function ChatBox({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full max-w-md h-64 overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white p-4 flex flex-col gap-2">
      {messages.length === 0 && (
        <p className="text-sm text-slate-400 text-center m-auto">
          Say hello to Neo!
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
