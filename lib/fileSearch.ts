import fs from "fs/promises";
import os from "os";
import path from "path";

// Deliberately restricted:
//  - Only walks the user's home folder, never the whole C:\ drive. A full
//    drive scan would be slow, would trip over permission errors on system
//    folders, and would let Neo see files it has no business seeing.
//  - Read-only: it can only report paths it finds, it never opens, moves,
//    or deletes anything itself (opening is a separate, user-clicked step
//    — see resolveWithinHome below).
//  - Bounded depth/result/scan counts so a huge home folder can't make a
//    single chat message hang or return a massive payload.

export const SEARCH_ROOT = os.homedir();

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "AppData",
  "$Recycle.Bin",
  "System Volume Information",
]);
const MAX_RESULTS = 200;
const MAX_DEPTH = 12;
const MAX_ENTRIES_SCANNED = 20000;

export type FileSearchArgs = { extension?: string; query?: string };

export async function searchFiles({ extension, query }: FileSearchArgs) {
  const wantExt = extension?.replace(/^\./, "").toLowerCase();
  const wantQuery = query?.toLowerCase();
  const matches: string[] = [];
  let scanned = 0;
  let truncated = false;

  async function walk(dir: string, depth: number) {
    if (truncated || depth > MAX_DEPTH) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // permission denied or unreadable — skip quietly
    }

    for (const entry of entries) {
      if (truncated) return;

      scanned++;
      if (scanned > MAX_ENTRIES_SCANNED) {
        truncated = true;
        return;
      }

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
        await walk(path.join(dir, entry.name), depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).replace(/^\./, "").toLowerCase();
      if (wantExt && ext !== wantExt) continue;
      if (wantQuery && !entry.name.toLowerCase().includes(wantQuery)) continue;

      matches.push(path.join(dir, entry.name));
      if (matches.length >= MAX_RESULTS) {
        truncated = true;
        return;
      }
    }
  }

  await walk(SEARCH_ROOT, 0);
  return { searchedFolder: SEARCH_ROOT, count: matches.length, truncated, files: matches };
}

// Confirms a path is a real, existing file inside the user's home folder
// before anything is allowed to open it. Rejects anything that resolves
// outside SEARCH_ROOT (e.g. via "..") so a crafted path can never reach
// system files.
export async function resolveWithinHome(requestedPath: string): Promise<string | null> {
  const home = path.resolve(SEARCH_ROOT);
  const resolved = path.resolve(requestedPath);

  if (!resolved.toLowerCase().startsWith((home + path.sep).toLowerCase())) {
    return null;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }

  return resolved;
}
