import { useEffect, useState } from "react";
import { bidsApi, vehiclesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function BidBoard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [openBid, setOpenBid] = useState(null);
  const [bid, setBid] = useState({ price: "", vehicle_id: "", notes: "", included: "" });
  const [error, setError] = useState("");

  const load = () =>
    bidsApi.openRequests().then((r) => setRequests(r.data)).catch(() => {});

  useEffect(() => {
    load();
    if (user?.role === "DRIVER")
      vehiclesApi.mine().then((r) => setVehicles(r.data)).catch(() => {});
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await bidsApi.submitBid(openBid.id, {
        price: Number(bid.price),
        vehicle_id: bid.vehicle_id || null,
        duration_days: openBid.end_date
          ? Math.round((new Date(openBid.end_date) - new Date(openBid.start_date)) / 86400000) + 1
          : 1,
        included_services: bid.included.split(",").map((s) => s.trim()).filter(Boolean),
        notes: bid.notes || null,
      });
      setOpenBid(null);
      setBid({ price: "", vehicle_id: "", notes: "", included: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit bid.");
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-300 p-10 text-center text-ink/55">
          No open requests right now.
        </p>
      ) : (
        requests.map((r) => {
          const alreadyBid = r.bids.length > 0;
          return (
            <div key={r.id} className="rounded-xl border border-sand-300 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {r.destination_name || "Flexible destination"}
                  </p>
                  <p className="mt-0.5 text-sm text-ink/60">
                    {new Date(r.start_date).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {r.end_date && ` – ${new Date(r.end_date).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short",
                    })}`}
                    {` · ${r.num_people} people`}
                  </p>
                  {r.pickup_location && (
                    <p className="text-sm"><span className="text-ink/55">Pickup:</span> {r.pickup_location}</p>
                  )}
                  {r.vehicle_requirements && (
                    <p className="text-sm"><span className="text-ink/55">Vehicle:</span> {r.vehicle_requirements}</p>
                  )}
                  {r.tourist_requirements && (
                    <p className="mt-1 text-sm text-ink/70">{r.tourist_requirements}</p>
                  )}
                </div>
                <div className="text-right">
                  {(r.budget_min || r.budget_max) && (
                    <p className="text-sm text-ink/60">
                      Budget: LKR {Number(r.budget_min || 0).toLocaleString()}–
                      {Number(r.budget_max || 0).toLocaleString()}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink/50">
                    {r.bid_count} bid{r.bid_count === 1 ? "" : "s"} so far
                  </p>
                </div>
              </div>

              {alreadyBid ? (
                <p className="mt-4 border-t border-sand-300 pt-3 text-sm text-brand-700">
                  You bid LKR {Number(r.bids[0].price).toLocaleString()} — {r.bids[0].status}
                </p>
              ) : openBid?.id === r.id ? (
                <form onSubmit={submit} className="mt-4 border-t border-sand-300 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Your price (LKR)</label>
                      <input type="number" required value={bid.price}
                             onChange={(e) => setBid({ ...bid, price: e.target.value })}
                             className={field} />
                    </div>
                    {user?.role === "DRIVER" && vehicles.length > 0 && (
                      <div>
                        <label className="text-sm font-medium">Vehicle</label>
                        <select value={bid.vehicle_id}
                                onChange={(e) => setBid({ ...bid, vehicle_id: e.target.value })}
                                className={field}>
                          <option value="">Choose…</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.vehicle_type} · {v.seats} seats · {v.is_ac ? "AC" : "Non-AC"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">Included services</label>
                      <input value={bid.included}
                             onChange={(e) => setBid({ ...bid, included: e.target.value })}
                             placeholder="Fuel, Tolls, Driver meals" className={field} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">Notes</label>
                      <textarea rows={2} value={bid.notes}
                                onChange={(e) => setBid({ ...bid, notes: e.target.value })}
                                className={field} />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700">
                      Submit bid
                    </button>
                    <button type="button" onClick={() => setOpenBid(null)}
                            className="rounded-lg border border-sand-300 px-5 py-2 text-sm hover:bg-sand-100">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setOpenBid(r)}
                  className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Place a bid
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}