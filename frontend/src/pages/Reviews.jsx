import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reviewsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import StarRating from "../components/StarRating";
import { Panel, Pill, EmptyState } from "../components/DashShell";

const CRITERIA = {
  DRIVER: ["Safety", "Driving", "Punctuality", "Communication", "Vehicle condition"],
  GUIDE: ["Knowledge", "Communication", "Punctuality", "Value"],
  PACKAGE: ["Value for money", "Accuracy", "Organisation"],
};

export default function Reviews() {
  const [pending, setPending] = useState([]);
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [criteria, setCriteria] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    reviewsApi.pending().then((r) => setPending(r.data)).catch(() => {});
    reviewsApi.mine().then((r) => setMine(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const start = (item) => {
    setOpen(item);
    setRating(0);
    setComment("");
    setCriteria({});
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError("Pick a star rating first.");
    setBusy(true);
    try {
      await reviewsApi.create({
        booking_id: open.booking_id,
        subject_type: open.subject_type,
        subject_id: open.subject_id,
        rating,
        comment: comment || null,
        criteria,
      });
      setOpen(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't save that review.");
    } finally {
      setBusy(false);
    }
  };

  const list = open ? CRITERIA[open.subject_type] || [] : [];
  const avgGiven = mine.length
    ? (mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-[#F1EEE6]">
      <Navbar />

      <div className="border-b border-sand-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-9">
          <p className="eyebrow text-brand-600">Feedback</p>
          <h1 className="headline mt-1.5 text-[2.5rem] leading-none">Reviews</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Ratings shape which guides and drivers other travellers see. Yours matters.
          </p>

          {(pending.length > 0 || mine.length > 0) && (
            <div className="mt-7 flex flex-wrap gap-x-10 gap-y-3">
              <div>
                <p className="eyebrow text-ink-soft">Waiting on you</p>
                <p className="mt-1 font-display text-2xl font-bold">{pending.length}</p>
              </div>
              <div>
                <p className="eyebrow text-ink-soft">Written</p>
                <p className="mt-1 font-display text-2xl font-bold">{mine.length}</p>
              </div>
              {avgGiven && (
                <div>
                  <p className="eyebrow text-ink-soft">Average you give</p>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {avgGiven}
                    <span className="ml-1 text-lg text-saffron-500">★</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-5 px-6 py-8">
        {/* the form, when open */}
        {open && (
          <Panel
            title={`Reviewing ${open.subject_name}`}
            sub={`${open.subject_type.toLowerCase()} · ${open.reference}`}
          >
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div className="rounded-xl bg-sand-50 p-6 text-center">
                <p className="eyebrow text-ink-soft">Overall</p>
                <div className="mt-3 flex justify-center">
                  <StarRating value={rating} onChange={setRating} size="text-4xl" />
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  {["", "Poor", "Below expectations", "Fine", "Good", "Excellent"][rating] ||
                    "Tap a star"}
                </p>
              </div>

              {list.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow text-ink-soft">Rate the details</p>
                  <div className="mt-3 divide-y divide-sand-100">
                    {list.map((c) => (
                      <div key={c} className="flex items-center justify-between py-2.5">
                        <span className="text-sm">{c}</span>
                        <StarRating
                          size="text-xl"
                          value={criteria[c] || 0}
                          onChange={(v) => setCriteria({ ...criteria, [c]: v })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <label className="eyebrow text-ink-soft">
                  What should other travellers know?
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What went well, what to expect…"
                  className="mt-1.5 w-full rounded-lg border border-sand-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  disabled={busy}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Publish review"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="rounded-lg border border-sand-300 px-5 py-2.5 text-sm hover:bg-sand-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Panel>
        )}

        {/* pending */}
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Waiting for your review</h2>
          {pending.length === 0 ? (
            <EmptyState
              title="Nothing to review"
              body="Reviews open once a trip is completed. Yours will appear here."
              action={
                <Link to="/dashboard"
                      className="rounded-lg border border-sand-300 px-5 py-2.5 text-sm font-medium hover:bg-sand-100">
                  Back to my trips
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div
                  key={`${p.booking_id}-${p.subject_id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sand-200 bg-white p-5"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-white">
                      {p.subject_name.charAt(0)}
                    </span>
                    <div>
                      <p className="font-display font-semibold">{p.subject_name}</p>
                      <p className="text-xs text-ink-soft">
                        <Pill tone="neutral">{p.subject_type}</Pill>
                        <span className="ml-2 font-mono">{p.reference}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => start(p)}
                    className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400"
                  >
                    Write review
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* past reviews */}
        {mine.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Reviews you've written</h2>
            <div className="space-y-3">
              {mine.map((r) => (
                <div key={r.id} className="rounded-2xl border border-sand-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <StarRating value={r.rating} readOnly size="text-base" />
                      <p className="mt-1 text-xs text-ink-soft">
                        {r.subject_type.toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xs text-ink-soft">
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-3 leading-relaxed text-ink-soft">{r.comment}</p>
                  )}
                  {r.criteria && Object.keys(r.criteria).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(r.criteria).map(([k, v]) => (
                        <span key={k} className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs text-ink-soft">
                          {k} {v}★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}