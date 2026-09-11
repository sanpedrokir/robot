import { NextResponse } from "next/server";
import OpenAI from "openai";
import { searchFiles, type FileSearchArgs } from "@/lib/fileSearch";
import { findContactNumber, buildWhatsAppLink } from "@/lib/contacts";
import { sendWhatsAppMessage, isWhatsAppAvailable } from "@/lib/whatsapp";
import { searchYoutubeVideoId } from "@/lib/youtube";

const BOBBY_INSTRUCTIONS = `You are Bobby, a small friendly desktop AI robot.
You are curious, helpful and slightly playful.
Keep your responses short and conversational.
You enjoy helping your human learn and build things.
Respond naturally rather than sounding like a formal chatbot.

When greeting the user or introducing yourself, keep it short and about
your personality, but do mention that you can play songs — e.g. "Hey,
I'm Bobby! I can chat, help you out, and even play a song if you'd
like." Don't list your other tools/capabilities (file search, WhatsApp,
etc.) in the intro — only mention those when the user actually asks you
to do that thing, or directly asks what you can do.

Your replies are read aloud by text-to-speech, so talk like a person
answering a friend out loud, not like written chat text. When the user
asks you to do something (find files, send a message, etc.), open with a
short, natural acknowledgment in your own voice — vary it, e.g. "Sure
thing!", "On it.", "Okay!", "Your wish is my command.", "Got it, one
sec." — then follow up with the real result once you have it. For plain
questions or chit-chat, just answer directly and warmly, the way a
person would, without needing an acknowledgment first.

You have a search_files tool that can look for real files on the user's
computer. Use it whenever the user asks you to find, list, or count files
(e.g. "find my PDFs", "do I have any spreadsheets"). It only searches the
user's home folder (Desktop, Documents, Downloads, Pictures, etc.), not the
whole drive, and it cannot open, move, or delete anything — tell the user
that if a search comes back empty or they ask for something outside that
folder.

${
  isWhatsAppAvailable
    ? `You also have a send_whatsapp_message tool for when the user asks you to
WhatsApp/message someone by name. When WhatsApp is connected, this tool
sends the message for real, immediately — there is no review step, so only
call it when you're confident about the contact name and the exact message
text. Only tell the user a message was "sent" if the tool result says
sent: true. If it says WhatsApp isn't connected yet, tell the user to open
the WhatsApp panel in the app and scan the QR code first. If the contact
name isn't found, tell the user and suggest they add that contact.`
    : `WhatsApp messaging is NOT available in this deployment (it requires a
persistent local session this environment can't provide). If the user asks
you to send a WhatsApp message, tell them that plainly — don't suggest
adding a contact or scanning a QR code, and don't imply it might work if
they try again. It only works when Bobby is run locally or on the robot
itself.`
}

You also have a play_song tool for when the user asks you to play a song,
or asks for music by mood/artist/vibe and you've picked a specific track.
Call it with a search query of the song title plus artist if you know it
(e.g. "Stairway to Heaven Led Zeppelin"). If the tool result says
started: true, acknowledge what's now playing (e.g. "Playing Stairway to
Heaven by Led Zeppelin!") — don't ask for confirmation first. If it says
started: false, apologize briefly and say you couldn't find a playable
video for that — don't claim it's playing.`;

// This client is created on the server only. Because OPENAI_API_KEY has no
// NEXT_PUBLIC_ prefix, Next.js never bundles it into client-side JavaScript.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatTurn = { role: "user" | "assistant"; content: string };

function isChatTurn(value: unknown): value is ChatTurn {
  const turn = value as ChatTurn;
  return (
    typeof turn === "object" &&
    turn !== null &&
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string" &&
    turn.content.trim().length > 0
  );
}

const tools = [
  {
    type: "function" as const,
    name: "search_files",
    description:
      "Search for files by extension and/or name within the user's home folder on this computer (Desktop, Documents, Downloads, Pictures, etc). Read-only — cannot open, move, or delete files. Does not search the whole drive.",
    parameters: {
      type: "object",
      properties: {
        extension: {
          type: "string",
          description: "File extension to filter by, without the dot, e.g. 'pdf'.",
        },
        query: {
          type: "string",
          description: "Case-insensitive substring to match against the file name.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    strict: false,
  },
  // Only offered to the model when this deployment can actually act on it
  // (see lib/whatsapp.ts) — otherwise Bobby could "call" it and get a
  // confusing tool-level failure instead of just explaining upfront that
  // WhatsApp isn't available here.
  ...(isWhatsAppAvailable
    ? [
        {
          type: "function" as const,
          name: "send_whatsapp_message",
          description:
            "Send a WhatsApp message to a named contact immediately, with no review step, if WhatsApp is connected. Falls back to a draft link if it isn't connected or the number isn't reachable.",
          parameters: {
            type: "object",
            properties: {
              contactName: {
                type: "string",
                description: "The friend's name, as the user referred to them, e.g. 'Norman'.",
              },
              message: {
                type: "string",
                description: "The exact message text to send.",
              },
            },
            required: ["contactName", "message"],
            additionalProperties: false,
          },
          strict: false,
        },
      ]
    : []),
  {
    type: "function" as const,
    name: "play_song",
    description: "Search YouTube for a song and immediately auto-play the top result in an embedded player.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for the song, ideally 'song title artist name', e.g. 'Stairway to Heaven Led Zeppelin'.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    strict: false,
  },
];

type WhatsAppOutcome = {
  contactName: string;
  sent: boolean;
  url?: string;
  reason?: string;
};

const MAX_TOOL_ROUNDS = 4;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isChatTurn)) {
      return NextResponse.json(
        {
          error:
            "Request body must include a non-empty 'messages' array of { role: 'user' | 'assistant', content }.",
        },
        { status: 400 }
      );
    }

    // Passing the whole conversation as `input` (instead of one string) is
    // what gives Bobby memory of earlier turns — OpenAI sees the full
    // back-and-forth on every call, not just the latest message.
    let response = await client.responses.create({
      model: "gpt-5.6-luna",
      instructions: BOBBY_INSTRUCTIONS,
      input: messages,
      tools,
    });

    // If Bobby called a tool, run the real action on our server and hand
    // the actual result back so it can answer with real data instead of
    // just telling the user how to do it themselves. We also keep the
    // last search/link results to send to the client as clickable links.
    let lastFiles: string[] | null = null;
    let lastWhatsapp: WhatsAppOutcome | null = null;
    let lastSong: { query: string; videoId: string } | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const functionCalls = response.output.filter((item) => item.type === "function_call");
      if (functionCalls.length === 0) break;

      const toolOutputs = await Promise.all(
        functionCalls.map(async (call) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.arguments);
          } catch {
            // malformed args from the model — fall back to empty args
          }

          if (call.name === "search_files") {
            const result = await searchFiles(args as FileSearchArgs);
            lastFiles = result.files;
            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify(result),
            };
          }

          if (call.name === "send_whatsapp_message") {
            const contactName = String(args.contactName ?? "");
            const message = String(args.message ?? "");
            const number = await findContactNumber(contactName);

            let result: Record<string, unknown>;
            if (!number) {
              lastWhatsapp = { contactName, sent: false, reason: "contact_not_found" };
              result = { sent: false, contactName, reason: "contact_not_found" };
            } else {
              const sendResult = await sendWhatsAppMessage(number, message);
              if (sendResult.ok) {
                lastWhatsapp = { contactName, sent: true };
                result = { sent: true, contactName };
              } else {
                // Couldn't send for real (e.g. WhatsApp not linked yet) —
                // fall back to a draft link the user can open themselves.
                const url = buildWhatsAppLink(number, message);
                lastWhatsapp = { contactName, sent: false, url, reason: sendResult.reason };
                result = { sent: false, contactName, reason: sendResult.reason, fallbackUrl: url };
              }
            }

            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify(result),
            };
          }

          if (call.name === "play_song") {
            const query = String(args.query ?? "").trim();
            const videoId = query ? await searchYoutubeVideoId(query) : null;
            lastSong = videoId ? { query, videoId } : null;
            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify({
                started: Boolean(videoId),
                reason: videoId ? undefined : "No playable video found for that search.",
              }),
            };
          }

          return {
            type: "function_call_output" as const,
            call_id: call.call_id,
            output: JSON.stringify({ error: "Unknown tool" }),
          };
        })
      );

      response = await client.responses.create({
        model: "gpt-5.6-luna",
        instructions: BOBBY_INSTRUCTIONS,
        previous_response_id: response.id,
        input: toolOutputs,
        tools,
      });
    }

    return NextResponse.json({
      reply: response.output_text,
      files: lastFiles ?? undefined,
      whatsapp: lastWhatsapp ?? undefined,
      song: lastSong ?? undefined,
    });
  } catch (error) {
    console.error("Bobby chat error:", error);
    return NextResponse.json(
      { error: "Bobby couldn't think of a reply. Please try again." },
      { status: 500 }
    );
  }
}
