import { NextResponse } from "next/server";
import OpenAI from "openai";
import { searchFiles, type FileSearchArgs } from "@/lib/fileSearch";
import { findContactNumber, buildWhatsAppLink } from "@/lib/contacts";
import { sendWhatsAppMessage, isWhatsAppAvailable } from "@/lib/whatsapp";
import { submitFeedbackForm, isFeedbackFormAvailable } from "@/lib/feedbackForm";

const MILO_INSTRUCTIONS = `You are Milo, a small friendly desktop AI robot.
You are curious, helpful and slightly playful.
Keep your responses short and conversational.
You enjoy helping your human learn and build things.
Respond naturally rather than sounding like a formal chatbot.

When greeting the user or introducing yourself, keep it short and about
your personality — don't list off your tools or capabilities (file
search, WhatsApp, etc.). Only mention what a specific tool does when the
user actually asks you to do that thing, or directly asks what you can
do.

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
they try again. It only works when Milo is run locally or on the robot
itself.`
}

${
  isFeedbackFormAvailable
    ? `You also have a submit_feedback_form tool for when the user says
something like "I want to give feedback" or "I want to raise a service
request". This fills out and submits a real, fixed government feedback
form — there is no draft/preview step in the form itself, so you must be
the review step. When triggered:
1. Ask for the three fields ONE AT A TIME, in this order: full name, then
   email address, then the feedback detail — don't ask for all three at
   once, since these come from spoken voice input and are easy to mishear.
   The email will likely come in spoken form (e.g. "john dot smith at
   gmail dot com") — always convert it to standard email format
   (john.smith@gmail.com) before using it anywhere, including the readback;
   never pass the literal spoken phrasing to the tool.
2. Once you have all three, read them back in a spoken sentence exactly as
   you understood them (say the normalized email address naturally) and
   ask the user to confirm before doing anything else, e.g. "Here's what
   I've got: name X, email Y, feedback Z — should I go ahead and submit
   that?"
3. Only call submit_feedback_form after the user clearly confirms (says
   yes/go ahead/submit it). If they say something is wrong, ask again for
   just that field and re-confirm — never call the tool on an unconfirmed
   guess.
4. Report the result plainly based on what the tool returns — only say it
   was submitted if the result says ok: true.`
    : `Submitting feedback via the government feedback form is NOT available
in this deployment (it needs a real browser this environment can't launch).
If the user asks to give feedback or raise a service request, tell them
that plainly instead of trying — it only works when Milo is run locally or
on the robot itself.`
}`;

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
  // (see lib/whatsapp.ts) — otherwise Milo could "call" it and get a
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
  ...(isFeedbackFormAvailable
    ? [
        {
          type: "function" as const,
          name: "submit_feedback_form",
          description:
            "Submit the fixed government feedback form for real, immediately, with no review step of its own — only call this after reading the three values back to the user and getting explicit confirmation.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The user's full name, as they said it.",
              },
              email: {
                type: "string",
                description: "The user's email address, as they said/confirmed it.",
              },
              feedbackDetail: {
                type: "string",
                description: "The exact feedback/service-request detail text to submit.",
              },
            },
            required: ["name", "email", "feedbackDetail"],
            additionalProperties: false,
          },
          strict: false,
        },
      ]
    : []),
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
    // what gives Milo memory of earlier turns — OpenAI sees the full
    // back-and-forth on every call, not just the latest message.
    let response = await client.responses.create({
      model: "gpt-5.6-luna",
      instructions: MILO_INSTRUCTIONS,
      input: messages,
      tools,
    });

    // If Milo called a tool, run the real action on our server and hand
    // the actual result back so it can answer with real data instead of
    // just telling the user how to do it themselves. We also keep the
    // last search/link results to send to the client as clickable links.
    let lastFiles: string[] | null = null;
    let lastWhatsapp: WhatsAppOutcome | null = null;

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

          if (call.name === "submit_feedback_form") {
            const result = await submitFeedbackForm({
              name: String(args.name ?? ""),
              email: String(args.email ?? ""),
              feedbackDetail: String(args.feedbackDetail ?? ""),
            });
            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify(result),
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
        instructions: MILO_INSTRUCTIONS,
        previous_response_id: response.id,
        input: toolOutputs,
        tools,
      });
    }

    return NextResponse.json({
      reply: response.output_text,
      files: lastFiles ?? undefined,
      whatsapp: lastWhatsapp ?? undefined,
    });
  } catch (error) {
    console.error("Milo chat error:", error);
    return NextResponse.json(
      { error: "Milo couldn't think of a reply. Please try again." },
      { status: 500 }
    );
  }
}
