// Resolves a search query to a real, embeddable YouTube video ID via the
// official Data API v3 — the listType=search embed trick (no API key
// needed) turned out to be unreliable in practice (YouTube frequently
// serves "This video is unavailable" for it), so this is the supported
// replacement: search server-side, then embed the returned video ID
// normally with youtube.com/embed/<id>, which is a fully documented,
// stable embed method.
export async function searchYoutubeVideoId(query: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !query) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0]?.id?.videoId ?? null;
  } catch {
    return null;
  }
}
