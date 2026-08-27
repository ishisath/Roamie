import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { bookingsApi, paymentsApi, aiApi, budgetApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { Panel, Pill } from "../components/DashShell";
import ItineraryPreview from "../components/ItineraryPreview";
import { weatherApi } from "../api/endpoints";
import WeatherPanel from "../components/WeatherPanel";
import AskAssistant from "../components/AskAssistant";

const JOURNEY = ["Requested", "Paid", "Confirmed", "Travelling", "Completed"];

function journeyIndex(b) {
  if (b.status === "CANCELLED") return -1;
  if (b.status === "COMPLETED") return 4;
  if (b.status === "ACTIVE") return 3;
  if (b.status === "CONFIRMED") return 2;
  if (b.payment_status === "SUCCESS") return 1;
  return 0;
}

const TRIP_LABEL = {
  CONFIRMED: "Confirmed",
  ON_THE_WAY: "On the way",
  PICKED_UP: "Picked up",
  STARTED: "Trip started",
  COMPLETED: "Completed",
};

const STATUS_TONE = {
  PENDING: "saffron",
  CONFIRMED: "brand",
  ACTIVE: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [b, setB] = useState(null);
  const [plan, setPlan] = useState(null);
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [weather, setWeather] = useState(null);

  const load = () =>
      weatherApi.forBooking(id).then((r) => setWeather(r.data)).catch(() => {});
    bookingsApi.detail(id)
      .then((r) => {
        setB(r.data);
        if (r.data.trip_plan_id) {
          aiApi.planForBooking(r.data.id)
            .then((p) => p.data && setPlan(p.data)).catch(() => {});
        }
      })
      .catch(() => setError("We couldn't find that booking."));

  useEffect(() => {
    window.scrollTo(0, 0);
    load();
    budgetApi.list()
      .then((r) => setBudget(r.data.find((x) => x.booking_id === id) || null))
      .catch(() => {});
  }, [id]);

  const pay = async () => {
    setError("");
    setBusy(true);
    try {
      const { data: intent } = await paymentsApi.intent(b.id);
      await paymentsApi.confirm({
        payment_id: intent.payment_id,
        intent_id: intent.intent_id,
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "The payment didn't complete.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await bookingsApi.cancel(b.id, "Cancelled by traveller");
      setConfirmCancel(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't cancel that booking.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !b) {
    return (
      <div className="min-h-screen bg-[#F1EEE6]">
        <Navbar />
        <p className="py-40 text-center text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!b) {
    return (
      <div className="min-h-screen bg-[#F1EEE6]">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 py-14">
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  const isTraveler = user?.id === b.traveler_id;
  const unpaid = b.payment_status !== "SUCCESS" && b.status !== "CANCELLED";
  const canCancel = ["PENDING", "CONFIRMED"].includes(b.status);
  const canMessage = ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status);
  const idx = journeyIndex(b);

  const days = b.end_date
    ? Math.round((new Date(b.end_date) - new Date(b.start_date)) / 86400000) + 1
    : 1;

  return (
    <div className="min-h-screen bg-[#F1EEE6]">
      <Navbar />

      {/* header */}
      <div className="relative overflow-hidden border-b border-sand-200 bg-white">
        {b.destination?.photo && (
          <>
            <img src={b.destination.photo} alt=""
                 className="absolute inset-0 h-full w-full object-cover opacity-[0.07]" />
          </>
        )}

        <div className="relative mx-auto max-w-4xl px-6 py-8">
          <button onClick={() => navigate(-1)}
                  className="text-sm text-ink-soft hover:text-ink">
            ← Back
          </button>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-brand-600">
                {b.booking_type.replace("_", " + ").toLowerCase()} booking
                {b.destination && ` · ${b.destination.name}`}
              </p>
              <h1 className="headline mt-1.5 text-[2.25rem] leading-none">
                {new Date(b.start_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </h1>
              <p className="mt-2 font-mono text-sm text-ink-soft">{b.reference}</p>
            </div>
            <Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>
          </div>

          {idx >= 0 && (
            <div className="mt-9 flex items-center">
              {JOURNEY.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span className={`h-3 w-3 rounded-full ring-4 transition ${
                      i < idx ? "bg-brand-600 ring-brand-50"
                      : i === idx ? "bg-saffron-500 ring-saffron-100"
                      : "bg-sand-300 ring-transparent"
                    }`} />
                    <span className={`mt-2 whitespace-nowrap text-[11px] ${
                      i <= idx ? "font-medium text-ink" : "text-ink-soft/55"
                    }`}>
                      {s}
                    </span>
                  </div>
                  {i < JOURNEY.length - 1 && (
                    <span className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${
                      i < idx ? "bg-brand-600" : "bg-sand-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-5 px-6 py-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isTraveler && unpaid && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-saffron-500/30 bg-saffron-50 p-6">
            <div>
              <p className="font-display font-semibold">Payment outstanding</p>
              <p className="mt-1 text-sm text-ink-soft">
                Your provider isn't confirmed until this is settled.
              </p>
            </div>
            <button onClick={pay} disabled={busy}
                    className="rounded-full bg-saffron-500 px-6 py-3 font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-60">
              {busy ? "Processing…" : `Pay ${b.currency} ${Number(b.total_amount).toLocaleString()}`}
            </button>
          </div>
        )}
                {isTraveler && b.items.some((i) => i.provider_status === "PENDING") &&
         b.payment_status === "SUCCESS" && (
          <div className="rounded-2xl border border-saffron-500/30 bg-saffron-50 p-6">
            <p className="font-display font-semibold">Waiting on your provider</p>
            <p className="mt-1 text-sm text-ink-soft">
              They've been notified and usually respond within a day. If they decline,
              you're refunded automatically and can pick someone else.
            </p>
          </div>
        )}

        {/* ---------- WHAT'S BOOKED ---------- */}
        <Panel title="What's booked">
          <div className="space-y-5">
            {b.items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-sand-200">
                {/* package */}
                {item.package && (
                  <div className="flex gap-4 border-b border-sand-200 bg-sand-50/60 p-5">
                    {item.package.photo && (
                      <img src={item.package.photo} alt=""
                           className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow text-ink-soft">Package</p>
                      <Link to={`/packages/${item.package.id}`}
                            className="mt-1 block font-display text-lg font-semibold hover:text-brand-600">
                        {item.package.title}
                      </Link>
                      <p className="text-sm text-ink-soft">
                        {item.package.duration_days} day
                        {item.package.duration_days > 1 ? "s" : ""} ·{" "}
                        {b.currency} {Number(item.package.price).toLocaleString()} per person
                      </p>
                      {item.package.activities?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.package.activities.slice(0, 4).map((a) => (
                            <span key={a} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-ink-soft">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
          {weather && weather.mode !== "UNAVAILABLE" && (
          <Panel
            title="Weather"
            sub={weather.mode === "FORECAST"
              ? `Forecast for ${weather.destination_name}`
              : `Typical conditions at ${weather.destination_name}`}
          >
            <WeatherPanel weather={weather} />
          </Panel>
        )}

                {/* provider */}
                {item.provider && (
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="flex gap-4">
                      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold text-white ${
                        item.provider.role === "DRIVER"
                          ? "bg-gradient-to-br from-plum-500 to-plum-600"
                          : "bg-gradient-to-br from-brand-500 to-brand-700"
                      }`}>
                        {item.provider.full_name.charAt(0)}
                      </span>
                      <div>
                        <p className="eyebrow text-ink-soft">
                          Your {item.provider.role.toLowerCase()}
                        </p>
                        <Link to={`/providers/${item.provider.id}`}
                              className="mt-1 block font-display text-lg font-semibold hover:text-brand-600">
                          {item.provider.full_name}
                        </Link>
                        <p className="text-sm text-ink-soft">
                          {item.provider.rating_avg > 0 && (
                            <>★ {Number(item.provider.rating_avg).toFixed(1)} · </>
                          )}
                          {item.provider.years_experience} years experience
                        </p>
                        {item.provider.languages?.length > 0 && (
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Speaks {item.provider.languages.join(", ")}
                          </p>
                        )}

                        {/* contact — only once confirmed */}
                        {canMessage && (
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                            {item.provider.phone && (
                              <a href={`tel:${item.provider.phone}`}
                                 className="text-brand-600 hover:underline">
                                {item.provider.phone}
                              </a>
                            )}
                            {item.provider.email && (
                              <a href={`mailto:${item.provider.email}`}
                                 className="text-brand-600 hover:underline">
                                {item.provider.email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                                            <Pill tone={
                        item.provider_status === "ACCEPTED" ? "brand"
                        : item.provider_status === "DECLINED" ? "danger" : "saffron"
                      }>
                        {item.provider_status === "PENDING" ? "Awaiting response"
                          : item.provider_status === "ACCEPTED" ? "Accepted"
                          : "Declined"}
                      </Pill>
                      <p className="mt-2 font-display text-lg font-bold text-brand-600">
                        {b.currency} {Number(item.amount).toLocaleString()}
                      </p>
                      {item.trip_status && (
                        <p className="mt-1 text-xs text-saffron-600">
                          {TRIP_LABEL[item.trip_status]}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* transport — from the package */}
                {item.package?.transport_included && (
                  <div className="border-t border-sand-200 bg-brand-50/50 px-5 py-4">
                    <p className="eyebrow text-brand-700">Transport included</p>
                    <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm">
                      {item.package.vehicle_type && (
                        <span><span className="text-ink-soft">Vehicle </span>
                          {item.package.vehicle_type}</span>
                      )}
                      {item.package.vehicle_seats && (
                        <span><span className="text-ink-soft">Seats </span>
                          {item.package.vehicle_seats}</span>
                      )}
                      {item.package.is_ac !== null && (
                        <span><span className="text-ink-soft">Climate </span>
                          {item.package.is_ac ? "Air conditioned" : "Non-AC"}</span>
                      )}
                    </div>
                    {item.package.pickup_info && (
                      <p className="mt-2 text-sm">
                        <span className="text-ink-soft">Pickup — </span>
                        {item.package.pickup_info}
                      </p>
                    )}
                    {item.package.dropoff_info && (
                      <p className="text-sm">
                        <span className="text-ink-soft">Drop-off — </span>
                        {item.package.dropoff_info}
                      </p>
                    )}
                  </div>
                )}

                {/* vehicle — from a driver booking */}
                {item.vehicle && (
                  <div className="border-t border-sand-200 bg-sand-50/60 px-5 py-4">
                    <p className="eyebrow text-ink-soft">Vehicle</p>
                    <p className="mt-1 font-display font-semibold">
                      {item.vehicle.vehicle_type}
                      {item.vehicle.model && ` · ${item.vehicle.model}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-8 gap-y-1 text-sm text-ink-soft">
                      <span>{item.vehicle.reg_no}</span>
                      <span>{item.vehicle.seats} seats</span>
                      <span>{item.vehicle.is_ac ? "Air conditioned" : "Non-AC"}</span>
                      {item.vehicle.luggage_capacity && (
                        <span>{item.vehicle.luggage_capacity}</span>
                      )}
                    </div>
                    {item.vehicle.photos?.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {item.vehicle.photos.map((url) => (
                          <img key={url} src={url} alt=""
                               className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* included / excluded */}
                {(item.package?.included?.length > 0 ||
                  item.package?.excluded?.length > 0) && (
                  <div className="grid gap-5 border-t border-sand-200 p-5 sm:grid-cols-2">
                    {item.package.included?.length > 0 && (
                      <div>
                        <p className="eyebrow text-ink-soft">Included</p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {item.package.included.map((i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-brand-600">✓</span>{i}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.package.excluded?.length > 0 && (
                      <div>
                        <p className="eyebrow text-ink-soft">Not included</p>
                        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                          {item.package.excluded.map((i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-sand-300">✕</span>{i}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Trip details" className="lg:col-span-2">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="eyebrow text-ink-soft">Dates</dt>
                <dd className="mt-1 font-display font-semibold">
                  {new Date(b.start_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short" })}
                  {b.end_date && ` – ${new Date(b.end_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short" })}`}
                  <span className="ml-2 text-sm font-normal text-ink-soft">
                    {days} day{days > 1 ? "s" : ""}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-ink-soft">Travellers</dt>
                <dd className="mt-1 font-display font-semibold">{b.num_travelers}</dd>
              </div>
              {b.destination && (
                <div>
                  <dt className="eyebrow text-ink-soft">Destination</dt>
                  <dd className="mt-1">
                    <Link to={`/destinations/${b.destination.slug}`}
                          className="font-display font-semibold hover:text-brand-600">
                      {b.destination.name}
                    </Link>
                    {b.destination.region && (
                      <span className="ml-2 text-sm font-normal text-ink-soft">
                        {b.destination.region}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {b.start_time && (
                <div>
                  <dt className="eyebrow text-ink-soft">Start time</dt>
                  <dd className="mt-1 font-display font-semibold">
                    {b.start_time.slice(0, 5)}
                  </dd>
                </div>
              )}
              {b.pickup_location && (
                <div className="sm:col-span-2">
                  <dt className="eyebrow text-ink-soft">Pickup</dt>
                  <dd className="mt-1">{b.pickup_location}</dd>
                </div>
              )}
              {b.dropoff_location && (
                <div className="sm:col-span-2">
                  <dt className="eyebrow text-ink-soft">Drop-off</dt>
                  <dd className="mt-1">{b.dropoff_location}</dd>
                </div>
              )}
            </dl>

            {b.notes && (
              <div className="mt-6 rounded-xl bg-sand-50 p-4">
                <p className="eyebrow text-ink-soft">Notes for your provider</p>
                <p className="mt-1.5 text-sm">{b.notes}</p>
              </div>
            )}

            {b.cancelled_reason && (
              <div className="mt-6 rounded-xl bg-red-50 p-4">
                <p className="eyebrow text-red-700">Cancellation reason</p>
                <p className="mt-1.5 text-sm text-red-700">{b.cancelled_reason}</p>
              </div>
            )}

            {/* provider sees the traveller */}
            {!isTraveler && b.traveler && (
              <div className="mt-6 rounded-xl border border-sand-200 p-4">
                <p className="eyebrow text-ink-soft">Traveller</p>
                <p className="mt-1 font-display font-semibold">{b.traveler.full_name}</p>
                <div className="mt-1 flex flex-wrap gap-x-5 text-sm">
                  {b.traveler.phone && (
                    <a href={`tel:${b.traveler.phone}`} className="text-brand-600 hover:underline">
                      {b.traveler.phone}
                    </a>
                  )}
                  {b.traveler.country && (
                    <span className="text-ink-soft">{b.traveler.country}</span>
                  )}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="What it cost">
            <div className="space-y-3">
              {b.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border-b border-sand-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">
                      {item.package?.title || item.provider?.full_name ||
                        item.service_type}
                    </p>
                    <p className="text-xs capitalize text-ink-soft">
                      {item.service_type.toLowerCase()}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {Number(item.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-sand-200 pt-4">
              <span className="text-sm text-ink-soft">Total</span>
              <span className="font-display text-2xl font-bold text-brand-600">
                <span className="text-sm font-medium text-ink-soft">{b.currency} </span>
                {Number(b.total_amount).toLocaleString()}
              </span>
            </div>

            {budget && (
              <Link to="/budget"
                    className="mt-4 flex items-center justify-between rounded-xl border border-sand-200 px-4 py-3 text-sm transition hover:border-ink/15 hover:bg-sand-50">
                <span>
                  <span className="block font-medium">Budget for this trip</span>
                  <span className="text-xs text-ink-soft">{budget.title}</span>
                </span>
                <span className="text-ink-soft">→</span>
              </Link>
            )}
          </Panel>
        </div>

        {plan && (
          <Panel title="Your itinerary" sub={plan.title}>
            <ItineraryPreview plan={plan} />
          </Panel>
        )}

        <div className="flex flex-wrap gap-2">
          {canMessage && (
            <Link to={`/messages/${b.id}`}
                  className="rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700">
              Messages
            </Link>
          )}
          {isTraveler && b.status === "COMPLETED" && (
            <Link to="/reviews"
                  className="rounded-full bg-saffron-500 px-6 py-3 text-sm font-medium text-night-900 hover:bg-saffron-400">
              Leave a review
            </Link>
          )}
          {isTraveler && canCancel && !confirmCancel && (
            <button onClick={() => setConfirmCancel(true)}
                    className="rounded-full border border-sand-300 px-6 py-3 text-sm font-medium text-ink-soft hover:border-red-200 hover:text-red-600">
              Cancel booking
            </button>
          )}
        </div>

        {confirmCancel && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-display font-semibold text-red-700">
              Cancel this booking?
            </p>
            <p className="mt-1.5 text-sm text-red-700/80">
              Your provider's dates are released and any expenses logged from this
              booking are removed from your budget. This can't be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={cancel} disabled={busy}
                      className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {busy ? "Cancelling…" : "Yes, cancel it"}
              </button>
              <button onClick={() => setConfirmCancel(false)}
                      className="rounded-lg border border-sand-300 bg-white px-5 py-2.5 text-sm hover:bg-sand-100">
                Keep the booking
              </button>
            </div>
          </div>
        )}
      </main>
            <AskAssistant contextType="BOOKING" contextId={b.id} label="Ask about this trip" />
    </div>
  );
}