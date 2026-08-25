import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { bookingsApi, paymentsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-brand-50 text-brand-700",
  ACTIVE: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-sand-100 text-ink/70",
  CANCELLED: "bg-red-50 text-red-700",
};

const TRIP_LABEL = {
  CONFIRMED: "Confirmed",
  ON_THE_WAY: "On the way",
  PICKED_UP: "Picked up",
  STARTED: "Trip started",
  COMPLETED: "Completed",
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [b, setB] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    bookingsApi.detail(id)
      .then((r) => setB(r.data))
      .catch(() => setError("Booking not found"));

  useEffect(() => { load(); }, [id]);

  const pay = async () => {
    setError("");
    setBusy(true);
    try {
      const { data: intent } = await paymentsApi.intent(b.id);
      await paymentsApi.confirm({
        payment_id: intent.payment_id,
        intent_id: intent.intent_id,
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await bookingsApi.cancel(b.id, "Cancelled by traveller");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not cancel.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !b) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="py-32 text-center text-ink/60">{error}</p>
      </div>
    );
  }
  if (!b) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="h-64 animate-pulse rounded-xl bg-sand-100" />
        </div>
      </div>
    );
  }

  const isTraveler = user?.id === b.traveler_id;
  const unpaid = b.payment_status !== "SUCCESS" && b.status !== "CANCELLED";
  const canCancel = ["PENDING", "CONFIRMED"].includes(b.status);
  const canMessage = ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <button onClick={() => navigate(-1)} className="text-sm text-ink/55 hover:underline">
          ← Back
        </button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">
              {b.booking_type.replace("_", " + ")} booking
            </h1>
            <p className="mt-1 font-mono text-sm text-ink/55">{b.reference}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            STATUS_STYLES[b.status] || "bg-sand-100"
          }`}>
            {b.status}
          </span>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-sand-300 bg-white p-5">
          <h2 className="font-semibold">Trip details</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/55">Start date</dt>
              <dd className="font-medium">
                {new Date(b.start_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </dd>
            </div>
            {b.end_date && (
              <div>
                <dt className="text-ink/55">End date</dt>
                <dd className="font-medium">
                  {new Date(b.end_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-ink/55">Travellers</dt>
              <dd className="font-medium">{b.num_travelers}</dd>
            </div>
            <div>
              <dt className="text-ink/55">Payment</dt>
              <dd className={`font-medium ${
                b.payment_status === "SUCCESS" ? "text-brand-600" : "text-amber-700"
              }`}>
                {b.payment_status}
              </dd>
            </div>
            {b.pickup_location && (
              <div>
                <dt className="text-ink/55">Pickup</dt>
                <dd className="font-medium">{b.pickup_location}</dd>
              </div>
            )}
            {b.dropoff_location && (
              <div>
                <dt className="text-ink/55">Drop-off</dt>
                <dd className="font-medium">{b.dropoff_location}</dd>
              </div>
            )}
          </dl>

          {b.notes && (
            <div className="mt-4 border-t border-sand-300 pt-4">
              <p className="text-sm text-ink/55">Notes</p>
              <p className="mt-1 text-sm">{b.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-sand-300 bg-white p-5">
          <h2 className="font-semibold">Services</h2>
          <div className="mt-3 divide-y divide-sand-300">
            {b.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{item.service_type}</p>
                  <p className="text-xs text-ink/55">
                    Provider status: {item.provider_status}
                  </p>
                  {item.trip_status && (
                    <p className="mt-1 text-xs text-brand-700">
                      {TRIP_LABEL[item.trip_status] || item.trip_status}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {b.currency} {Number(item.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between border-t border-sand-300 pt-3 font-semibold">
            <span>Total</span>
            <span className="text-brand-600">
              {b.currency} {Number(b.total_amount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {isTraveler && unpaid && (
            <button
              onClick={pay}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Processing…" : `Pay ${b.currency} ${Number(b.total_amount).toLocaleString()}`}
            </button>
          )}
          {canMessage && (
            <Link
              to={`/messages/${b.id}`}
              className="rounded-lg border border-sand-300 px-5 py-2.5 font-medium hover:bg-sand-100"
            >
              Messages
            </Link>
          )}
          {isTraveler && canCancel && (
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-lg border border-red-200 px-5 py-2.5 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Cancel booking
            </button>
          )}
          {isTraveler && b.status === "COMPLETED" && (
            <Link
              to="/reviews"
              className="rounded-lg border border-sand-300 px-5 py-2.5 font-medium hover:bg-sand-100"
            >
              Leave a review
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}