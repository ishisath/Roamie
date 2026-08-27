import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { providersApi, bookingsApi, paymentsApi, destinationsApi,
         aiApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ItineraryPreview from "../components/ItineraryPreview";

const STEPS = ["Details", "Payment", "Confirmed"];

export default function BookProvider() {
  const { userId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const primaryType = (params.get("type") || "GUIDE").toUpperCase();
  const planId = params.get("plan");
  const otherType = primaryType === "GUIDE" ? "DRIVER" : "GUIDE";

  const [provider, setProvider] = useState(null);
  const [second, setSecond] = useState(null);
  const [secondOptions, setSecondOptions] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [plan, setPlan] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [intent, setIntent] = useState(null);

  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    num_travelers: 2,
    destination_id: "",
    pickup_location: "",
    dropoff_location: "",
    notes: "",
  });

  useEffect(() => {
    providersApi.profile(userId).then((r) => setProvider(r.data))
      .catch(() => setError("We couldn't find that provider."));

    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items)).catch(() => {});

    const call = otherType === "GUIDE" ? providersApi.guides : providersApi.drivers;
    call({ sort: "rating" }).then((r) => setSecondOptions(r.data)).catch(() => {});

    if (planId) {
      aiApi.planDetail(planId)
        .then((r) => {
          setPlan(r.data);
          // prefill dates and destination from the plan
          setForm((f) => ({
            ...f,
            start_date: f.start_date || r.data.start_date || "",
            end_date: f.end_date || r.data.end_date || "",
            destination_id: f.destination_id || r.data.destination_id || "",
            num_travelers: r.data.inputs?.num_people || f.num_travelers,
          }));
        })
        .catch(() => {});
    }
  }, [userId, otherType, planId]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const days = form.end_date && form.start_date
    ? Math.max(1, Math.round(
        (new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1)
    : 1;

  const primaryCost = Number(provider?.daily_rate || 0) * days;
  const secondCost = second ? Number(second.daily_rate || 0) * days : 0;
  const total = primaryCost + secondCost;

  const createBooking = async () => {
    setError("");
    setBusy(true);
    try {
      const items = [{ service_type: primaryType, provider_id: userId }];
      if (second) items.push({ service_type: otherType, provider_id: second.user_id });

      const { data } = await bookingsApi.create({
        booking_type: second ? "GUIDE_DRIVER" : primaryType,
        destination_id: form.destination_id || null,
        trip_plan_id: planId || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        num_travelers: Number(form.num_travelers),
        pickup_location: form.pickup_location || null,
        dropoff_location: form.dropoff_location || null,
        notes: form.notes || null,
        items,
      });
      setBooking(data);

      const res = await paymentsApi.intent(data.id);
      setIntent(res.data);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || "We couldn't create that booking.");
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setError("");
    setBusy(true);
    try {
      await paymentsApi.confirm({
        payment_id: intent.payment_id,
        intent_id: intent.intent_id,
      });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "The payment didn't complete.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !provider) {
    return (
      <div className="min-h-screen bg-[#F1EEE6]">
        <Navbar />
        <p className="py-40 text-center text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="min-h-screen bg-[#F1EEE6]">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-14">
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  const field =
    "mt-1.5 w-full rounded-lg border border-sand-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500";

  return (
    <div className="min-h-screen bg-[#F1EEE6]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* stepper */}
        <ol className="flex items-center">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  i < step ? "bg-brand-600 text-white"
                  : i === step ? "bg-saffron-500 text-night-900"
                  : "bg-sand-200 text-ink-soft"
                }`}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${i <= step ? "font-medium" : "text-ink-soft"}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={`mx-3 h-0.5 flex-1 rounded-full ${
                  i < step ? "bg-brand-600" : "bg-sand-200"
                }`} />
              )}
            </li>
          ))}
        </ol>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ---------- STEP 1 ---------- */}
        {step === 0 && (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-xl font-bold text-white">
                  {provider.full_name.charAt(0)}
                </span>
                <div>
                  <p className="eyebrow text-ink-soft">You're booking</p>
                  <p className="mt-0.5 font-display text-lg font-semibold">
                    {provider.full_name}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {primaryType === "GUIDE" ? "Tour guide" : "Driver"}
                    {provider.daily_rate > 0 &&
                      ` · LKR ${Number(provider.daily_rate).toLocaleString()} per day`}
                  </p>
                </div>
              </div>
            </div>

            {plan && (
              <div className="overflow-hidden rounded-2xl border border-brand-200 bg-brand-50">
                <div className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="eyebrow text-brand-700">Itinerary attached</p>
                    <p className="mt-1 font-display font-semibold">{plan.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {provider.full_name.split(" ")[0]} will see this once the booking is confirmed.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
                    {plan.items.length} stops
                  </span>
                </div>
                <details className="border-t border-brand-200/60 px-6 py-4">
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">
                    Preview the plan
                  </summary>
                  <div className="mt-4">
                    <ItineraryPreview plan={plan} />
                  </div>
                </details>
              </div>
            )}

            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">Trip details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="eyebrow text-ink-soft">Start date</label>
                  <input type="date" name="start_date" required
                         value={form.start_date} onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">End date</label>
                  <input type="date" name="end_date" value={form.end_date}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Travellers</label>
                  <input type="number" name="num_travelers" min={1}
                         value={form.num_travelers} onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Destination</label>
                  <select name="destination_id" value={form.destination_id}
                          onChange={change} className={field}>
                    <option value="">Not decided yet</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Pickup location</label>
                  <input name="pickup_location" value={form.pickup_location}
                         onChange={change} placeholder="Hotel or address" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Drop-off location</label>
                  <input name="dropoff_location" value={form.dropoff_location}
                         onChange={change} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ink-soft">Notes</label>
                  <textarea name="notes" rows={3} value={form.notes} onChange={change}
                            placeholder="Dietary needs, mobility requirements, anything else…"
                            className={field} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">
                Add a {otherType.toLowerCase()} too?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Optional. You choose who — Roamie never assigns anyone.
              </p>

              <select
                value={second?.user_id || ""}
                onChange={(e) =>
                  setSecond(secondOptions.find((o) => o.user_id === e.target.value) || null)
                }
                className={field}
              >
                <option value="">No {otherType.toLowerCase()}</option>
                {secondOptions.map((o) => (
                  <option key={o.user_id} value={o.user_id}>
                    {o.full_name}
                    {o.daily_rate > 0 && ` — LKR ${Number(o.daily_rate).toLocaleString()}/day`}
                    {o.vehicle_summary && ` · ${o.vehicle_summary}`}
                  </option>
                ))}
              </select>

              {second && (
                <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                  Adding {second.full_name}. Both providers will see your itinerary.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">Price</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-soft">
                    {provider.full_name} × {days} day{days > 1 ? "s" : ""}
                  </span>
                  <span>{primaryCost.toLocaleString()}</span>
                </div>
                {second && (
                  <div className="flex justify-between">
                    <span className="text-ink-soft">
                      {second.full_name} × {days} day{days > 1 ? "s" : ""}
                    </span>
                    <span>{secondCost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-sand-200 pt-3">
                  <span className="text-ink-soft">Total</span>
                  <span className="font-display text-2xl font-bold text-brand-600">
                    LKR {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={createBooking}
              disabled={busy || !form.start_date}
              className="w-full rounded-full bg-brand-600 py-3.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Creating booking…" : "Continue to payment"}
            </button>
          </div>
        )}

        {/* ---------- STEP 2 ---------- */}
        {step === 1 && intent && (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">Payment</h2>
              <p className="mt-1 font-mono text-sm text-ink-soft">{booking.reference}</p>

              <div className="mt-6 flex items-baseline justify-between border-t border-sand-200 pt-5">
                <span className="text-sm text-ink-soft">Amount due</span>
                <span className="font-display text-3xl font-bold text-brand-600">
                  {intent.currency} {Number(intent.amount).toLocaleString()}
                </span>
              </div>

              <div className="mt-5 rounded-xl bg-sand-50 p-4 text-sm">
                <p className="font-medium">Demo payment</p>
                <p className="mt-1 text-ink-soft">
                  Simulated gateway — no card details, no money moves. A real payment
                  record is written, and the amount is added to your budget.
                </p>
              </div>

              <button
                onClick={pay}
                disabled={busy}
                className="mt-5 w-full rounded-full bg-brand-600 py-3.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Processing…" : `Pay ${intent.currency} ${Number(intent.amount).toLocaleString()}`}
              </button>
            </div>

            <button onClick={() => setStep(0)} className="text-sm text-ink-soft hover:underline">
              ← Back to details
            </button>
          </div>
        )}

        {/* ---------- STEP 3 ---------- */}
        {step === 2 && (
          <div className="mt-10 rounded-2xl border border-sand-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-3xl text-brand-600">
              ✓
            </div>
            <h1 className="headline mt-5 text-3xl">Booking confirmed</h1>
            <p className="mt-3 text-ink-soft">
              {provider.full_name}
              {second && ` and ${second.full_name}`} from{" "}
              {new Date(form.start_date).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            <p className="mt-3 font-mono text-sm text-ink-soft">{booking.reference}</p>

            {plan && (
              <p className="mx-auto mt-5 max-w-sm rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                Your itinerary “{plan.title}” has been shared with{" "}
                {second ? "both providers" : provider.full_name.split(" ")[0]}.
              </p>
            )}

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/dashboard"
                    className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700">
                View my trips
              </Link>
              <Link to={`/messages/${booking.id}`}
                    className="rounded-full border border-sand-300 px-6 py-3 font-medium hover:bg-sand-100">
                Message them
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}