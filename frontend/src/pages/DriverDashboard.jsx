import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookingsApi, paymentsApi, availabilityApi, vehiclesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import SuggestionForm from "../components/SuggestionForm";
import ImageUpload from "../components/ImageUpload";
import BidBoard from "../components/BidBoard";

const TABS = ["Overview", "Trips", "Requests", "Vehicles", "Availability", "Suggest"];

const FLOW = ["CONFIRMED", "ON_THE_WAY", "PICKED_UP", "STARTED", "COMPLETED"];
const FLOW_LABEL = {
  CONFIRMED: "Confirmed",
  ON_THE_WAY: "On the way",
  PICKED_UP: "Picked up",
  STARTED: "Trip started",
  COMPLETED: "Completed",
};

const emptyVehicle = {
  vehicle_type: "", model: "", reg_no: "", seats: 4,
  is_ac: true, luggage_capacity: "", facilities: "",
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyVehicle);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [error, setError] = useState("");

  const loadAll = () => {
    bookingsApi.list().then((r) => setBookings(r.data)).catch(() => {});
    paymentsApi.earnings().then((r) => setEarnings(r.data)).catch(() => {});
    vehiclesApi.mine().then((r) => setVehicles(r.data)).catch(() => {});
    availabilityApi.mine().then((r) => setAvailability(r.data)).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const addVehicle = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await vehiclesApi.create({
        ...form,
        seats: Number(form.seats),
        facilities: form.facilities.split(",").map((f) => f.trim()).filter(Boolean),
        photos: vehiclePhotos,
      });
      setShowForm(false);
      setForm(emptyVehicle);
      setVehiclePhotos([]);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add vehicle.");
    }
  };

  const advance = async (item) => {
    const current = item.trip_status || "CONFIRMED";
    const next = FLOW[FLOW.indexOf(current) + 1];
    if (!next) return;
    try {
      await bookingsApi.tripStatus(item.id, next, null);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update status.");
    }
  };

  const toggleDate = async (d, current) => {
    const next = current === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
    await availabilityApi.set([d], next);
    availabilityApi.mine().then((r) => setAvailability(r.data));
  };

  const myItems = (b) =>
    b.items.filter((i) => i.provider_id === user.id && i.service_type === "DRIVER");

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Driver dashboard</h1>
        <p className="mt-1 text-ink/60">{user?.full_name}</p>

        <div className="mt-6 flex gap-1 border-b border-sand-300">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                tab === t
                  ? "border-b-2 border-brand-600 text-brand-600"
                  : "text-ink/55 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Overview */}
        {tab === "Overview" && (
          <div className="mt-8 space-y-6">
            {earnings && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Total earnings", earnings.total_earnings],
                  ["Received", earnings.completed_payments],
                  ["Pending", earnings.pending_payments],
                  ["Platform fee", earnings.platform_commission],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-sand-300 bg-white p-4">
                    <p className="text-xs text-ink/55">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-brand-600">
                      LKR {Number(value).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-sand-300 bg-white p-4">
                <p className="text-xs text-ink/55">Vehicles</p>
                <p className="mt-1 text-2xl font-semibold">
                  {vehicles.filter((v) => v.is_active).length}
                </p>
              </div>
              <div className="rounded-xl border border-sand-300 bg-white p-4">
                <p className="text-xs text-ink/55">Total trips</p>
                <p className="mt-1 text-2xl font-semibold">{bookings.length}</p>
              </div>
              <div className="rounded-xl border border-sand-300 bg-white p-4">
                <p className="text-xs text-ink/55">Upcoming</p>
                <p className="mt-1 text-2xl font-semibold">
                  {bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status)).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trips */}
        {tab === "Trips" && (
          <div className="mt-8 space-y-4">
            {bookings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sand-300 p-10 text-center text-ink/55">
                No trips yet.
              </p>
            ) : (
              bookings.map((b) =>
                myItems(b).map((item) => {
                  const current = item.trip_status || "CONFIRMED";
                  const idx = FLOW.indexOf(current);
                  const next = FLOW[idx + 1];
                  const live = b.status === "CONFIRMED" || b.status === "ACTIVE";

                  return (
                    <div key={item.id} className="rounded-xl border border-sand-300 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{b.reference}</p>
                          <p className="mt-0.5 text-sm text-ink/60">
                            {new Date(b.start_date).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                            {b.start_time && ` · ${b.start_time.slice(0, 5)}`}
                            {` · ${b.num_travelers} passenger${b.num_travelers > 1 ? "s" : ""}`}
                          </p>
                          {b.pickup_location && (
                            <p className="mt-1 text-sm">
                              <span className="text-ink/55">Pickup:</span> {b.pickup_location}
                            </p>
                          )}
                          {b.dropoff_location && (
                            <p className="text-sm">
                              <span className="text-ink/55">Drop-off:</span> {b.dropoff_location}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium">
                            {b.status}
                          </span>
                          <p className="mt-2 font-semibold text-brand-600">
                            LKR {Number(item.provider_net).toLocaleString()}
                          </p>
                          <Link to={`/messages/${b.id}`}
                                className="mt-1 block text-xs text-brand-600 hover:underline">
                            Message traveller
                          </Link>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-sand-300 pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {FLOW.map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs ${
                                  i <= idx
                                    ? "bg-brand-600 text-white"
                                    : "bg-sand-100 text-ink/45"
                                }`}
                              >
                                {FLOW_LABEL[s]}
                              </span>
                              {i < FLOW.length - 1 && (
                                <span className="text-ink/25">→</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {next && live && (
                          <button
                            onClick={() => advance(item)}
                            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                          >
                            Mark as {FLOW_LABEL[next].toLowerCase()}
                          </button>
                        )}
                        {!next && (
                          <p className="mt-3 text-sm text-brand-600">Trip completed.</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        )}

        {/* Vehicles */}
        {tab === "Vehicles" && (
          <div className="mt-8">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">My vehicles</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                {showForm ? "Cancel" : "Add vehicle"}
              </button>
            </div>

            {showForm && (
              <form onSubmit={addVehicle} className="mt-5 rounded-xl border border-sand-300 bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Vehicle type</label>
                    <input name="vehicle_type" required value={form.vehicle_type}
                           onChange={change} placeholder="Van, Car, SUV, Bus"
                           className={field} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Model</label>
                    <input name="model" value={form.model} onChange={change}
                           placeholder="Toyota KDH" className={field} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Registration number</label>
                    <input name="reg_no" required value={form.reg_no} onChange={change}
                           placeholder="WP-ABC-1234" className={field} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Seats</label>
                    <input type="number" name="seats" min={1} value={form.seats}
                           onChange={change} className={field} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Luggage capacity</label>
                    <input name="luggage_capacity" value={form.luggage_capacity}
                           onChange={change} placeholder="4 large suitcases"
                           className={field} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Facilities (comma separated)</label>
                    <input name="facilities" value={form.facilities} onChange={change}
                           placeholder="WiFi, Charging ports, Cooler" className={field} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="is_ac" checked={form.is_ac}
                             onChange={change} className="accent-brand-600" />
                      Air conditioned
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUpload value={vehiclePhotos} onChange={setVehiclePhotos}
                                 max={4} label="Vehicle photos" />
                  </div>
                </div>
                <button className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                  Add vehicle
                </button>
              </form>
            )}

            <div className="mt-5 space-y-3">
              {vehicles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-sand-300 p-10 text-center text-ink/55">
                  No vehicles registered yet.
                </p>
              ) : (
                vehicles.map((v) => (
                  <div key={v.id} className="flex items-start justify-between rounded-xl border border-sand-300 bg-white p-4">
                    <div>
                      <p className="font-medium">
                        {v.vehicle_type} {v.model && `· ${v.model}`}
                      </p>
                      <p className="text-sm text-ink/60">
                        {v.reg_no} · {v.seats} seats · {v.is_ac ? "AC" : "Non-AC"}
                      </p>
                      {v.luggage_capacity && (
                        <p className="text-xs text-ink/50">Luggage: {v.luggage_capacity}</p>
                      )}
                      {v.facilities?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {v.facilities.map((f) => (
                            <span key={f} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      {v.photos?.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {v.photos.map((url) => (
                            <img key={url} src={url} alt=""
                                 className="h-16 w-24 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          v.verification_status === "APPROVED"
                            ? "bg-brand-50 text-brand-700"
                            : v.verification_status === "REJECTED"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {v.verification_status}
                      </span>
                      <button
                        onClick={() => vehiclesApi.deactivate(v.id).then(loadAll)}
                        className="mt-2 block text-xs text-ink/45 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Availability */}
        {tab === "Availability" && (
          <div className="mt-8">
            <p className="text-sm text-ink/60">
              Click a date to switch between available and unavailable. Booked dates are locked.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {availability.map((a) => {
                const booked = a.status === "BOOKED";
                const free = a.status === "AVAILABLE";
                return (
                  <button
                    key={a.id}
                    disabled={booked}
                    onClick={() => toggleDate(a.date, a.status)}
                    className={`rounded-lg border p-2.5 text-xs transition ${
                      booked
                        ? "cursor-not-allowed border-brand-200 bg-brand-50 text-brand-700"
                        : free
                        ? "border-sand-300 bg-white hover:border-brand-500"
                        : "border-sand-300 bg-sand-100 text-ink/45 line-through"
                    }`}
                  >
                    <span className="block font-medium">
                      {new Date(a.date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                    <span className="mt-0.5 block text-[10px]">
                      {booked ? "Booked" : free ? "Free" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggest */}
               {tab === "Requests" && (
          <div className="mt-8">
            <BidBoard />
          </div>
        )}

        {tab === "Suggest" && (
          <div className="mt-8">
            <SuggestionForm />
          </div>
        )}
      

      </main>
    </div>
  );
}