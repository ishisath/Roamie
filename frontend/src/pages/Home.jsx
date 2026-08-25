import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { destinationsApi, packagesApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PhotoCard from "../components/PhotoCard";
import { useParallax, usePointer } from "../hooks/useTilt";

const STEPS = [
  { t: "Discover", d: "Browse destinations, or let the AI planner draft an itinerary from your budget and interests." },
  { t: "Choose", d: "Book a package, or hire a guide and driver independently. Nothing is ever assigned to you." },
  { t: "Travel", d: "Message your providers, track spending, and get alerts when the weather turns." },
];

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [packages, setPackages] = useState([]);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");

  const scrollY = useParallax();
  const pointer = usePointer();

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
      .catch(() => {});
  }, []);

  const hero = featured[active];
  const heroImage = hero?.photos?.[0]?.url;

  const ctaImage =
    trending.find((d) => d.photos?.[0]?.url)?.photos[0].url ||
    featured.find((d) => d.photos?.[0]?.url)?.photos[0].url;

  const search = (e) => {
    e.preventDefault();
    navigate(`/destinations?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="bg-night-900">
      <Navbar overlay />

      {/* ---------- HERO ---------- */}
      <section className="relative h-screen min-h-[40rem] overflow-hidden">
        <div
          className="absolute inset-0 scale-110"
          style={{
            transform: `translate3d(${pointer.x * -18}px, ${scrollY * 0.35 + pointer.y * -12}px, 0) scale(1.12)`,
            transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-night-800 to-night-900" />
          {heroImage && (
            <img
              key={heroImage}
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/60 to-night-900/10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-night-900 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 pt-24">
          <div className="max-w-xl" style={{ transform: `translateY(${scrollY * -0.15}px)` }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-saffron-400" />
              <span className="eyebrow text-white/85">Sri Lanka</span>
            </span>

            <h1 className="headline mt-6 text-[clamp(2.5rem,5.2vw,4.75rem)] uppercase text-white">
              Travel beyond<br />the ordinary
            </h1>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
              Plan with AI if you want to. Book a package, or pick your own guide
              and driver. Roamie never chooses for you.
            </p>

            <form onSubmit={search} className="mt-8 flex max-w-md gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where to? Ella, Yala, Galle…"
                className="flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3.5
                           text-white placeholder:text-white/45 backdrop-blur
                           outline-none focus:border-saffron-400"
              />
              <button className="rounded-full bg-white px-7 py-3.5 font-medium text-night-900 transition hover:bg-white/90">
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <Link to="/plan"
                    className="rounded-full bg-saffron-500 px-5 py-2.5 font-medium text-night-900 transition hover:bg-saffron-400">
                Plan with AI
              </Link>
              <Link to="/packages"
                    className="rounded-full bg-white/10 px-5 py-2.5 text-white backdrop-blur transition hover:bg-white/20">
                Explore packages
              </Link>
            </div>
          </div>
        </div>

        {/* floating destination selector */}
        <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 pt-10 lg:block">
          <div className="pointer-events-auto flex flex-col gap-5">
            {featured.slice(0, 5).map((d, i) => {
              const isActive = i === active;
              const depth = isActive ? 60 : 0;
              return (
                <button
                  key={d.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => navigate(`/destinations/${d.slug}`)}
                  className="group flex items-center gap-4 text-right"
                  style={{
                    transform: `perspective(800px) translateZ(${depth}px) translateX(${pointer.x * (isActive ? -14 : -6)}px)`,
                    transition: "transform 500ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  <span className="ml-auto">
                    <span className={`block font-display text-sm font-semibold transition ${
                      isActive ? "text-white" : "text-white/45"
                    }`}>
                      {d.name}
                    </span>
                    <span className="block text-xs text-white/40">{d.region}</span>
                  </span>
                  <span
                    className={`relative block shrink-0 overflow-hidden rounded-full border-2 transition-all duration-500 ${
                      isActive
                        ? "h-24 w-24 border-saffron-400 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9)]"
                        : "h-16 w-16 border-white/25 opacity-70 group-hover:opacity-100"
                    }`}
                  >
                    <span className="absolute inset-0 bg-night-700" />
                    {d.photos?.[0] && (
                      <img src={d.photos[0].url} alt=""
                           className="absolute inset-0 h-full w-full object-cover" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- TRENDING ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow text-saffron-400">Rising fast</span>
            <h2 className="headline mt-2 text-4xl uppercase text-white sm:text-5xl">
              Trending now
            </h2>
          </div>
          <Link to="/destinations" className="text-sm text-white/60 hover:text-white">
            All destinations →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {trending.slice(0, 3).map((d, i) => (
            <PhotoCard
              key={d.id}
              to={`/destinations/${d.slug}`}
              image={d.photos?.[0]?.url}
              kicker={d.category?.name}
              title={d.name}
              meta={d.region}
              tall={i === 1}
            />
          ))}
        </div>
      </section>

      {/* ---------- PACKAGES ---------- */}
      <section className="border-y border-white/8 bg-night-800/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-saffron-400">Curated by verified guides</span>
              <h2 className="headline mt-2 text-4xl uppercase text-white sm:text-5xl">
                Popular packages
              </h2>
            </div>
            <Link to="/packages" className="text-sm text-white/60 hover:text-white">
              All packages →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages.slice(0, 4).map((p) => (
              <PhotoCard
                key={p.id}
                to={`/packages/${p.id}`}
                image={p.photos?.[0]?.url}
                kicker={`${p.duration_days} day${p.duration_days > 1 ? "s" : ""}`}
                title={p.title}
                meta={`${p.currency} ${Number(p.price).toLocaleString()} · ${
                  p.transport_included ? "Transport included" : "No transport"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <span className="eyebrow text-saffron-400">The route</span>
        <h2 className="headline mt-2 text-4xl uppercase text-white sm:text-5xl">
          How Roamie works
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.t} className="relative">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full bg-saffron-500" />
                <span className="h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
              </div>
              <h3 className="headline mt-5 text-2xl text-white">{s.t}</h3>
              <p className="mt-3 text-white/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- AI CTA ---------- */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10">
          {/* scenery layer */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-night-900" />
            {ctaImage && (
              <img
                src={ctaImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  transform: `translateY(${pointer.y * -10}px) scale(1.06)`,
                  transition: "transform 500ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-night-900/92 via-night-900/70 to-night-900/45" />
            <div className="absolute inset-0 bg-brand-700/25 mix-blend-multiply" />
          </div>

          <div className="relative grid items-center gap-10 p-10 sm:p-14 lg:grid-cols-2">
            {/* text half */}
            <div>
              <span className="eyebrow text-saffron-400">AI trip planner</span>
              <h2 className="headline mt-3 text-4xl uppercase text-white">
                Not sure where<br />to start?
              </h2>
              <p className="mt-4 max-w-md text-white/75">
                Tell the planner your dates, budget and interests. It drafts a
                day-by-day itinerary with costs, weather and what to pack — then
                you decide what to actually book.
              </p>
              <Link
                to="/plan"
                className="mt-8 inline-block rounded-full bg-saffron-500 px-7 py-3.5 font-medium text-night-900 transition hover:bg-saffron-400"
              >
                Plan my trip
              </Link>
            </div>

            {/* floating itinerary preview */}
            <div
              className="hidden lg:block"
              style={{
                transform: `perspective(1100px) rotateY(${-8 + pointer.x * 6}deg) rotateX(${4 + pointer.y * -4}deg)`,
                transition: "transform 500ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div className="rounded-2xl border border-white/15 bg-night-900/70 p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-saffron-400">Day 2 · Ella</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">
                    24°C · Light rain
                  </span>
                </div>

                <ol className="mt-5 space-y-4">
                  {[
                    ["06:00", "Little Adam's Peak sunrise", "LKR 0"],
                    ["09:30", "Nine Arch Bridge", "LKR 500"],
                    ["13:00", "Tea factory tour", "LKR 3,000"],
                  ].map(([time, title, cost], i) => (
                    <li key={title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          i === 0 ? "bg-saffron-500" : "bg-white/30"
                        }`} />
                        {i < 2 && <span className="mt-1 h-8 w-px bg-white/15" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-white/45">{time}</p>
                        <p className="text-sm font-medium text-white">{title}</p>
                      </div>
                      <span className="text-xs text-white/55">{cost}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-xs text-white/50">Estimated day total</span>
                  <span className="font-display text-lg font-bold text-white">LKR 3,500</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-saffron-500/15 blur-3xl" />
        </div>
      </section>

      <Footer />
    </div>
  );
}