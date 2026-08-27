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

  const [wantBudget, setWantBudget] = useState(true);
  const [budgetTotal, setBudgetTotal] = useState("");

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
      .catch(() => setError("We couldn't find that package."));
  }, [id]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const total = pkg
    ? Number(pkg.price) * form.num_travelers + Number(pkg.extra_transport_cost || 0)
    : 0;

  // suggest a budget with headroom for spending on the ground
  useEffect(() => {
    if (!total) return;
    setBudgetTotal(String(Math.round(total * 1.4)));
  }, [total]);

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
        budget_total: wantBudget && budgetTotal ? Number(budgetTotal) : null,
        items: [{ service_type: "PACKAGE", package_id: id }],
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

  if (error && !pkg) {
    return (
      <div className="min-h-screen bg-[#F1EEE6]">
        <Navbar />
        <p className="py-40 text-center text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!pkg) {
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
              <div className="flex gap-4">
                {pkg.photos?.[0] && (
                  <img src={pkg.photos[0].url} alt=""
                       className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                )}
                <div>
                  <p className="eyebrow text-ink-soft">You're booking</p>
                  <h1 className="mt-1 font-display text-lg font-semibold">{pkg.title}</h1>
                  <p className="text-sm text-ink-soft">
                    {pkg.duration_days} day{pkg.duration_days > 1 ? "s" : ""} ·{" "}
                    {pkg.transport_included ? "Transport included" : "No transport"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">Trip details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="eyebrow text-ink-soft">Start date</label>
                  {pkg.dates?.length ? (
                    <select name="start_date" value={form.start_date}
                            onChange={change} className={field}>
                      {pkg.dates.map((d) => (
                        <option key={d.id} value={d.start_date}>
                          {new Date(d.start_date).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="date" name="start_date" value={form.start_date}
                           onChange={change} className={field} />
                  )}
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Travellers</label>
                  <input type="number" name="num_travelers" min={1} max={pkg.max_travelers}
                         value={form.num_travelers} onChange={change} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ink-soft">Pickup location</label>
                  <input name="pickup_location" value={form.pickup_location}
                         onChange={change} placeholder="Hotel name or address"
                         className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ink-soft">Notes for the guide</label>
                  <textarea name="notes" rows={3} value={form.notes} onChange={change}
                            placeholder="Dietary needs, mobility requirements, anything else…"
                            className={field} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold">Price</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-soft">
                    {pkg.currency} {Number(pkg.price).toLocaleString()} × {form.num_travelers}
                  </span>
                  <span>{(Number(pkg.price) * form.num_travelers).toLocaleString()}</span>
                </div>
                {Number(pkg.extra_transport_cost) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Transport</span>
                    <span>{Number(pkg.extra_transport_cost).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-sand-200 pt-3">
                  <span className="text-ink-soft">Total</span>
                  <span className="font-display text-2xl font-bold text-brand-600">
                    {pkg.currency} {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* budget */}
            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={wantBudget}
                  onChange={(e) => setWantBudget(e.target.checked)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block font-display font-semibold">
                    Track a budget for this trip
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    Roamie creates a budget for this booking and logs what you've paid.
                    Add food, tips and anything else as you go.
                  </span>
                </span>
              </label>

              {wantBudget && (
                <div className="mt-5 border-t border-sand-200 pt-5">
                  <label className="eyebrow text-ink-soft">
                    Total budget for this trip ({pkg.currency})
                  </label>
                  <input
                    type="number"
                    value={budgetTotal}
                    onChange={(e) => setBudgetTotal(e.target.value)}
                    className={field}
                  />
                  <p className="mt-2 text-xs text-ink-soft">
                    The booking costs {pkg.currency} {total.toLocaleString()}. We've
                    suggested a little extra for spending on the ground — change it to
                    whatever suits.
                  </p>
                </div>
              )}
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
                  record is written to the database.
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
              ← Back to review
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
              {pkg.title} on{" "}
              {new Date(form.start_date).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}{" "}
              for {form.num_travelers} traveller{form.num_travelers > 1 ? "s" : ""}.
            </p>
            <p className="mt-3 font-mono text-sm text-ink-soft">{booking.reference}</p>

            {wantBudget && budgetTotal && (
              <p className="mx-auto mt-5 max-w-sm rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                A budget of {pkg.currency} {Number(budgetTotal).toLocaleString()} has been
                set up for this trip, with what you paid already logged.
              </p>
            )}

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/dashboard"
                    className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700">
                View my trips
              </Link>
              {wantBudget && budgetTotal && (
                <Link to="/budget"
                      className="rounded-full border border-sand-300 px-6 py-3 font-medium hover:bg-sand-100">
                  Open the budget
                </Link>
              )}
              <Link to={`/messages/${booking.id}`}
                    className="rounded-full border border-sand-300 px-6 py-3 font-medium hover:bg-sand-100">
                Message the guide
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}