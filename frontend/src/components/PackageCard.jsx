import { Link } from "react-router-dom";

export default function PackageCard({ p }) {
  return (
    <Link
      to={`/packages/${p.id}`}
      className="group overflow-hidden rounded-xl border border-sand-300 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="h-40 overflow-hidden bg-sand-100">
        {p.photos?.[0] ? (
          <img
            src={p.photos[0].url}
            alt={p.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            No photo
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold leading-tight">{p.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-sand-100 px-2 py-1">
            {p.duration_days} day{p.duration_days > 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-sand-100 px-2 py-1">
            Max {p.max_travelers}
          </span>
          <span
            className={`rounded-full px-2 py-1 ${
              p.transport_included
                ? "bg-brand-50 text-brand-700"
                : "bg-sand-100 text-ink/60"
            }`}
          >
            {p.transport_included ? "Transport included" : "No transport"}
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-semibold text-brand-600">
            {p.currency} {Number(p.price).toLocaleString()}
          </span>
          {p.rating_avg > 0 && (
            <span className="text-sm text-ink/70">
              ★ {Number(p.rating_avg).toFixed(1)} ({p.rating_count})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}