import { useState } from "react";

export default function LocationInput({ value, onChange, onCoords,
                                        placeholder, className }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location sharing.");
      return;
    }

    setError("");
    setBusy(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        onCoords?.({ lat: latitude, lng: longitude });

        try {
          // OpenStreetMap reverse geocoding — free, no key
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const a = data.address || {};
          const parts = [
            a.road || a.neighbourhood || a.suburb,
            a.city || a.town || a.village,
          ].filter(Boolean);

          onChange(parts.join(", ") || data.display_name?.split(",").slice(0, 2).join(", ")
                   || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === 1
            ? "Location access was blocked. Type your pickup point instead."
            : "Couldn't get your location. Type it instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <button
          type="button"
          onClick={useCurrent}
          disabled={busy}
          title="Use my current location"
          className="mt-1.5 shrink-0 rounded-lg border border-sand-300 px-3 text-sm transition hover:bg-sand-100 disabled:opacity-50"
        >
          {busy ? "…" : "📍"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-clay-600">{error}</p>}
    </div>
  );
}