import { useEffect, useState } from "react";
import { reviewsApi } from "../api/endpoints";
import StarRating from "./StarRating";

export default function ReviewList({ type, id }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!type || !id) return;
    reviewsApi.forSubject(type, id).then((r) => setReviews(r.data)).catch(() => {});
  }, [type, id]);

  if (reviews.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink/80">
        Reviews ({reviews.length})
      </h3>
      <div className="mt-3 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-sand-300 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{r.reviewer_name || "Traveller"}</p>
                <StarRating value={r.rating} readOnly size="text-sm" />
              </div>
              <span className="text-xs text-ink/50">
                {new Date(r.created_at).toLocaleDateString("en-GB")}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-ink/75">{r.comment}</p>}
            {r.criteria && Object.keys(r.criteria).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(r.criteria).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs">
                    {k}: {v}★
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}