import { useEffect, useState } from "react";
import { reviewsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import StarRating from "../components/StarRating";

const DRIVER_CRITERIA = ["Safety", "Driving", "Punctuality", "Communication", "Vehicle condition"];
const GUIDE_CRITERIA = ["Knowledge", "Communication", "Punctuality", "Value"];

export default function Reviews() {
  const [pending, setPending] = useState([]);
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [criteria, setCriteria] = useState({});
  const [error, setError] = useState("");

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
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError("Please choose a star rating.");
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
      setError(err.response?.data?.detail || "Could not submit review.");
    }
  };

  const criteriaList =
    open?.subject_type === "DRIVER" ? DRIVER_CRITERIA
    : open?.subject_type === "GUIDE" ? GUIDE_CRITERIA
    : [];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Reviews</h1>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Waiting for your review</h2>
          {pending.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-sand-300 p-8 text-center text-sm text-ink/55">
              Nothing to review yet. Reviews open once a booking is completed.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {pending.map((p) => (
                <div key={`${p.booking_id}-${p.subject_id}`}
                     className="flex items-center justify-between rounded-xl border border-sand-300 bg-white p-4">
                  <div>
                    <p className="font-medium">{p.subject_name}</p>
                    <p className="text-xs text-ink/55">
                      {p.subject_type.toLowerCase()} · {p.reference}
                    </p>
                  </div>
                  <button
                    onClick={() => start(p)}
                    className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700"
                  >
                    Write review
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {open && (
          <form onSubmit={submit} className="mt-6 rounded-xl border border-sand-300 bg-white p-5">
            <h3 className="font-semibold">Reviewing {open.subject_name}</h3>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium">Overall rating</label>
              <div className="mt-1">
                <StarRating value={rating} onChange={setRating} />
              </div>
            </div>

            {criteriaList.length > 0 && (
              <div className="mt-5 space-y-2">
                <label className="text-sm font-medium">Rate the details</label>
                {criteriaList.map((c) => (
                  <div key={c} className="flex items-center justify-between">
                    <span className="text-sm text-ink/70">{c}</span>
                    <StarRating
                      size="text-lg"
                      value={criteria[c] || 0}
                      onChange={(v) => setCriteria({ ...criteria, [c]: v })}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <label className="text-sm font-medium">Comment</label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the experience?"
                className="mt-1 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Submit review
              </button>
              <button type="button" onClick={() => setOpen(null)}
                      className="rounded-lg border border-sand-300 px-5 py-2.5 text-sm hover:bg-sand-100">
                Cancel
              </button>
            </div>
          </form>
        )}

        {mine.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Your past reviews</h2>
            <div className="mt-3 space-y-3">
              {mine.map((r) => (
                <div key={r.id} className="rounded-xl border border-sand-300 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <StarRating value={r.rating} readOnly size="text-base" />
                    <span className="text-xs text-ink/50">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-ink/75">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}