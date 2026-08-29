import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { providersApi, aiApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useTilt } from "../hooks/useTilt";

const LANGUAGES = ["English", "Sinhala", "Tamil", "German", "French"];

function ProviderCard({ p, planId }) {
  const tilt = useTilt(6);
  const to = planId
    ? `/providers/${p.user_id}?plan=${planId}`
    : `/providers/${p.user_id}`;

  return (
    <Link
      to={to}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className="group relative block overflow-hidden rounded-[18px] border border-white/10
                 bg-night-800/60 p-6 transition-[transform,box-shadow,border-color] duration-300
                 will-change-transform hover:border-white/20
                 hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.9)]"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-saffron-500/10 blur-2xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start gap-4">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center
                         overflow-hidden rounded-full bg-gradient-to-br from-brand-500
                         to-brand-700 font-display text-xl font-bold text-white">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt=""
                 className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            p.full_name.charAt(0)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-lg font-semibold text-white">
              {p.full_name}
            </h3>
            {p.is_verified && (
              <span className="shrink-0 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-200">
                VERIFIED
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-white/45">
            {p.years_experience} year{p.years_experience === 1 ? "" : "s"} experience
          </p>
        </div>
      </div>

      {p.bio && (
        <p className="relative mt-4 line-clamp-2 text-sm leading-relaxed text-white/65">
          {p.bio}
        </p>
      )}

      {p.vehicle_summary && (
        <p className="relative mt-3 text-sm text-saffron-400">{p.vehicle_summary}</p>
      )}

      {p.languages?.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {p.languages.slice(0, 4).map((l) => (
            <span key={l} className="rounded-full border border-white/12 px-2.5 py-0.5 text-xs text-white/60">
              {l}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-5 flex items-end justify-between border-t border-white/10 pt-4">
        <div>
          {p.rating_avg > 0 ? (
            <>
              <span className="font-display text-2xl font-bold text-white">
                {Number(p.rating_avg).toFixed(1)}
              </span>
              <span className="ml-1 text-sm text-saffron-500">★</span>
              <span className="ml-1.5 text-xs text-white/40">({p.rating_count})</span>
            </>
          ) : (
            <span className="text-xs text-white/40">No reviews yet</span>
          )}
        </div>
        {p.daily_rate > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Per day</p>
            <p className="font-display font-semibold text-white">
              LKR {Number(p.daily_rate).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Providers({ kind }) {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") || "";
  const language = params.get("language") || "";
  const sort = params.get("sort") || "rating";
  const minSeats = params.get("min_seats") || "";
  const planId = params.get("plan");

  const [search, setSearch] = useState(q);

  useEffect(() => {
    if (planId) {
      aiApi.planDetail(planId).then((r) => setPlan(r.data)).catch(() => {});
    }
  }, [planId]);

  useEffect(() => {
    setLoading(true);
    const call = kind === "guides" ? providersApi.guides : providersApi.drivers;
    call({
      q: q || undefined,
      language: language || undefined,
      min_seats: kind === "drivers" && minSeats ? minSeats : undefined,
      sort,
    })
      .then((r) => setList(r.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [kind, q, language, sort, minSeats]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };

  const isGuides = kind === "guides";

  return (
    <div className="min-h-screen bg-night-900">
      <Navbar />

      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/40 via-night-900 to-night-900" />
        <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-64 w-64 rounded-full bg-saffron-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <span className="eyebrow text-saffron-400">
            {isGuides ? "Licensed, admin-verified" : "Verified drivers and vehicles"}
          </span>
          <h1 className="headline mt-3 text-[clamp(2.5rem,6vw,4.5rem)] uppercase text-white">
            {isGuides ? "Tour guides" : "Drivers"}
          </h1>
          <p className="mt-3 max-w-lg text-white/60">
            {list.length} available. Compare rates, languages and reviews — you pick
            who takes you, never the other way round.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); update("q", search); }}
            className="mt-8 flex max-w-lg gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isGuides ? "Search guides by name…" : "Search drivers by name…"}
              className="flex-1 rounded-full border border-white/15 bg-white/8 px-5 py-3
                         text-white placeholder:text-white/40 backdrop-blur
                         outline-none focus:border-saffron-400"
            />
            <button className="rounded-full bg-white px-6 py-3 font-medium text-night-900 transition hover:bg-white/90">
              Search
            </button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {plan && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-saffron-500/30 bg-saffron-500/10 px-6 py-4">
            <div>
              <p className="eyebrow text-saffron-400">Booking for your itinerary</p>
              <p className="mt-1 font-display font-semibold text-white">{plan.title}</p>
              <p className="mt-0.5 text-sm text-white/60">
                Whoever you pick will see this plan once the booking is confirmed.
              </p>
            </div>
            <Link
              to={`/plans/${planId}`}
              className="rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:bg-white/10"
            >
              View itinerary
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => update("language", "")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              !language ? "bg-saffron-500 text-night-900"
                        : "border border-white/15 text-white/70 hover:text-white"
            }`}
          >
            All languages
          </button>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => update("language", l)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                language === l ? "bg-saffron-500 text-night-900"
                              : "border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}

          {kind === "drivers" && (
            <select
              value={minSeats}
              onChange={(e) => update("min_seats", e.target.value)}
              className="rounded-full border border-white/15 bg-night-800 px-4 py-1.5 text-sm text-white outline-none"
            >
              <option value="">Any size</option>
              <option value="4">4+ seats</option>
              <option value="8">8+ seats</option>
              <option value="15">15+ seats</option>
            </select>
          )}

          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="ml-auto rounded-full border border-white/15 bg-night-800 px-4 py-1.5 text-sm text-white outline-none"
          >
            <option value="rating">Highest rated</option>
            <option value="experience">Most experienced</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[18px] bg-night-800" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="mt-20 text-center text-white/50">
            No {kind} match these filters. Try clearing the language filter.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <ProviderCard key={p.user_id} p={p} planId={planId} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}