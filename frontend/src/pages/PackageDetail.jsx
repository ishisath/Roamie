import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { packagesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ReviewList from "../components/ReviewList";
import { useParallax, usePointer } from "../hooks/useTilt";

function List({ title, items, tone = "good" }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="eyebrow text-saffron-400">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex gap-3 text-white/75">
            <span className={tone === "good" ? "text-brand-200" : "text-white/30"}>
              {tone === "good" ? "✓" : "✕"}
            </span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PackageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [travelers, setTravelers] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState("");
  const scrollY = useParallax();
  const pointer = usePointer();

  useEffect(() => {
    window.scrollTo(0, 0);
    packagesApi
      .detail(id)
      .then((r) => {
        setP(r.data);
        if (r.data.dates?.length) setSelectedDate(r.data.dates[0].start_date);
      })
      .catch(() => setError("We couldn't find that package."));
  }, [id]);

  const book = () => {
    if (!user) return navigate("/login");
    navigate(`/book/package/${id}?date=${selectedDate}&travelers=${travelers}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <p className="py-40 text-center text-white/60">{error}</p>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="min-h-screen bg-night-900">
        <Navbar />
        <div className="h-[60vh] animate-pulse bg-night-800" />
      </div>
    );
  }

  const total = Number(p.price) * travelers + Number(p.extra_transport_cost || 0);
  const photo = p.photos?.[0]?.url;

  return (
    <div className="bg-night-900">
      <Navbar overlay />

      <section className="relative h-[62vh] min-h-[28rem] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(${pointer.x * -10}px, ${scrollY * 0.28}px, 0) scale(1.12)`,
            transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-night-900" />
          {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/50 to-night-900/50" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-14">
          <div className="flex flex-wrap gap-2">
            {p.package_type && (
              <span className="rounded-full bg-saffron-500 px-3 py-1 text-xs font-semibold text-night-900">
                {p.package_type}
              </span>
            )}
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs text-white backdrop-blur">
              {p.duration_days} day{p.duration_days > 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs text-white backdrop-blur">
              Up to {p.max_travelers} travellers
            </span>
          </div>

          <h1 className="headline mt-5 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] text-white">
            {p.title}
          </h1>
          {p.rating_avg > 0 && (
            <p className="mt-3 text-white/65">
              ★ {Number(p.rating_avg).toFixed(1)} · {p.rating_count} review
              {p.rating_count === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-14 px-6 py-14 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <p className="text-lg leading-relaxed text-white/80">{p.description}</p>

          {/* transportation — must be clear before booking */}
          <div
            className={`overflow-hidden rounded-[18px] border ${
              p.transport_included
                ? "border-brand-200/25 bg-brand-700/25"
                : "border-white/10 bg-night-800/60"
            }`}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
              <span className={`h-2 w-2 rounded-full ${
                p.transport_included ? "bg-saffron-400" : "bg-white/30"
              }`} />
              <h3 className="font-display font-semibold text-white">
                {p.transport_included ? "Transport included" : "Transport not included"}
              </h3>
            </div>

            <div className="px-6 py-5">
              {p.transport_included ? (
                <>
                  <dl className="grid gap-5 sm:grid-cols-3">
                    {p.vehicle_type && (
                      <div>
                        <dt className="eyebrow text-white/45">Vehicle</dt>
                        <dd className="mt-1 font-display font-semibold text-white">{p.vehicle_type}</dd>
                      </div>
                    )}
                    {p.vehicle_seats && (
                      <div>
                        <dt className="eyebrow text-white/45">Seats</dt>
                        <dd className="mt-1 font-display font-semibold text-white">{p.vehicle_seats}</dd>
                      </div>
                    )}
                    {p.is_ac !== null && (
                      <div>
                        <dt className="eyebrow text-white/45">Climate</dt>
                        <dd className="mt-1 font-display font-semibold text-white">
                          {p.is_ac ? "Air conditioned" : "Non-AC"}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 space-y-1.5 border-t border-white/10 pt-4 text-sm text-white/70">
                    {p.pickup_info && <p><span className="text-white/45">Pickup — </span>{p.pickup_info}</p>}
                    {p.dropoff_info && <p><span className="text-white/45">Drop-off — </span>{p.dropoff_info}</p>}
                    {p.driver_info && <p><span className="text-white/45">Driver — </span>{p.driver_info}</p>}
                    {Number(p.extra_transport_cost) > 0 && (
                      <p className="text-saffron-400">
                        Additional transport cost: LKR {Number(p.extra_transport_cost).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-white/70">
                  Arrange your own transport, or book a driver separately — you keep the choice.
                  {p.pickup_info && ` Meeting point: ${p.pickup_info}`}
                </p>
              )}
            </div>
          </div>

          {p.activities?.length > 0 && (
            <div>
              <h3 className="eyebrow text-saffron-400">Activities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.activities.map((a) => (
                  <span key={a} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            <List title="What's included" items={p.included} tone="good" />
            <List title="Not included" items={p.excluded} tone="bad" />
          </div>

          <div className="[&_h3]:text-saffron-400 [&_p]:text-white/75">
            <ReviewList type="PACKAGE" id={p.id} />
          </div>
        </div>

        {/* booking panel */}
        <aside>
          <div className="sticky top-24 rounded-[18px] border border-white/12 bg-night-800/80 p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
            <p className="eyebrow text-white/45">From</p>
            <p className="mt-1 font-display text-4xl font-bold text-white">
              <span className="text-lg font-medium text-white/50">{p.currency} </span>
              {Number(p.price).toLocaleString()}
            </p>
            <p className="text-sm text-white/50">per person</p>

            {p.dates?.length > 0 && (
              <div className="mt-6">
                <label className="eyebrow text-white/45">Departure</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/12 bg-night-900 px-3 py-2.5 text-sm text-white outline-none focus:border-saffron-400"
                >
                  {p.dates.map((d) => (
                    <option key={d.id} value={d.start_date}>
                      {new Date(d.start_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })} · {d.slots_total - d.slots_booked} left
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4">
              <label className="eyebrow text-white/45">Travellers</label>
              <div className="mt-1.5 flex items-center rounded-lg border border-white/12 bg-night-900">
                <button
                  type="button"
                  onClick={() => setTravelers((t) => Math.max(1, t - 1))}
                  className="px-4 py-2.5 text-white/60 hover:text-white"
                >
                  −
                </button>
                <span className="flex-1 text-center font-display font-semibold text-white">
                  {travelers}
                </span>
                <button
                  type="button"
                  onClick={() => setTravelers((t) => Math.min(p.max_travelers, t + 1))}
                  className="px-4 py-2.5 text-white/60 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between text-white/60">
                <span>{Number(p.price).toLocaleString()} × {travelers}</span>
                <span>{(Number(p.price) * travelers).toLocaleString()}</span>
              </div>
              {Number(p.extra_transport_cost) > 0 && (
                <div className="flex justify-between text-white/60">
                  <span>Transport</span>
                  <span>{Number(p.extra_transport_cost).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-white/70">Total</span>
                <span className="font-display text-2xl font-bold text-white">
                  {p.currency} {total.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={book}
              className="mt-6 w-full rounded-full bg-saffron-500 py-3.5 font-medium text-night-900 transition hover:bg-saffron-400"
            >
              {user ? "Book this package" : "Sign in to book"}
            </button>

            <p className="mt-3 text-center text-xs text-white/40">
              Nothing is charged until you confirm.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}