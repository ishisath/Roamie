import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { packagesApi, bookingsApi, paymentsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const STEPS = ["Review", "Payment", "Confirmed"];

export default function BookPackage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pkg, setPkg] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [booking, setBooking] = useState(null);
  const [intent, setIntent] = useState(null);

  const [form, setForm] = useState({
    start_date: params.get("date") || "",
    num_travelers: Number(params.get("travelers") || 1),
    pickup_location: "",
    notes: "",
  });

  useEffect(() => {
    packagesApi
      .detail(id)
      .then((r) => {
        setPkg(r.data);
        if (!form.start_date && r.data.dates?.length) {
          setForm((f) => ({ ...f, start_date: r.data.dates[0].start_date }));
        }
      })
      .catch(() => setError("Package not found"));
  }, [id]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const total = pkg
    ? Number(pkg.price) * form.num_travelers + Number(pkg.extra_transport_cost || 0)
    : 0;

  const createBooking = async () => {
    setError("");
    setBusy(true);
    try {
      const { data } = await bookingsApi.create({
        booking_type: "PACKAGE",
        start_date: form.start_date,
        num_travelers: Number(form.num_travelers),
        pickup_location: form.pickup_location || null,
        notes: form.notes || null,
        items: [{ service_type: "PACKAGE", package_id: id }],
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

  if (error && !pkg) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="py-32 text-center text-ink/60">{error}</p>
      </div>
    );
  }
  if (!pkg) {
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
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Stepper */}
        <ol className="flex items-center gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                    i <= step ? "bg-brand-600 text-white" : "bg-sand-100 text-ink/50"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${i <= step ? "font-medium" : "text-ink/50"}`}>
                  {s}
                </span>
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

        {/* Step 1 — Review */}
        {step === 0 && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <div className="flex gap-4">
                {pkg.photos?.[0] && (
                  <img
                    src={pkg.photos[0].url}
                    alt=""
                    className="h-20 w-28 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h1 className="font-semibold">{pkg.title}</h1>
                  <p className="mt-1 text-sm text-ink/60">
                    {pkg.duration_days} day{pkg.duration_days > 1 ? "s" : ""} ·{" "}
                    {pkg.transport_included ? "Transport included" : "No transport"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Trip details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Start date</label>
                  {pkg.dates?.length ? (
                    <select
                      name="start_date"
                      value={form.start_date}
                      onChange={change}
                      className={field}
                    >
                      {pkg.dates.map((d) => (
                        <option key={d.id} value={d.start_date}>
                          {new Date(d.start_date).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={change}
                      className={field}
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Travelers</label>
                  <input
                    type="number"
                    name="num_travelers"
                    min={1}
                    max={pkg.max_travelers}
                    value={form.num_travelers}
                    onChange={change}
                    className={field}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">
                    Pickup location <span className="text-ink/40">(optional)</span>
                  </label>
                  <input
                    name="pickup_location"
                    value={form.pickup_location}
                    onChange={change}
                    placeholder="Hotel name or address"
                    className={field}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">
                    Notes for the guide <span className="text-ink/40">(optional)</span>
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={change}
                    placeholder="Dietary needs, mobility requirements, anything else…"
                    className={field}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Price</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink/60">
                    {pkg.currency} {Number(pkg.price).toLocaleString()} × {form.num_travelers}
                  </span>
                  <span>{(Number(pkg.price) * form.num_travelers).toLocaleString()}</span>
                </div>
                {Number(pkg.extra_transport_cost) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink/60">Transport</span>
                    <span>{Number(pkg.extra_transport_cost).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-sand-300 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-brand-600">
                    {pkg.currency} {total.toLocaleString()}
                  </span>
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

        {/* Step 2 — Payment */}
        {step === 1 && intent && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Payment</h2>
              <p className="mt-1 text-sm text-ink/60">
                Booking reference <span className="font-mono">{booking.reference}</span>
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
                  This uses a simulated gateway. No card details are collected and no
                  money moves. A real payment record is still written to the database.
                </p>
              </div>

              <button
                onClick={pay}
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Processing…" : `Pay ${intent.currency} ${Number(intent.amount).toLocaleString()}`}
              </button>
            </div>

            <button
              onClick={() => setStep(0)}
              className="text-sm text-ink/60 hover:underline"
            >
              ← Back to review
            </button>
          </div>
        )}

        {/* Step 3 — Confirmed */}
        {step === 2 && (
          <div className="mt-10 rounded-xl border border-sand-300 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl text-brand-600">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Booking confirmed</h1>
            <p className="mt-2 text-ink/70">
              {pkg.title} on{" "}
              {new Date(form.start_date).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}{" "}
              for {form.num_travelers} traveler{form.num_travelers > 1 ? "s" : ""}.
            </p>
            <p className="mt-3 text-sm text-ink/55">
              Reference <span className="font-mono">{booking.reference}</span>
            </p>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to="/dashboard"
                className="rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700"
              >
                View my bookings
              </Link>
              <Link
                to="/packages"
                className="rounded-lg border border-sand-300 px-6 py-2.5 font-medium hover:bg-sand-100"
              >
                Browse more
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}