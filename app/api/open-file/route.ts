import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { resolveWithinHome } from "@/lib/fileSearch";

// This route only opens a file after a human clicks a link in the UI — it
// is never called by Neo/the model itself. resolveWithinHome() also
// re-checks the path is a real file inside the user's home folder, so a
// crafted path can't escape to system files even if something tampered
// with the request.
export async function POST(request: Request) {
  try {
    const { path: requestedPath } = await request.json();

    if (typeof requestedPath !== "string" || !requestedPath.trim()) {
      return NextResponse.json({ error: "Request body must include a 'path' string." }, { status: 400 });
    }

    const safePath = await resolveWithinHome(requestedPath);
    if (!safePath) {
      return NextResponse.json({ error: "That file could not be found in your home folder." }, { status: 404 });
    }

    // explorer.exe opens the file with whatever app Windows has associated
    // with it — the same thing double-clicking it in File Explorer does.
    // It's launched via execFile (no shell), so the path can't be
    // interpreted as extra command arguments.
    execFile("explorer.exe", [safePath], () => {
      // explorer.exe routinely reports a non-zero exit code even when it
      // successfully opens the file, so we don't treat that as an error.
    });

    return NextResponse.json({ opened: true });
  } catch (error) {
    console.error("Neo open-file error:", error);
    return NextResponse.json({ error: "Couldn't open that file." }, { status: 500 });
  }
}
