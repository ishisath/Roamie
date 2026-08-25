import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { packagesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function List({ title, items, tone = "ink" }) {
  if (!items?.length) return null;
  const mark = tone === "good" ? "✓" : tone === "bad" ? "✕" : "•";
  const color =
    tone === "good" ? "text-brand-600" : tone === "bad" ? "text-red-500" : "text-ink/50";
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink/80">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-ink/75">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className={color}>{mark}</span>
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

  useEffect(() => {
    packagesApi
      .detail(id)
      .then((r) => {
        setP(r.data);
        if (r.data.dates?.length) setSelectedDate(r.data.dates[0].start_date);
      })
      .catch(() => setError("Package not found"));
  }, [id]);

  const book = () => {
    if (!user) return navigate("/login");
    navigate(`/book/package/${id}?date=${selectedDate}&travelers=${travelers}`);
  };

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="py-32 text-center text-ink/60">{error}</p>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="h-80 animate-pulse rounded-xl bg-sand-100" />
        </div>
      </div>
    );
  }

  const total = Number(p.price) * travelers + Number(p.extra_transport_cost || 0);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="h-72 bg-sand-100">
        {p.photos?.[0] && (
          <img src={p.photos[0].url} alt={p.title} className="h-full w-full object-cover" />
        )}
      </div>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="flex flex-wrap gap-2 text-xs">
              {p.package_type && (
                <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                  {p.package_type}
                </span>
              )}
              <span className="rounded-full bg-sand-100 px-3 py-1">
                {p.duration_days} day{p.duration_days > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-sand-100 px-3 py-1">
                Max {p.max_travelers} travelers
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold">{p.title}</h1>
            {p.rating_avg > 0 && (
              <p className="mt-1 text-sm text-ink/70">
                ★ {Number(p.rating_avg).toFixed(1)} · {p.rating_count} reviews
              </p>
            )}
          </div>

          <p className="leading-relaxed text-ink/80">{p.description}</p>

          {/* Transportation — must be visible before booking */}
          <div
            className={`rounded-xl border p-5 ${
              p.transport_included
                ? "border-brand-100 bg-brand-50"
                : "border-sand-300 bg-white"
            }`}
          >
            <h3 className="font-semibold">
              {p.transport_included ? "Transportation included" : "Transportation not included"}
            </h3>

            {p.transport_included ? (
              <>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {p.vehicle_type && (
                    <div>
                      <dt className="text-ink/55">Vehicle</dt>
                      <dd className="font-medium">{p.vehicle_type}</dd>
                    </div>
                  )}
                  {p.vehicle_seats && (
                    <div>
                      <dt className="text-ink/55">Seats</dt>
                      <dd className="font-medium">{p.vehicle_seats}</dd>
                    </div>
                  )}
                  {p.is_ac !== null && (
                    <div>
                      <dt className="text-ink/55">Air conditioning</dt>
                      <dd className="font-medium">{p.is_ac ? "AC" : "Non-AC"}</dd>
                    </div>
                  )}
                  {Number(p.extra_transport_cost) > 0 && (
                    <div>
                      <dt className="text-ink/55">Extra transport cost</dt>
                      <dd className="font-medium">
                        LKR {Number(p.extra_transport_cost).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
                {p.pickup_info && (
                  <p className="mt-3 text-sm"><span className="text-ink/55">Pickup:</span> {p.pickup_info}</p>
                )}
                {p.dropoff_info && (
                  <p className="mt-1 text-sm"><span className="text-ink/55">Drop-off:</span> {p.dropoff_info}</p>
                )}
                {p.driver_info && (
                  <p className="mt-1 text-sm"><span className="text-ink/55">Driver:</span> {p.driver_info}</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-ink/70">
                You'll need to arrange your own transport, or book a driver separately.
                {p.pickup_info && <> Meeting point: {p.pickup_info}</>}
              </p>
            )}
          </div>

          {p.activities?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink/80">Activities</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.activities.map((a) => (
                  <span key={a} className="rounded-full bg-sand-100 px-3 py-1 text-sm">{a}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <List title="What's included" items={p.included} tone="good" />
            <List title="Not included" items={p.excluded} tone="bad" />
          </div>
        </div>

        <aside>
          <div className="sticky top-24 rounded-xl border border-sand-300 bg-white p-5">
            <p className="text-sm text-ink/55">From</p>
            <p className="text-3xl font-semibold text-brand-600">
              {p.currency} {Number(p.price).toLocaleString()}
              <span className="text-sm font-normal text-ink/55"> / person</span>
            </p>

            {p.dates?.length > 0 && (
              <div className="mt-5">
                <label className="text-sm font-medium">Available dates</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {p.dates.map((d) => (
                    <option key={d.id} value={d.start_date}>
                      {new Date(d.start_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}{" "}
                      · {d.slots_total - d.slots_booked} left
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium">Travelers</label>
              <input
                type="number"
                min={1}
                max={p.max_travelers}
                value={travelers}
                onChange={(e) =>
                  setTravelers(Math.min(p.max_travelers, Math.max(1, Number(e.target.value))))
                }
                className="mt-1 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="mt-5 space-y-1.5 border-t border-sand-300 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/60">
                  {p.currency} {Number(p.price).toLocaleString()} × {travelers}
                </span>
                <span>{(Number(p.price) * travelers).toLocaleString()}</span>
              </div>
              {Number(p.extra_transport_cost) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink/60">Transport</span>
                  <span>{Number(p.extra_transport_cost).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-sand-300 pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="text-brand-600">
                  {p.currency} {total.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={book}
              className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700"
            >
              {user ? "Book this package" : "Sign in to book"}
            </button>

            <p className="mt-3 text-center text-xs text-ink/50">
              You choose your trip — nothing is booked until you confirm.
            </p>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}