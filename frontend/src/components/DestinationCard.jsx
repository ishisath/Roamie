import { Link } from "react-router-dom";

export default function DestinationCard({ d }) {
  return (
    <Link
      to={`/destinations/${d.slug}`}
      className="group overflow-hidden rounded-xl border border-sand-300 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-44 overflow-hidden bg-sand-100">
        {d.photos?.[0] ? (
          <img
            src={d.photos[0].url}
            alt={d.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            No photo
          </div>
        )}
        {d.is_trending && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
            Trending
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{d.name}</h3>
          {d.rating_avg > 0 && (
            <span className="shrink-0 text-sm text-ink/70">★ {Number(d.rating_avg).toFixed(1)}</span>
          )}
        </div>
        <p className="text-xs text-ink/55">{d.region}</p>
        <p className="mt-2 line-clamp-2 text-sm text-ink/70">{d.description}</p>
        {d.est_cost_min && (
          <p className="mt-3 text-sm font-medium text-brand-600">
            From LKR {Number(d.est_cost_min).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}