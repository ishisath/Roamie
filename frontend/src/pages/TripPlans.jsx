import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { aiApi, destinationsApi } from "../api/endpoints";
import { DashShell, Panel, Pill, EmptyState } from "../components/DashShell";

export default function TripPlans() {
  const [plans, setPlans] = useState([]);
  const [destMap, setDestMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([
      aiApi.plans().catch(() => ({ data: [] })),
      destinationsApi.search({ size: 50 }).catch(() => ({ data: { items: [] } })),
    ])
      .then(([p, d]) => {
        setPlans(p.data);
        const map = {};
        (d.data.items || []).forEach((x) => { map[x.id] = x; });
        setDestMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const shown = filter === "ALL" ? plans : plans.filter((p) => p.status === filter);
  const saved = plans.filter((p) => p.status === "SAVED").length;

  return (
    <DashShell
      eyebrow="AI planner"
      title="My itineraries"
      subtitle={`${plans.length} plan${plans.length === 1 ? "" : "s"} · ${saved} saved`}
      tabs={["All"]}
      tab="All"
      setTab={() => {}}
      backdrop={plans[0]?.destination_id
        ? destMap[plans[0].destination_id]?.photos?.[0]?.url
        : undefined}
      right={
        <Link to="/plan"
              className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
          Plan a new trip
        </Link>
      }
    >
      {plans.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[["ALL", "All"], ["SAVED", "Saved"], ["DRAFT", "Drafts"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                filter === v
                  ? "bg-saffron-500 font-medium text-night-900"
                  : "border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-800/70" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={plans.length === 0 ? "No itineraries yet" : "Nothing in this filter"}
          body={plans.length === 0
            ? "Tell the planner your dates, budget and interests and it drafts a day-by-day plan in about fifteen seconds."
            : "Try a different filter."}
          action={plans.length === 0 && (
            <Link to="/plan"
                  className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
              Plan a trip
            </Link>
          )}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const dest = p.destination_id ? destMap[p.destination_id] : null;
            const dayCount = new Set(p.items.map((i) => i.day_number)).size;

            return (
              <Link
                key={p.id}
                to={`/plans/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 backdrop-blur transition hover:border-white/25"
              >
                <div className="relative h-32 bg-slate-700">
                  {dest?.photos?.[0] && (
                    <img src={dest.photos[0].url} alt=""
                         className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                  <span className="absolute right-3 top-3">
                    <Pill tone={p.status === "SAVED" ? "brand" : "neutral"}>
                      {p.status === "SAVED" ? "Saved" : "Draft"}
                    </Pill>
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-display font-semibold text-white">{p.title}</h3>
                  {p.start_date && (
                    <p className="mt-1 text-xs text-white/45">
                      {new Date(p.start_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short" })} –{" "}
                      {new Date(p.end_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}

                  {p.summary && (
                    <p className="mt-3 line-clamp-2 text-sm text-white/60">{p.summary}</p>
                  )}

                  <div className="mt-4 flex items-end justify-between border-t border-white/8 pt-3">
                    <div className="text-xs text-white/45">
                      <span>{dayCount} day{dayCount === 1 ? "" : "s"}</span>
                      <span className="mx-1.5">·</span>
                      <span>{p.items.length} stops</span>
                    </div>
                    {p.total_est_cost > 0 && (
                      <span className="font-display font-semibold text-saffron-400">
                        LKR {Number(p.total_est_cost).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashShell>
  );
}