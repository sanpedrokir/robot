import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

// This client is created on the server only. Because OPENAI_API_KEY has no
// NEXT_PUBLIC_ prefix, Next.js never bundles it into client-side JavaScript.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE =
  "Digital illustration portrait avatar, semi-realistic art style, front-facing head-and-shoulders shot, plain simple neutral background, wearing a casual collared shirt.";

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Missing character description." }, { status: 400 });
    }
    // Keep prompts bounded — not a defense against a determined attacker,
    // just a sane cap on cost/latency per request.
    const safeDescription = description.trim().slice(0, 300);

    // Generate one reference image first, then *edit* that same image
    // (rather than generating three independent images) for the
    // smile/talking frames — this keeps the character's face and outfit
    // consistent across all three, the same problem a from-scratch
    // generation for each frame would otherwise have.
    // Compressed, lower-quality JPEGs rather than full-quality PNGs — this
    // avatar is only ever shown at up to 224px, and AWS Lambda (which
    // Amplify's SSR runs on) hard-caps a synchronous response at 6MB.
    // Three full-quality 1024x1024 PNGs round-tripped as base64 JSON blow
    // straight through that limit in production (though not in local dev,
    // which has no such cap — that's why this could pass local testing and
    // still fail once deployed).
    const imageParams = { output_format: "jpeg" as const, output_compression: 70, quality: "low" as const };

    const baseResult = await client.images.generate({
      model: "gpt-image-1",
      prompt: `${STYLE} The character: ${safeDescription}. This must be an original, fictional character design — not a real or historical person. Neutral, closed-mouth, gentle expression.`,
      size: "1024x1024",
      ...imageParams,
    });
    const baseB64 = baseResult.data?.[0]?.b64_json;
    if (!baseB64) throw new Error("No base image returned");
    const baseFile = await toFile(Buffer.from(baseB64, "base64"), "base.jpg", { type: "image/jpeg" });

    const [smileResult, talkResult] = await Promise.all([
      client.images.edit({
        model: "gpt-image-1",
        image: baseFile,
        prompt: "Same exact character, face, and outfit, now with a big happy smile showing teeth. Keep everything else identical.",
        ...imageParams,
      }),
      client.images.edit({
        model: "gpt-image-1",
        image: baseFile,
        prompt: "Same exact character, face, and outfit, now with mouth open as if mid-speech, talking. Keep everything else identical.",
        ...imageParams,
      }),
    ]);
    const smileB64 = smileResult.data?.[0]?.b64_json;
    const talkB64 = talkResult.data?.[0]?.b64_json;
    if (!smileB64 || !talkB64) throw new Error("No edited image returned");

    return NextResponse.json({
      closed: `data:image/jpeg;base64,${baseB64}`,
      smile: `data:image/jpeg;base64,${smileB64}`,
      talk: `data:image/jpeg;base64,${talkB64}`,
    });
  } catch (error) {
    console.error("Persona image generation error:", error);
    return NextResponse.json(
      { error: "Couldn't generate that character. Try a different description." },
      { status: 500 }
    );
  }
}
