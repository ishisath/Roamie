import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { packagesApi, destinationsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PhotoCard from "../components/PhotoCard";
import { usePointer } from "../hooks/useTilt";

const SORTS = [
  { v: "popular", l: "Most popular" },
  { v: "price_low", l: "Price: low to high" },
  { v: "price_high", l: "Price: high to low" },
  { v: "rating", l: "Highest rated" },
  { v: "duration", l: "Shortest first" },
];

export default function Packages() {
  const [params, setParams] = useSearchParams();
  const [destinations, setDestinations] = useState([]);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const pointer = usePointer();

  const destination = params.get("destination") || "";
  const sort = params.get("sort") || "popular";
  const maxPrice = params.get("max_price") || "";
  const duration = params.get("duration") || "";
  const transport = params.get("transport_included") || "";
  const page = Number(params.get("page") || 1);

  useEffect(() => {
    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    packagesApi
      .search({
        destination: destination || undefined,
        sort,
        max_price: maxPrice || undefined,
        duration: duration || undefined,
        transport_included: transport || undefined,
        page,
        size: 12,
      })
      .then((r) => setData(r.data))
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [destination, sort, maxPrice, duration, transport, page]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const clearAll = () => setParams(new URLSearchParams());
  const hasFilters = destination || maxPrice || duration || transport;
  const pages = Math.ceil(data.total / 12);
  const bannerImage = data.items[0]?.photos?.[0]?.url;

  const selectCls =
    "w-full rounded-lg border border-white/12 bg-night-800 px-3 py-2 text-sm text-white outline-none focus:border-saffron-400";

  return (
    <div className="bg-night-900">
      <Navbar overlay />

      <section className="relative h-[24rem] overflow-hidden">
        <div
          className="absolute inset-0 scale-110"
          style={{
            transform: `translate3d(${pointer.x * -14}px, ${pointer.y * -10}px, 0) scale(1.1)`,
            transition: "transform 500ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-night-900" />
          {bannerImage && (
            <img src={bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/70 to-night-900/40" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-12">
          <span className="eyebrow text-saffron-400">Curated by verified guides</span>
          <h1 className="headline mt-3 text-[clamp(2.5rem,6vw,4.5rem)] uppercase text-white">
            Packages
          </h1>
          <p className="mt-2 text-white/60">
            {data.total} package{data.total === 1 ? "" : "s"} — transport details shown before you book.
          </p>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-[18px] border border-white/10 bg-night-800/70 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-white">Filters</h2>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs text-saffron-400 hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="eyebrow text-white/50">Destination</label>
                <select value={destination} onChange={(e) => update("destination", e.target.value)}
                        className={`mt-1.5 ${selectCls}`}>
                  <option value="">All destinations</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.slug}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="eyebrow text-white/50">Max price</label>
                <select value={maxPrice} onChange={(e) => update("max_price", e.target.value)}
                        className={`mt-1.5 ${selectCls}`}>
                  <option value="">Any price</option>
                  <option value="15000">Under 15,000</option>
                  <option value="25000">Under 25,000</option>
                  <option value="40000">Under 40,000</option>
                </select>
              </div>

              <div>
                <label className="eyebrow text-white/50">Duration</label>
                <select value={duration} onChange={(e) => update("duration", e.target.value)}
                        className={`mt-1.5 ${selectCls}`}>
                  <option value="">Any length</option>
                  <option value="1">1 day</option>
                  <option value="2">2 days</option>
                  <option value="3">3 days</option>
                </select>
              </div>

              <div>
                <label className="eyebrow text-white/50">Transport</label>
                <select value={transport} onChange={(e) => update("transport_included", e.target.value)}
                        className={`mt-1.5 ${selectCls}`}>
                  <option value="">Any</option>
                  <option value="true">Included</option>
                  <option value="false">Not included</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="flex justify-end">
            <select
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
              className="rounded-full border border-white/15 bg-night-800 px-4 py-1.5 text-sm text-white outline-none"
            >
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-[18px] bg-night-800" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <p className="mt-20 text-center text-white/50">
              No packages match these filters. Try widening your price or duration.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((p) => (
                <PhotoCard
                  key={p.id}
                  to={`/packages/${p.id}`}
                  image={p.photos?.[0]?.url}
                  kicker={`${p.duration_days} day${p.duration_days > 1 ? "s" : ""}${
                    p.transport_included ? " · transport" : ""
                  }`}
                  title={p.title}
                  meta={`${p.currency} ${Number(p.price).toLocaleString()} per person`}
                />
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => update("page", String(n))}
                  className={`h-10 w-10 rounded-full text-sm transition ${
                    n === page
                      ? "bg-saffron-500 text-night-900"
                      : "border border-white/15 text-white/60 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}