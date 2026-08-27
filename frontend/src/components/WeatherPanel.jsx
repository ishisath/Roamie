const ICON = {
  Clear: "☀", Clouds: "☁", Rain: "🌧", Drizzle: "🌦",
  Thunderstorm: "⛈", Mist: "🌫", Haze: "🌫", Fog: "🌫",
};

export default function WeatherPanel({ weather, dark = false }) {
  if (!weather || weather.mode === "UNAVAILABLE") return null;

  const text = dark ? "text-white" : "text-ink";
  const soft = dark ? "text-white/55" : "text-ink-soft";
  const card = dark
    ? "rounded-xl border border-white/10 bg-white/5"
    : "rounded-xl border border-sand-200 bg-sand-50";

  return (
    <div className="space-y-4">
      {weather.mode === "FORECAST" && weather.days.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weather.days.map((d) => (
            <div key={d.date} className={`${card} min-w-[6.5rem] shrink-0 p-3 text-center`}>
              <p className={`text-[11px] uppercase tracking-wide ${soft}`}>
                {new Date(d.date).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric",
                })}
              </p>
              <p className="mt-1.5 text-2xl">{ICON[d.condition] || "☁"}</p>
              <p className={`mt-1 font-display font-bold ${text}`}>
                {Math.round(d.temp_max)}°
                <span className={`ml-1 text-xs font-normal ${soft}`}>
                  {Math.round(d.temp_min)}°
                </span>
              </p>
              <p className={`mt-0.5 text-[11px] ${soft}`}>{d.condition}</p>
              {d.will_rain && (
                <p className="mt-1 text-[10px] text-sky-400">{d.rain_mm}mm</p>
              )}
            </div>
          ))}
        </div>
      )}

      {weather.note && (
        <p className={`rounded-lg px-3 py-2 text-xs ${
          dark ? "bg-white/5 text-white/60" : "bg-sand-50 text-ink-soft"
        }`}>
          {weather.note}
        </p>
      )}

      {weather.advice?.length > 0 && (
        <ul className="space-y-1.5">
          {weather.advice.map((a, i) => (
            <li key={i} className={`flex gap-2 text-sm ${soft}`}>
              <span className={dark ? "text-saffron-400" : "text-brand-600"}>·</span>
              {a}
            </li>
          ))}
        </ul>
      )}

      {(weather.recommended_clothing?.length > 0 ||
        weather.necessary_items?.length > 0) && (
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2"
             style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "#DFD8C6" }}>
          {weather.recommended_clothing?.length > 0 && (
            <div>
              <p className={`eyebrow ${dark ? "text-white/40" : "text-ink-soft"}`}>
                What to wear
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weather.recommended_clothing.map((c) => (
                  <span key={c} className={`rounded-full px-2.5 py-0.5 text-xs ${
                    dark ? "bg-white/10 text-white/70" : "bg-sand-100 text-ink-soft"
                  }`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weather.necessary_items?.length > 0 && (
            <div>
              <p className={`eyebrow ${dark ? "text-white/40" : "text-ink-soft"}`}>
                What to bring
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weather.necessary_items.map((c) => (
                  <span key={c} className={`rounded-full px-2.5 py-0.5 text-xs ${
                    dark ? "bg-white/10 text-white/70" : "bg-sand-100 text-ink-soft"
                  }`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {weather.travel_warnings && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          dark
            ? "border border-saffron-500/25 bg-saffron-500/10 text-white/75"
            : "border border-saffron-500/30 bg-saffron-50 text-ink-soft"
        }`}>
          <span className={dark ? "font-medium text-saffron-400" : "font-medium text-saffron-600"}>
            Before you go —{" "}
          </span>
          {weather.travel_warnings}
        </div>
      )}
    </div>
  );
}