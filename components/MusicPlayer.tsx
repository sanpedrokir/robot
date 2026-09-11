export default function MusicPlayer({ query, onClose }: { query: string; onClose: () => void }) {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-slate-200 bg-black">
      <button
        onClick={onClose}
        title="Stop playback"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
      >
        ✕
      </button>
      {/* listType=search + list=<query> makes YouTube's embed player search
          and auto-play the top result — no API key/account needed. Keying
          on the query forces a fresh iframe (and a fresh search) when the
          song changes, rather than trying to update the src in place. */}
      <iframe
        key={query}
        width="100%"
        height="200"
        src={`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`}
        title="Now playing"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="block"
      />
    </div>
  );
}
