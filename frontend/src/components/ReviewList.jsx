import { useEffect, useState } from "react";
import { reviewsApi } from "../api/endpoints";
import StarRating from "./StarRating";

export default function ReviewList({ type, id, dark = false }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!type || !id) return;
    reviewsApi.forSubject(type, id).then((r) => setReviews(r.data)).catch(() => {});
  }, [type, id]);

  if (reviews.length === 0) return null;

  const card = dark
    ? "rounded-2xl border border-white/10 bg-night-800/60 p-5"
    : "rounded-2xl border border-sand-200 bg-white p-5";
  const name = dark ? "text-white" : "text-ink";
  const body = dark ? "text-white/70" : "text-ink-soft";
  const meta = dark ? "text-white/40" : "text-ink-soft";
  const chip = dark
    ? "rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70"
    : "rounded-full bg-sand-100 px-2.5 py-0.5 text-xs text-ink-soft";

  return (
    <div>
      <h3 className={`eyebrow ${dark ? "text-saffron-400" : "text-brand-600"}`}>
        Reviews ({reviews.length})
      </h3>

      <div className="mt-4 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-display font-semibold ${name}`}>
                  {r.reviewer_name || "Traveller"}
                </p>
                <div className="mt-0.5">
                  <StarRating value={r.rating} readOnly size="text-sm" />
                </div>
              </div>
              <span className={`text-xs ${meta}`}>
                {new Date(r.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>

            {r.comment && <p className={`mt-3 leading-relaxed ${body}`}>{r.comment}</p>}

            {r.criteria && Object.keys(r.criteria).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(r.criteria).map(([k, v]) => (
                  <span key={k} className={chip}>{k} {v}★</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}