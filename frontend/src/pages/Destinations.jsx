import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { destinationsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PhotoCard from "../components/PhotoCard";
import { usePointer } from "../hooks/useTilt";

const SORTS = [
  { v: "popular", l: "Most popular" },
  { v: "rating", l: "Highest rated" },
  { v: "name", l: "Name A–Z" },
  { v: "cost_low", l: "Cost: low to high" },
  { v: "cost_high", l: "Cost: high to low" },
];

export default function Destinations() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const pointer = usePointer();

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "popular";
  const page = Number(params.get("page") || 1);

  const [search, setSearch] = useState(q);

  useEffect(() => {
    destinationsApi.categories().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    destinationsApi
      .search({ q: q || undefined, category: category || undefined, sort, page, size: 12 })
      .then((r) => setData(r.data))
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [q, category, sort, page]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const pages = Math.ceil(data.total / 12);
  const bannerImage = data.items[0]?.photos?.[0]?.url;

  return (
    <div className="bg-night-900">
      <Navbar overlay />

      {/* banner */}
      <section className="relative h-[26rem] overflow-hidden">
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
          <span className="eyebrow text-saffron-400">
            {data.total} place{data.total === 1 ? "" : "s"}
          </span>
          <h1 className="headline mt-3 text-[clamp(2.5rem,6vw,4.5rem)] uppercase text-white">
            Destinations
          </h1>

          <form
            onSubmit={(e) => { e.preventDefault(); update("q", search); }}
            className="mt-6 flex max-w-lg gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or region…"
              className="flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3
                         text-white placeholder:text-white/45 backdrop-blur
                         outline-none focus:border-saffron-400"
            />
            <button className="rounded-full bg-white px-6 py-3 font-medium text-night-900 transition hover:bg-white/90">
              Search
            </button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => update("category", "")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              !category
                ? "bg-saffron-500 text-night-900"
                : "border border-white/15 text-white/70 hover:text-white"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => update("category", c.slug)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                category === c.slug
                  ? "bg-saffron-500 text-night-900"
                  : "border border-white/15 text-white/70 hover:text-white"
              }`}
            >
              {c.name}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="ml-auto rounded-full border border-white/15 bg-night-800 px-4 py-1.5 text-sm text-white outline-none"
          >
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[18px] bg-night-800" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <p className="mt-20 text-center text-white/50">
            No destinations match your search. Try a different region or clear the filters.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((d) => (
              <PhotoCard
                key={d.id}
                to={`/destinations/${d.slug}`}
                image={d.photos?.[0]?.url}
                kicker={d.category?.name}
                title={d.name}
                meta={
                  d.est_cost_min
                    ? `${d.region} · from LKR ${Number(d.est_cost_min).toLocaleString()}`
                    : d.region
                }
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
      </main>

      <Footer />
    </div>
  );
}