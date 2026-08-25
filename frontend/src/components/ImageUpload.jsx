import { useState } from "react";

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;

export default function ImageUpload({ value = [], onChange, max = 5, label = "Photos" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!CLOUD || !PRESET) {
      setError("Image uploads aren't configured yet.");
      return;
    }
    if (value.length + files.length > max) {
      setError(`Maximum ${max} photos.`);
      return;
    }

    setError("");
    setBusy(true);

    try {
      const urls = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} is over 10MB.`);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
          { method: "POST", body: form }
        );
        const data = await res.json();
        if (data.secure_url) urls.push(data.secure_url);
        else setError(data.error?.message || "Upload failed.");
      }
      if (urls.length) onChange([...value, ...urls]);
    } catch {
      setError("Upload failed. Check your connection.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const remove = (url) => onChange(value.filter((u) => u !== url));

  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((url) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="h-20 w-28 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-sand-300 bg-white px-4 py-6 text-sm text-ink/55 hover:border-brand-500 hover:text-brand-600">
          <input type="file" accept="image/*" multiple onChange={upload}
                 disabled={busy} className="hidden" />
          {busy ? "Uploading…" : `Click to upload (${value.length}/${max})`}
        </label>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}