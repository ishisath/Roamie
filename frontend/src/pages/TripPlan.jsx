import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { aiApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AskAssistant from "../components/AskAssistant";

export default function TripPlan() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [drift, setDrift] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    aiApi.planDetail(id)
      .then((r) => {
        setPlan(r.data);
        setSaved(r.data.status === "SAVED");
      })
      .catch(() => setError("We couldn't find that trip plan."));

    aiApi.drift(id).then((r) => setDrift(r.data)).catch(() => {});
  }, [id]);

  const save = async () => {
    await aiApi.save(id);
    setSaved(true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <p className="py-40 text-center text-white/60">{error}</p>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="h-96 animate-pulse rounded-[18px] bg-night-800" />
        </div>
      </div>
    );
  }

  const days = plan.items.reduce((acc, item) => {
    (acc[item.day_number] ||= []).push(item);
    return acc;
  }, {});

  const packing = plan.inputs?.packing || [];
  const warnings = plan.inputs?.warnings || [];
  const dayCount = Object.keys(days).length;

  return (
    <div className="min-h-screen bg-night-900">
      <Navbar />
               <Link to="/plans" className="text-sm text-white/50 hover:text-white">
            ← All itineraries
          </Link>

      {/* header */}
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700/45 via-night-900 to-night-900" />
        <div className="pointer-events-none absolute -right-20 -top-10 h-80 w-80 rounded-full bg-saffron-500/12 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-saffron-400" />
                <span className="eyebrow text-white/80">AI suggestion · v{plan.version}</span>
              </span>

              <h1 className="headline mt-5 text-[clamp(2rem,5vw,3.5rem)] text-white">
                {plan.title}
              </h1>

              {plan.start_date && (
                <p className="mt-2 text-white/60">
                  {new Date(plan.start_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short" })} –{" "}
                  {new Date(plan.end_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric" })}
                  {` · ${dayCount} day${dayCount > 1 ? "s" : ""}`}
                </p>
              )}
            </div>

            <button
              onClick={save}
              disabled={saved}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {saved ? "✓ Saved" : "Save plan"}
            </button>
          </div>

          {plan.summary && (
            <p className="mt-6 max-w-2xl leading-relaxed text-white/75">{plan.summary}</p>
          )}

          {plan.total_est_cost > 0 && (
            <div className="mt-8 inline-flex items-baseline gap-3 rounded-2xl border border-white/12 bg-white/5 px-6 py-4 backdrop-blur">
              <span className="eyebrow text-white/45">Estimated total</span>
              <span className="font-display text-2xl font-bold text-white">
                LKR {Number(plan.total_est_cost).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* adaptive planning alert */}
        {drift?.has_drift && (
          <div className="mb-10 rounded-2xl border border-saffron-500/30 bg-saffron-500/10 p-6">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-saffron-400" />
              <h3 className="font-display font-semibold text-white">
                Conditions have changed since this plan was made
              </h3>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-white/75">
              {drift.issues.map((i, n) => <li key={n}>· {i.detail}</li>)}
            </ul>
            <p className="mt-4 text-xs text-white/45">
              Your plan hasn't changed. Adjust it yourself, or ask the assistant what to swap.
            </p>
          </div>
        )}

        {/* itinerary */}
        <div className="space-y-10">
          {Object.entries(days).map(([day, items]) => (
            <section key={day}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-500 font-display text-sm font-bold text-night-900">
                  {day}
                </span>
                <h2 className="font-display text-xl font-semibold text-white">Day {day}</h2>
                {items[0]?.weather_assumption?.condition && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {items[0].weather_assumption.condition} ·{" "}
                    {items[0].weather_assumption.temp_max}°C
                  </span>
                )}
                <span className="ml-auto text-sm text-white/45">
                  LKR {items.reduce((s, i) => s + Number(i.est_cost || 0), 0).toLocaleString()}
                </span>
              </div>

              <div className="mt-5 space-y-3 border-l border-white/12 pl-6">
                {items.map((item) => (
                  <div key={item.id}
                       className="relative rounded-2xl border border-white/10 bg-night-800/50 p-5">
                    <span className="absolute -left-[31px] top-6 h-2.5 w-2.5 rounded-full bg-saffron-500 ring-4 ring-night-900" />

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {item.start_time && (
                          <p className="font-mono text-xs text-saffron-400">
                            {item.start_time.slice(0, 5)}
                          </p>
                        )}
                        <h3 className="mt-0.5 font-display font-semibold text-white">
                          {item.title}
                        </h3>
                        {item.location_name && (
                          <p className="text-xs text-white/45">{item.location_name}</p>
                        )}
                        {item.description && (
                          <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {Number(item.est_cost) > 0 && (
                        <span className="shrink-0 font-display text-sm font-semibold text-white">
                          LKR {Number(item.est_cost).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {(packing.length > 0 || warnings.length > 0) && (
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {packing.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-night-800/50 p-6">
                <h3 className="eyebrow text-saffron-400">What to pack</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-white/75">
                  {packing.map((p, i) => <li key={i}>· {p}</li>)}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="rounded-2xl border border-saffron-500/25 bg-saffron-500/8 p-6">
                <h3 className="eyebrow text-saffron-400">Good to know</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-white/75">
                  {warnings.map((w, i) => <li key={i}>· {w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ---------- THE HANDOFF ---------- */}
        <div className="mt-14 overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-brand-700 via-brand-600 to-night-800 p-8 sm:p-10">
          <span className="eyebrow text-saffron-400">Make it real</span>
          <h3 className="headline mt-2 text-3xl uppercase text-white">
            Who's taking you?
          </h3>
          <p className="mt-3 max-w-lg text-white/75">
            Pick a guide, a driver, or both. Whoever you choose gets this itinerary
            automatically — so you don't have to explain it twice.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Link
              to={`/guides?plan=${id}`}
              className="group rounded-2xl bg-white/10 p-5 backdrop-blur transition hover:bg-white/20"
            >
              <span className="font-display text-lg font-semibold text-white">
                Choose a guide
              </span>
              <p className="mt-1 text-sm text-white/60">
                Someone who knows the ground
              </p>
              <span className="mt-3 inline-block text-saffron-400 transition group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              to={`/drivers?plan=${id}`}
              className="group rounded-2xl bg-white/10 p-5 backdrop-blur transition hover:bg-white/20"
            >
              <span className="font-display text-lg font-semibold text-white">
                Choose a driver
              </span>
              <p className="mt-1 text-sm text-white/60">
                Transport between every stop
              </p>
              <span className="mt-3 inline-block text-saffron-400 transition group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              to="/requests"
              className="group rounded-2xl bg-white/10 p-5 backdrop-blur transition hover:bg-white/20"
            >
              <span className="font-display text-lg font-semibold text-white">
                Ask for bids
              </span>
              <p className="mt-1 text-sm text-white/60">
                Let providers quote you
              </p>
              <span className="mt-3 inline-block text-saffron-400 transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-white/15 pt-5">
            <Link to="/packages" className="text-sm text-white/70 hover:text-white">
              Or browse ready-made packages →
            </Link>
            <Link to="/budget" className="text-sm text-white/70 hover:text-white">
              Set a budget for this trip →
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-white/35">
          Roamie's AI only recommends. Nothing is booked until you choose it yourself.
        </p>
      </main>

      <AskAssistant tripPlanId={id} />
      <Footer />
    </div>
  );
}