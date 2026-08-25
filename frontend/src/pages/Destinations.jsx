import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { destinationsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DestinationCard from "../components/DestinationCard";

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

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="border-b border-sand-300 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl font-semibold">Destinations</h1>
          <p className="mt-1 text-ink/60">
            {data.total} place{data.total === 1 ? "" : "s"} across Sri Lanka
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); update("q", search); }}
            className="mt-6 flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, region or description…"
              className="flex-1 rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
              Search
            </button>
          </form>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => update("category", "")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              !category ? "bg-brand-600 text-white" : "border border-sand-300 bg-white hover:bg-sand-100"
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
                  ? "bg-brand-600 text-white"
                  : "border border-sand-300 bg-white hover:bg-sand-100"
              }`}
            >
              {c.name}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="ml-auto rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm outline-none"
          >
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-sand-100" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <p className="mt-16 text-center text-ink/60">
            No destinations match your search.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((d) => <DestinationCard key={d.id} d={d} />)}
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
      </main>

      <Footer />
    </div>
  );
}