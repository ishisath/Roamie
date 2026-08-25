import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { destinationsApi, packagesApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DestinationCard from "../components/DestinationCard";
import PackageCard from "../components/PackageCard";

const STEPS = [
  { n: "01", t: "Discover", d: "Browse destinations or let the AI planner draft an itinerary from your interests and budget." },
  { n: "02", t: "Choose", d: "Book a package, or hire a guide and driver independently. You decide — nothing is assigned to you." },
  { n: "03", t: "Travel", d: "Message your providers, track your budget, and get plan updates when the weather turns." },
];

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [packages, setPackages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      destinationsApi.featured(),
      destinationsApi.trending(),
      packagesApi.popular(),
    ])
      .then(([f, t, p]) => {
        setFeatured(f.data);
        setTrending(t.data);
        setPackages(p.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/destinations?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1586094676111-f5b2f0d0b1a1?w=1800"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/50 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
          <p className="text-sm font-medium uppercase tracking-widest text-sand-300">
            Sri Lanka
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Your trip. Your guide.<br />Your call.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-sand-100/90">
            Plan with AI if you want to. Book a package, or pick your own guide and
            driver separately. Roamie never chooses for you.
          </p>

          <form onSubmit={search} className="mt-8 flex max-w-lg gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations — Ella, Yala, Galle…"
              className="flex-1 rounded-lg border-0 bg-white/95 px-4 py-3 outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link to="/packages" className="rounded-lg bg-white/15 px-4 py-2 text-white backdrop-blur hover:bg-white/25">
              Explore packages
            </Link>
            <Link to="/plan" className="rounded-lg bg-white/15 px-4 py-2 text-white backdrop-blur hover:bg-white/25">
              Plan with AI
            </Link>
            <Link to="/register" className="rounded-lg bg-white/15 px-4 py-2 text-white backdrop-blur hover:bg-white/25">
              Become a guide
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6">
        {/* Featured */}
        <section className="py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Featured destinations</h2>
              <p className="mt-1 text-ink/60">Handpicked places worth building a trip around.</p>
            </div>
            <Link to="/destinations" className="text-sm font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-sand-100" />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((d) => <DestinationCard key={d.id} d={d} />)}
            </div>
          )}
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section className="py-6">
            <h2 className="text-3xl font-semibold">Trending now</h2>
            <p className="mt-1 text-ink/60">Rising fast with travellers this season.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((d) => <DestinationCard key={d.id} d={d} />)}
            </div>
          </section>
        )}

        {/* Packages */}
        <section className="py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Popular packages</h2>
              <p className="mt-1 text-ink/60">Curated by verified local guides.</p>
            </div>
            <Link to="/packages" className="text-sm font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => <PackageCard key={p.id} p={p} />)}
          </div>
        </section>

        {/* AI CTA */}
        <section className="rounded-2xl bg-brand-700 px-8 py-12 text-white sm:px-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold">Not sure where to start?</h2>
            <p className="mt-3 text-sand-100/90">
              Tell the AI planner your budget, dates and interests. It drafts a
              day-by-day itinerary with costs, weather and what to pack — then you
              decide what to actually book.
            </p>
            <Link
              to="/plan"
              className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-medium text-brand-700 hover:bg-sand-50"
            >
              Plan my trip
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <h2 className="text-3xl font-semibold">How Roamie works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-sand-300 bg-white p-6">
                <span className="text-sm font-semibold text-brand-500">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-ink/70">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}