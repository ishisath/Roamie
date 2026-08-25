import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { providersApi, bookingsApi, paymentsApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const STEPS = ["Details", "Payment", "Confirmed"];

export default function BookProvider() {
  const { userId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const primaryType = (params.get("type") || "GUIDE").toUpperCase();

  const [provider, setProvider] = useState(null);
  const [second, setSecond] = useState(null);        // optional other provider
  const [secondOptions, setSecondOptions] = useState([]);
  const [destinations, setDestinations] = useState([]);
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

  const otherType = primaryType === "GUIDE" ? "DRIVER" : "GUIDE";

  useEffect(() => {
    providersApi.profile(userId).then((r) => setProvider(r.data))
      .catch(() => setError("Provider not found"));

    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items)).catch(() => {});

    const call = otherType === "GUIDE" ? providersApi.guides : providersApi.drivers;
    call({ sort: "rating" }).then((r) => setSecondOptions(r.data)).catch(() => {});
  }, [userId, otherType]);

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
      setError(err.response?.data?.detail || "Could not create booking.");
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
      setError(err.response?.data?.detail || "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !provider) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="py-32 text-center text-ink/60">{error}</p>
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="h-64 animate-pulse rounded-xl bg-sand-100" />
        </div>
      </div>
    );
  }

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <ol className="flex items-center gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i <= step ? "bg-brand-600 text-white" : "bg-sand-100 text-ink/50"
                }`}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${i <= step ? "font-medium" : "text-ink/50"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <span className="h-px w-8 bg-sand-300" />}
            </li>
          ))}
        </ol>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 0 && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <p className="text-xs text-ink/55">You're booking</p>
              <p className="mt-1 font-semibold">{provider.full_name}</p>
              <p className="text-sm text-ink/60">
                {primaryType === "GUIDE" ? "Tour guide" : "Driver"}
                {provider.daily_rate > 0 &&
                  ` · LKR ${Number(provider.daily_rate).toLocaleString()} per day`}
              </p>
            </div>

            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Trip details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Start date</label>
                  <input type="date" name="start_date" required
                         value={form.start_date} onChange={change} className={field} />
                </div>
                <div>
                  <label className="text-sm font-medium">End date</label>
                  <input type="date" name="end_date" value={form.end_date}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="text-sm font-medium">Travellers</label>
                  <input type="number" name="num_travelers" min={1}
                         value={form.num_travelers} onChange={change} className={field} />
                </div>
                <div>
                  <label className="text-sm font-medium">Destination</label>
                  <select name="destination_id" value={form.destination_id}
                          onChange={change} className={field}>
                    <option value="">Not decided yet</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Pickup location</label>
                  <input name="pickup_location" value={form.pickup_location}
                         onChange={change} placeholder="Hotel or address" className={field} />
                </div>
                <div>
                  <label className="text-sm font-medium">Drop-off location</label>
                  <input name="dropoff_location" value={form.dropoff_location}
                         onChange={change} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea name="notes" rows={3} value={form.notes}
                            onChange={change} className={field} />
                </div>
              </div>
            </div>

            {/* Optionally add the other provider type */}
            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">
                Add a {otherType.toLowerCase()} too?
              </h2>
              <p className="mt-1 text-sm text-ink/60">
                Optional — you choose who, and you can always book separately later.
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
                <p className="mt-2 text-xs text-brand-700">
                  Adding {second.full_name}. You chose this — nothing was assigned.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Price</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink/60">
                    {provider.full_name} × {days} day{days > 1 ? "s" : ""}
                  </span>
                  <span>{primaryCost.toLocaleString()}</span>
                </div>
                {second && (
                  <div className="flex justify-between">
                    <span className="text-ink/60">
                      {second.full_name} × {days} day{days > 1 ? "s" : ""}
                    </span>
                    <span>{secondCost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-sand-300 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-brand-600">LKR {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={createBooking}
              disabled={busy || !form.start_date}
              className="w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Creating booking…" : "Continue to payment"}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && intent && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Payment</h2>
              <p className="mt-1 text-sm text-ink/60">
                Reference <span className="font-mono">{booking.reference}</span>
              </p>
              <div className="mt-5 flex items-baseline justify-between border-t border-sand-300 pt-4">
                <span className="text-sm text-ink/60">Amount due</span>
                <span className="text-2xl font-semibold text-brand-600">
                  {intent.currency} {Number(intent.amount).toLocaleString()}
                </span>
              </div>
              <div className="mt-5 rounded-lg bg-sand-100 p-4 text-sm text-ink/70">
                <p className="font-medium text-ink">Demo payment</p>
                <p className="mt-1">
                  Simulated gateway — no card details, no money moves. A real payment
                  record is still written.
                </p>
              </div>
              <button
                onClick={pay}
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Processing…" : "Pay now"}
              </button>
            </div>
            <button onClick={() => setStep(0)} className="text-sm text-ink/60 hover:underline">
              ← Back
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="mt-10 rounded-xl border border-sand-300 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl text-brand-600">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Booking confirmed</h1>
            <p className="mt-2 text-ink/70">
              {provider.full_name}
              {second && ` and ${second.full_name}`} from{" "}
              {new Date(form.start_date).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            <p className="mt-3 text-sm text-ink/55">
              Reference <span className="font-mono">{booking.reference}</span>
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/dashboard"
                    className="rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700">
                View my bookings
              </Link>
              <Link to={`/messages/${booking.id}`}
                    className="rounded-lg border border-sand-300 px-6 py-2.5 font-medium hover:bg-sand-100">
                Message them
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}