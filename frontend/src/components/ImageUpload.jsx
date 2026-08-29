import { useState } from "react";

/** Shrink and compress in the browser, then return a base64 data URL. */
function compress(file, maxWidth = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({
  value = [],
  onChange,
  max = 5,
  label = "Photos",
  hint,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");

    if (value.length + files.length > max) {
      setError(`You can add up to ${max} ${max === 1 ? "image" : "images"}.`);
      e.target.value = "";
      return;
    }

    setBusy(true);
    const added = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} isn't an image.`);
        continue;
      }
      if (file.size > 12 * 1024 * 1024) {
        setError(`${file.name} is too large — keep images under 12MB.`);
        continue;
      }
      try {
        added.push(await compress(file));
      } catch (err) {
        setError(err.message);
      }
    }

    if (added.length) onChange([...value, ...added]);
    setBusy(false);
    e.target.value = "";
  };

  const remove = (url) => onChange(value.filter((u) => u !== url));

  const single = max === 1;

  return (
    <div>
      {label && <label className="eyebrow text-white/45">{label}</label>}

      {value.length > 0 && (
        <div className={`mt-2 flex flex-wrap gap-2 ${single ? "" : ""}`}>
          {value.map((url) => (
            <div key={url.slice(0, 60)} className="group relative">
              <img
                src={url}
                alt=""
                className={`rounded-xl object-cover ${
                  single ? "h-32 w-32" : "h-20 w-28"
                }`}
              />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-night-900 text-xs text-white shadow-lg transition hover:bg-red-600"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <label
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 text-sm text-white/50 transition hover:border-saffron-400 hover:text-white ${
            single ? "h-32 w-32" : "px-4 py-6"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple={!single}
            onChange={handle}
            disabled={busy}
            className="hidden"
          />
          {busy ? (
            <span>Processing…</span>
          ) : (
            <>
              <span className="text-xl">＋</span>
              <span className="mt-1 text-xs">
                {single ? "Add photo" : `Add (${value.length}/${max})`}
              </span>
            </>
          )}
        </label>
      )}

      {hint && <p className="mt-2 text-xs text-white/35">{hint}</p>}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}