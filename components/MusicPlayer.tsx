export default function MusicPlayer({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-slate-200 bg-black">
      <button
        onClick={onClose}
        title="Stop playback"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
      >
        ✕
      </button>
      {/* A real, resolved video ID (via the YouTube Data API — see
          lib/youtube.ts) embedded the standard, fully-supported way.
          Keying on the id forces a fresh iframe when the song changes. */}
      <iframe
        key={videoId}
        width="100%"
        height="200"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title="Now playing"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="block"
      />
    </div>
  );
}
