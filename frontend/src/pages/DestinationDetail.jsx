import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { destinationsApi, packagesApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MapView from "../components/MapView";
import PackageCard from "../components/PackageCard";

function Chips({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink/80">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i} className="rounded-full bg-sand-100 px-3 py-1 text-sm">{i}</span>
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

  useEffect(() => {
    destinationsApi
      .detail(slug)
      .then((r) => setD(r.data))
      .catch(() => setError("Destination not found"));

    packagesApi
      .search({ destination: slug, size: 3 })
      .then((r) => setPackages(r.data.items))
      .catch(() => {});
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="py-32 text-center text-ink/60">{error}</p>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="h-80 animate-pulse rounded-xl bg-sand-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="relative h-80 bg-sand-100">
        {d.photos?.[0] && (
          <img src={d.photos[0].url} alt={d.name} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-auto max-w-6xl px-6 pb-8 text-white">
            {d.category && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">
                {d.category.name}
              </span>
            )}
            <h1 className="mt-3 text-4xl font-semibold">{d.name}</h1>
            <p className="text-sand-100/90">{d.region}, {d.country}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <p className="text-lg leading-relaxed text-ink/80">{d.description}</p>

          <Chips title="Things to do" items={d.activities} />

          {d.popular_attractions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink/80">Popular attractions</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {d.popular_attractions.map((a, i) => (
                  <li key={i}>• {a.name || a}</li>
                ))}
              </ul>
            </div>
          )}

          <Chips title="What to wear" items={d.recommended_clothing} />
          <Chips title="What to bring" items={d.necessary_items} />

          {d.travel_warnings && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Travel warnings</h3>
              <p className="mt-1 text-sm text-amber-800">{d.travel_warnings}</p>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink/80">Location</h3>
            <MapView lat={d.lat} lng={d.lng} name={d.name} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-sand-300 bg-white p-5">
            <h3 className="font-semibold">Trip basics</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {d.best_time_to_visit && (
                <div>
                  <dt className="text-ink/55">Best time to visit</dt>
                  <dd className="font-medium">{d.best_time_to_visit}</dd>
                </div>
              )}
              {d.est_cost_min && (
                <div>
                  <dt className="text-ink/55">Estimated cost</dt>
                  <dd className="font-medium">
                    LKR {Number(d.est_cost_min).toLocaleString()} –{" "}
                    {Number(d.est_cost_max).toLocaleString()}
                  </dd>
                </div>
              )}
              {d.rating_avg > 0 && (
                <div>
                  <dt className="text-ink/55">Rating</dt>
                  <dd className="font-medium">★ {Number(d.rating_avg).toFixed(1)}</dd>
                </div>
              )}
            </dl>

            <Link
              to={`/packages?destination=${d.slug}`}
              className="mt-5 block rounded-lg bg-brand-600 py-2.5 text-center font-medium text-white hover:bg-brand-700"
            >
              See packages here
            </Link>
            <Link
              to="/plan"
              className="mt-2 block rounded-lg border border-sand-300 py-2.5 text-center font-medium hover:bg-sand-100"
            >
              Plan a trip with AI
            </Link>
          </div>
        </aside>
      </main>

      {packages.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="text-2xl font-semibold">Packages at {d.name}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => <PackageCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}