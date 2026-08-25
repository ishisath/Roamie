import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { packagesApi, destinationsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PackageCard from "../components/PackageCard";

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

  const destination = params.get("destination") || "";
  const sort = params.get("sort") || "popular";
  const maxPrice = params.get("max_price") || "";
  const duration = params.get("duration") || "";
  const transport = params.get("transport_included") || "";
  const page = Number(params.get("page") || 1);

  useEffect(() => {
    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items))
      .catch(() => {});
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

  const selectCls =
    "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="border-b border-sand-300 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl font-semibold">Tour packages</h1>
          <p className="mt-1 text-ink/60">
            {data.total} package{data.total === 1 ? "" : "s"} from verified guides
          </p>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-4">
        <aside className="space-y-5 lg:col-span-1">
          <div className="rounded-xl border border-sand-300 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs text-brand-600 hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Destination</label>
                <select
                  value={destination}
                  onChange={(e) => update("destination", e.target.value)}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="">All destinations</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.slug}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Max price (LKR)</label>
                <select
                  value={maxPrice}
                  onChange={(e) => update("max_price", e.target.value)}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="">Any price</option>
                  <option value="15000">Under 15,000</option>
                  <option value="25000">Under 25,000</option>
                  <option value="40000">Under 40,000</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => update("duration", e.target.value)}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value="">Any length</option>
                  <option value="1">1 day</option>
                  <option value="2">2 days</option>
                  <option value="3">3 days</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Transport</label>
                <select
                  value={transport}
                  onChange={(e) => update("transport_included", e.target.value)}
                  className={`mt-1 ${selectCls}`}
                >
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
              className="rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm outline-none"
            >
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-sand-100" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <p className="mt-16 text-center text-ink/60">
              No packages match these filters.
            </p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((p) => <PackageCard key={p.id} p={p} />)}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => update("page", String(n))}
                  className={`h-9 w-9 rounded-lg text-sm ${
                    n === page ? "bg-brand-600 text-white" : "border border-sand-300 bg-white"
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