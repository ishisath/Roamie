import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { aiApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const INTERESTS = [
  "Hiking", "Beaches", "Wildlife", "Culture", "History",
  "Food", "Photography", "Tea", "Adventure", "Relaxation",
];

export default function PlanTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    destination_id: "",
    start_date: "",
    days: 3,
    num_people: 2,
    budget: "",
    interests: [],
    preferences: "",
  });

  useEffect(() => {
    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items))
      .catch(() => {});
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleInterest = (i) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    setError("");
    setBusy(true);
    try {
      const { data } = await aiApi.plan({
        destination_id: form.destination_id || null,
        start_date: form.start_date,
        days: Number(form.days),
        num_people: Number(form.num_people),
        budget: form.budget ? Number(form.budget) : null,
        interests: form.interests,
        preferences: form.preferences || null,
      });
      navigate(`/plans/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate a plan. Try again.");
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Plan with AI</h1>
        <p className="mt-2 text-ink/65">
          Tell us what you're after and we'll draft a day-by-day itinerary with costs,
          weather and packing notes. It's a suggestion — you decide what to book.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="rounded-xl border border-sand-300 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Where to?</label>
                <select
                  name="destination_id"
                  value={form.destination_id}
                  onChange={change}
                  className={field}
                >
                  <option value="">Anywhere in Sri Lanka</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.region}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Start date</label>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={form.start_date}
                  onChange={change}
                  className={field}
                />
              </div>
              <div>
                <label className="text-sm font-medium">How many days</label>
                <input
                  type="number"
                  name="days"
                  min={1}
                  max={14}
                  value={form.days}
                  onChange={change}
                  className={field}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Travellers</label>
                <input
                  type="number"
                  name="num_people"
                  min={1}
                  value={form.num_people}
                  onChange={change}
                  className={field}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Budget LKR <span className="text-ink/40">(optional)</span>
                </label>
                <input
                  type="number"
                  name="budget"
                  value={form.budget}
                  onChange={change}
                  placeholder="60000"
                  className={field}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-sand-300 bg-white p-5">
            <label className="text-sm font-medium">What are you into?</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleInterest(i)}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                    form.interests.includes(i)
                      ? "bg-brand-600 text-white"
                      : "border border-sand-300 hover:bg-sand-100"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium">
                Anything else? <span className="text-ink/40">(optional)</span>
              </label>
              <textarea
                name="preferences"
                rows={3}
                value={form.preferences}
                onChange={change}
                placeholder="Travelling with kids, prefer slow mornings, vegetarian food…"
                className={field}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Drafting your itinerary…" : "Generate my itinerary"}
          </button>

          {busy && (
            <p className="text-center text-sm text-ink/55">
              This takes 10–20 seconds.
            </p>
          )}
        </form>

        <p className="mt-8 text-center text-xs text-ink/50">
          Roamie's AI only recommends. Nothing is booked until you choose it yourself.
        </p>
      </main>

      <Footer />
    </div>
  );
}