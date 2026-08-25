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
    aiApi.planDetail(id)
      .then((r) => {
        setPlan(r.data);
        setSaved(r.data.status === "SAVED");
      })
      .catch(() => setError("Trip plan not found"));

    aiApi.drift(id).then((r) => setDrift(r.data)).catch(() => {});
  }, [id]);

  const save = async () => {
    await aiApi.save(id);
    setSaved(true);
  };

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="py-32 text-center text-ink/60">{error}</p>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="h-96 animate-pulse rounded-xl bg-sand-100" />
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

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              AI suggestion · v{plan.version}
            </span>
            <h1 className="mt-3 text-3xl font-semibold">{plan.title}</h1>
            {plan.start_date && (
              <p className="mt-1 text-ink/60">
                {new Date(plan.start_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short",
                })}{" "}
                –{" "}
                {new Date(plan.end_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            )}
          </div>
          <button
            onClick={save}
            disabled={saved}
            className="rounded-lg border border-sand-300 bg-white px-4 py-2 text-sm font-medium hover:bg-sand-100 disabled:opacity-60"
          >
            {saved ? "✓ Saved" : "Save plan"}
          </button>
        </div>

        {plan.summary && (
          <p className="mt-5 leading-relaxed text-ink/80">{plan.summary}</p>
        )}

        {/* Adaptive planning alert */}
        {drift?.has_drift && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-semibold text-amber-900">Conditions have changed</h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {drift.issues.map((i, n) => <li key={n}>• {i.detail}</li>)}
            </ul>
            <p className="mt-3 text-xs text-amber-700">
              Your plan is unchanged — adjust it yourself if you'd like.
            </p>
          </div>
        )}

        {plan.total_est_cost > 0 && (
          <div className="mt-6 flex items-baseline justify-between rounded-xl border border-sand-300 bg-white px-5 py-4">
            <span className="text-sm text-ink/60">Estimated total</span>
            <span className="text-2xl font-semibold text-brand-600">
              LKR {Number(plan.total_est_cost).toLocaleString()}
            </span>
          </div>
        )}

        {/* Itinerary */}
        <div className="mt-8 space-y-8">
          {Object.entries(days).map(([day, items]) => (
            <section key={day}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {day}
                </span>
                <h2 className="text-lg font-semibold">Day {day}</h2>
                {items[0]?.weather_assumption?.condition && (
                  <span className="rounded-full bg-sand-100 px-3 py-1 text-xs">
                    {items[0].weather_assumption.condition} ·{" "}
                    {items[0].weather_assumption.temp_max}°C
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3 border-l-2 border-sand-300 pl-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl border border-sand-300 bg-white p-4"
                  >
                    <span className="absolute -left-[31px] top-5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {item.start_time && (
                          <span className="text-xs font-medium text-brand-600">
                            {item.start_time.slice(0, 5)}
                          </span>
                        )}
                        <h3 className="font-medium">{item.title}</h3>
                        {item.location_name && (
                          <p className="text-xs text-ink/55">{item.location_name}</p>
                        )}
                        {item.description && (
                          <p className="mt-1.5 text-sm text-ink/70">{item.description}</p>
                        )}
                      </div>
                      {Number(item.est_cost) > 0 && (
                        <span className="shrink-0 text-sm font-medium">
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
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {packing.length > 0 && (
              <div className="rounded-xl border border-sand-300 bg-white p-5">
                <h3 className="font-semibold">What to pack</h3>
                <ul className="mt-2 space-y-1 text-sm text-ink/75">
                  {packing.map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-semibold text-amber-900">Good to know</h3>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* The traveller decides */}
        <div className="mt-10 rounded-xl bg-brand-700 p-6 text-white">
          <h3 className="text-lg font-semibold">Ready to make it real?</h3>
          <p className="mt-1 text-sm text-sand-100/85">
            This is only a suggestion. Choose what you actually want to book.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/packages" className="rounded-lg bg-white px-4 py-2 font-medium text-brand-700 hover:bg-sand-50">
              Book a package
            </Link>
            <Link to="/destinations" className="rounded-lg bg-white/15 px-4 py-2 backdrop-blur hover:bg-white/25">
              Find a guide
            </Link>
            <Link to="/destinations" className="rounded-lg bg-white/15 px-4 py-2 backdrop-blur hover:bg-white/25">
              Find a driver
            </Link>
          </div>
        </div>
      </main>

      <AskAssistant tripPlanId={id} />
      <Footer />
    </div>
  );
}