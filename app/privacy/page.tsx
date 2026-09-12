export const metadata = {
  title: "Privacy Policy — Neo the Robot",
};

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 text-sm leading-relaxed text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy for Neo the Robot</h1>
      <p className="text-slate-500">Last updated: 2026-09-12</p>

      <p>
        Neo the Robot (&quot;Neo&quot;, &quot;the app&quot;) is a personal hobby project. This
        page explains what happens to your data when you use it.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Voice input</h2>
      <p>
        When you use the microphone, your speech is processed by your browser&apos;s built-in
        speech recognition (the Web Speech API) to convert it to text. Neo does not record or
        store audio itself — only the resulting text is sent to Neo&apos;s chat backend, the same
        as if you had typed it.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Chat messages</h2>
      <p>
        Text you send to Neo (typed or transcribed from speech) is sent to OpenAI&apos;s API to
        generate a reply. Conversation history is kept only in your browser for the current
        session — Neo&apos;s server does not store a database of your conversations.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Song playback</h2>
      <p>
        If you ask Neo to play a song, your search text is sent to the YouTube Data API to find a
        matching video, which then plays in an embedded YouTube player subject to{" "}
        <a
          className="text-sky-600 underline"
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google&apos;s own privacy policy
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold text-slate-900">File search &amp; WhatsApp</h2>
      <p>
        Neo can optionally search local files or send WhatsApp messages when run on a personal
        computer with those features enabled. These act only on the local machine and WhatsApp
        account they are configured with, and are not available on the public hosted version of
        the app.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">No accounts, no ads, no tracking</h2>
      <p>
        Neo does not require sign-in, does not show ads, and does not use analytics or
        advertising trackers.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
      <p>
        This is a personal project. If you have questions about this policy, contact the
        developer directly.
      </p>
    </div>
  );
}
