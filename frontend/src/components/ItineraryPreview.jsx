export default function ItineraryPreview({ plan, dark = false }) {
  if (!plan?.items?.length) return null;

  const days = plan.items.reduce((acc, i) => {
    (acc[i.day_number] ||= []).push(i);
    return acc;
  }, {});

  const line = dark ? "text-white/70" : "text-ink-soft";
  const strong = dark ? "text-white" : "text-ink";
  const rule = dark ? "bg-white/15" : "bg-sand-200";

  return (
    <div className="space-y-6">
      {Object.entries(days).map(([day, items]) => (
        <div key={day}>
          <div className="flex items-center gap-3">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              dark ? "bg-saffron-500 text-night-900" : "bg-brand-600 text-white"
            }`}>
              {day}
            </span>
            <span className={`font-display text-sm font-semibold ${strong}`}>Day {day}</span>
            {items[0]?.weather_assumption?.condition && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                dark ? "bg-white/10 text-white/65" : "bg-sand-100 text-ink-soft"
              }`}>
                {items[0].weather_assumption.condition} · {items[0].weather_assumption.temp_max}°C
              </span>
            )}
          </div>

          <ul className="mt-3 space-y-3 pl-3.5">
            {items.map((it, i) => (
              <li key={it.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    dark ? "bg-white/40" : "bg-brand-500"
                  }`} />
                  {i < items.length - 1 && <span className={`mt-1 w-px flex-1 ${rule}`} />}
                </div>
                <div className="flex-1 pb-1">
                  {it.start_time && (
                    <p className={`text-xs ${line}`}>{it.start_time.slice(0, 5)}</p>
                  )}
                  <p className={`text-sm font-medium ${strong}`}>{it.title}</p>
                  {it.location_name && (
                    <p className={`text-xs ${line}`}>{it.location_name}</p>
                  )}
                  {it.description && (
                    <p className={`mt-1 text-sm ${line}`}>{it.description}</p>
                  )}
                </div>
                {Number(it.est_cost) > 0 && (
                  <span className={`shrink-0 text-xs ${line}`}>
                    LKR {Number(it.est_cost).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}