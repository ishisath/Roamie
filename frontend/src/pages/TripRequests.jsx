import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bidsApi, destinationsApi } from "../api/endpoints";
import Navbar from "../components/Navbar";

const empty = {
  kind: "DRIVER", destination_id: "", pickup_location: "",
  start_date: "", end_date: "", num_people: 2,
  vehicle_requirements: "", tourist_requirements: "",
  budget_min: "", budget_max: "", notes: "",
};

export default function TripRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const load = () =>
    bidsApi.myRequests().then((r) => setRequests(r.data)).catch(() => {});

  useEffect(() => {
    load();
    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items)).catch(() => {});
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await bidsApi.createRequest({
        ...form,
        destination_id: form.destination_id || null,
        end_date: form.end_date || null,
        num_people: Number(form.num_people),
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
      });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not post request.");
    }
  };

  const accept = async (bidId) => {
    try {
      const { data } = await bidsApi.acceptBid(bidId);
      navigate(`/dashboard`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not accept bid.");
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Trip requests</h1>
            <p className="mt-1 text-ink/60">
              Post what you need and let guides and drivers bid. You pick the winner.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? "Cancel" : "Post a request"}
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showForm && (
          <form onSubmit={submit} className="mt-6 rounded-xl border border-sand-300 bg-white p-5">
            <div className="flex gap-2">
              {[["GUIDE", "Guide"], ["DRIVER", "Driver"], ["BOTH", "Both"]].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, kind: v })}
                  className={`rounded-full px-4 py-1.5 text-sm ${
                    form.kind === v ? "bg-brand-600 text-white" : "border border-sand-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Destination</label>
                <select name="destination_id" value={form.destination_id}
                        onChange={change} className={field}>
                  <option value="">Not decided</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Pickup location</label>
                <input name="pickup_location" value={form.pickup_location}
                       onChange={change} className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">Start date</label>
                <input type="date" name="start_date" required value={form.start_date}
                       onChange={change} className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">End date</label>
                <input type="date" name="end_date" value={form.end_date}
                       onChange={change} className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">People</label>
                <input type="number" name="num_people" min={1} value={form.num_people}
                       onChange={change} className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle requirements</label>
                <input name="vehicle_requirements" value={form.vehicle_requirements}
                       onChange={change} placeholder="AC van, 6 seats"
                       className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">Budget from (LKR)</label>
                <input type="number" name="budget_min" value={form.budget_min}
                       onChange={change} className={field} />
              </div>
              <div>
                <label className="text-sm font-medium">Budget to (LKR)</label>
                <input type="number" name="budget_max" value={form.budget_max}
                       onChange={change} className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">What you need</label>
                <textarea name="tourist_requirements" rows={3}
                          value={form.tourist_requirements} onChange={change}
                          placeholder="English-speaking, good with kids, flexible timings…"
                          className={field} />
              </div>
            </div>

            <button className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
              Post request
            </button>
          </form>
        )}

        <div className="mt-8 space-y-4">
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand-300 p-10 text-center text-ink/55">
              No requests yet.
            </p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-sand-300 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.kind === "BOTH" ? "Guide + driver" : r.kind.toLowerCase()} ·{" "}
                      {r.destination_name || "Any destination"}
                    </p>
                    <p className="mt-0.5 text-sm text-ink/60">
                      {new Date(r.start_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {` · ${r.num_people} people`}
                      {r.budget_max && ` · up to LKR ${Number(r.budget_max).toLocaleString()}`}
                    </p>
                    {r.tourist_requirements && (
                      <p className="mt-1 text-sm text-ink/70">{r.tourist_requirements}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    r.status === "OPEN" ? "bg-brand-50 text-brand-700" : "bg-sand-100"
                  }`}>
                    {r.status}
                  </span>
                </div>

                <div className="mt-4 border-t border-sand-300 pt-4">
                  <p className="text-sm font-medium">
                    {r.bid_count} bid{r.bid_count === 1 ? "" : "s"}
                  </p>

                  {r.bids.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {r.bids.map((b) => (
                        <div key={b.id}
                             className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sand-300 p-3">
                          <div>
                            <p className="text-sm font-medium">
                              {b.provider_name}
                              <span className="ml-2 text-xs font-normal text-ink/55">
                                {b.provider_role.toLowerCase()}
                              </span>
                            </p>
                            <p className="text-xs text-ink/60">
                              {b.provider_rating > 0 &&
                                `★ ${Number(b.provider_rating).toFixed(1)} · `}
                              {b.provider_experience} years
                              {b.vehicle_summary && ` · ${b.vehicle_summary}`}
                            </p>
                            {b.notes && (
                              <p className="mt-1 text-xs text-ink/70">{b.notes}</p>
                            )}
                            {b.included_services?.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {b.included_services.map((s) => (
                                  <span key={s} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-brand-600">
                              LKR {Number(b.price).toLocaleString()}
                            </p>
                            {r.status === "OPEN" && b.status === "PENDING" && (
                              <button
                                onClick={() => accept(b.id)}
                                className="mt-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-700"
                              >
                                Accept
                              </button>
                            )}
                            {b.status !== "PENDING" && (
                              <p className="mt-1 text-xs text-ink/50">{b.status}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}