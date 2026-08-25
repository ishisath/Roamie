import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const INTERESTS = [
  "Hiking", "Beaches", "Wildlife", "Culture", "History",
  "Food", "Photography", "Tea", "Adventure", "Relaxation",
];

const LOADING_LINES = [
  "Reading the weather forecast…",
  "Working out travel times…",
  "Pricing activities in rupees…",
  "Laying out your days…",
];

export default function PlanTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
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
      .then((r) => setDestinations(r.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 2600);
    return () => clearInterval(t);
  }, [busy]);

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
      setError(err.response?.data?.detail || "The planner couldn't finish. Try again.");
      setBusy(false);
    }
  };

  const selected = destinations.find((d) => d.id === form.destination_id);
  const backdrop = selected?.photos?.[0]?.url;

  const field =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-night-900/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-saffron-400";

  return (
    <div className="min-h-screen bg-night-900">
      <Navbar />

      <div className="relative">
        {/* backdrop reacts to the chosen destination */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700/40 via-night-900 to-night-900" />
          {backdrop && (
            <img
              key={backdrop}
              src={backdrop}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-night-900/70 via-night-900/85 to-night-900" />
        </div>

        <main className="relative mx-auto max-w-3xl px-6 py-16">
          <span className="eyebrow text-saffron-400">AI trip planner</span>
          <h1 className="headline mt-3 text-[clamp(2.25rem,5.5vw,4rem)] uppercase text-white">
            Tell us the shape<br />of your trip
          </h1>
          <p className="mt-4 max-w-lg text-white/65">
            A day-by-day itinerary with real costs, weather and packing notes —
            drafted in about fifteen seconds. It's a suggestion. You decide what
            to book.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-10 space-y-5">
            <div className="rounded-[18px] border border-white/10 bg-night-800/60 p-6 backdrop-blur">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Where to</label>
                  <select name="destination_id" value={form.destination_id}
                          onChange={change} className={field}>
                    <option value="">Anywhere in Sri Lanka</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} — {d.region}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow text-white/45">Start date</label>
                  <input type="date" name="start_date" required
                         value={form.start_date} onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Days</label>
                  <input type="number" name="days" min={1} max={14}
                         value={form.days} onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Travellers</label>
                  <input type="number" name="num_people" min={1}
                         value={form.num_people} onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Budget (LKR)</label>
                  <input type="number" name="budget" value={form.budget}
                         onChange={change} placeholder="Optional" className={field} />
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-night-800/60 p-6 backdrop-blur">
              <label className="eyebrow text-white/45">What are you into?</label>
              <div className="mt-4 flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const on = form.interests.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        on
                          ? "bg-saffron-500 font-medium text-night-900"
                          : "border border-white/15 text-white/65 hover:border-white/35 hover:text-white"
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <label className="eyebrow text-white/45">Anything else</label>
                <textarea name="preferences" rows={3} value={form.preferences}
                          onChange={change}
                          placeholder="Travelling with kids, slow mornings, vegetarian food…"
                          className={field} />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-saffron-500 py-4 font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-70"
            >
              {busy ? LOADING_LINES[line] : "Draft my itinerary"}
            </button>

            {busy && (
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 animate-[slide_1.6s_ease-in-out_infinite] rounded-full bg-saffron-500" />
              </div>
            )}
          </form>

          <p className="mt-8 text-center text-xs text-white/35">
            Roamie's AI only recommends. Nothing is booked until you choose it.
          </p>
        </main>
      </div>

      <Footer />
    </div>
  );
}