import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { destinationsApi, packagesApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MapView from "../components/MapView";
import PhotoCard from "../components/PhotoCard";
import { useParallax, usePointer } from "../hooks/useTilt";
import AskAssistant from "../components/AskAssistant";

function Chips({ title, items, tone = "default" }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="eyebrow text-saffron-400">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => (
          <span
            key={i}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              tone === "solid"
                ? "bg-white/10 text-white"
                : "border border-white/12 text-white/75"
            }`}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DestinationDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState("");
  const scrollY = useParallax();
  const pointer = usePointer();

  useEffect(() => {
    window.scrollTo(0, 0);
    destinationsApi.detail(slug)
      .then((r) => setD(r.data))
      .catch(() => setError("We couldn't find that destination."));

    packagesApi.search({ destination: slug, size: 3 })
      .then((r) => setPackages(r.data.items))
      .catch(() => {});
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-40 text-center">
          <p className="text-white/60">{error}</p>
          <Link to="/destinations" className="mt-4 inline-block text-saffron-400 hover:underline">
            Browse all destinations
          </Link>
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <div className="h-[70vh] animate-pulse bg-night-800" />
      </div>
    );
  }

  const photo = d.photos?.[0]?.url;

  return (
    <div className="bg-night-900">
      <Navbar overlay />

      {/* full-bleed header */}
      <section className="relative h-[80vh] min-h-[34rem] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(${pointer.x * -12}px, ${scrollY * 0.3}px, 0) scale(1.12)`,
            transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-night-900" />
          {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/45 to-night-900/55" />

        <div
          className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-16"
          style={{ transform: `translateY(${scrollY * -0.12}px)` }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {d.category && (
              <span className="rounded-full bg-saffron-500 px-3 py-1 text-xs font-semibold text-night-900">
                {d.category.name}
              </span>
            )}
            {d.is_trending && (
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs text-white backdrop-blur">
                Trending
              </span>
            )}
          </div>

          <h1 className="headline mt-5 text-[clamp(2.75rem,7vw,5.5rem)] uppercase text-white">
            {d.name}
          </h1>
          <p className="mt-2 text-lg text-white/65">{d.region}, {d.country}</p>

          {/* quick facts strip */}
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/12 pt-6">
            {d.best_time_to_visit && (
              <div>
                <p className="eyebrow text-white/45">Best time</p>
                <p className="mt-1 font-display font-semibold text-white">{d.best_time_to_visit}</p>
              </div>
            )}
            {d.est_cost_min && (
              <div>
                <p className="eyebrow text-white/45">Typical cost</p>
                <p className="mt-1 font-display font-semibold text-white">
                  LKR {Number(d.est_cost_min).toLocaleString()}–{Number(d.est_cost_max).toLocaleString()}
                </p>
              </div>
            )}
            {d.rating_avg > 0 && (
              <div>
                <p className="eyebrow text-white/45">Rating</p>
                <p className="mt-1 font-display font-semibold text-white">
                  ★ {Number(d.rating_avg).toFixed(1)}
                </p>
              </div>
            )}
            {d.activities?.length > 0 && (
              <div>
                <p className="eyebrow text-white/45">Things to do</p>
                <p className="mt-1 font-display font-semibold text-white">
                  {d.activities.length} activities
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <p className="text-xl leading-relaxed text-white/80">{d.description}</p>

          <Chips title="Things to do" items={d.activities} tone="solid" />

          {d.popular_attractions?.length > 0 && (
            <div>
              <h3 className="eyebrow text-saffron-400">Don't miss</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {d.popular_attractions.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-night-800/60 p-4"
                  >
                    <span className="font-mono text-xs text-saffron-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 font-display font-semibold text-white">
                      {a.name || a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            <Chips title="What to wear" items={d.recommended_clothing} />
            <Chips title="What to bring" items={d.necessary_items} />
          </div>

          {d.travel_warnings && (
            <div className="rounded-2xl border border-saffron-500/30 bg-saffron-500/8 p-6">
              <h3 className="eyebrow text-saffron-400">Before you go</h3>
              <p className="mt-2 leading-relaxed text-white/80">{d.travel_warnings}</p>
            </div>
          )}

          <div>
            <h3 className="eyebrow text-saffron-400">Where it is</h3>
            <div className="mt-4 overflow-hidden rounded-[18px] border border-white/10">
              <MapView lat={d.lat} lng={d.lng} name={d.name} dark />
            </div>
          </div>
        </div>

        <aside>
          <div className="sticky top-24 space-y-4">
            <div className="rounded-[18px] border border-white/10 bg-night-800/70 p-6 backdrop-blur">
              <h3 className="font-display text-lg font-semibold text-white">
                Ready to go?
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Book a package here, or pick your own guide and driver.
              </p>

              <div className="mt-5 space-y-2">
                <Link
                  to={`/packages?destination=${d.slug}`}
                  className="block rounded-full bg-saffron-500 py-3 text-center font-medium text-night-900 transition hover:bg-saffron-400"
                >
                  See packages here
                </Link>
                <Link
                  to="/guides"
                  className="block rounded-full border border-white/15 py-3 text-center font-medium text-white transition hover:bg-white/10"
                >
                  Find a guide
                </Link>
                <Link
                  to="/drivers"
                  className="block rounded-full border border-white/15 py-3 text-center font-medium text-white transition hover:bg-white/10"
                >
                  Find a driver
                </Link>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                <Link to="/plan" className="text-sm text-saffron-400 hover:underline">
                  Or let AI plan the whole trip →
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {packages.length > 0 && (
        <section className="border-t border-white/8 bg-night-800/40 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <span className="eyebrow text-saffron-400">Led by verified guides</span>
            <h2 className="headline mt-2 text-4xl uppercase text-white">
              Packages at {d.name}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <PhotoCard
                  key={p.id}
                  to={`/packages/${p.id}`}
                  image={p.photos?.[0]?.url}
                  kicker={`${p.duration_days} day${p.duration_days > 1 ? "s" : ""}`}
                  title={p.title}
                  meta={`${p.currency} ${Number(p.price).toLocaleString()} per person`}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      <AskAssistant contextType="DESTINATION" contextId={d.id} label="Ask about this place" />
      <Footer />
      <Footer />
    </div>
  );
}