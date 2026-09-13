export default function ChooseCreateMode({
  onDescribe,
  onUpload,
  onClose,
}: {
  onDescribe: () => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Create a character</h2>
        <div className="flex flex-col gap-3">
          <button onClick={onDescribe} className="rounded-xl border-2 border-slate-200 px-4 py-3 text-left hover:border-sky-400">
            <span className="block text-sm font-medium text-slate-800">Describe a character</span>
            <span className="block text-xs text-slate-500">AI generates an avatar from your description</span>
          </button>
          <button onClick={onUpload} className="rounded-xl border-2 border-slate-200 px-4 py-3 text-left hover:border-sky-400">
            <span className="block text-sm font-medium text-slate-800">Upload a photo</span>
            <span className="block text-xs text-slate-500">Use your own picture instead</span>
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
