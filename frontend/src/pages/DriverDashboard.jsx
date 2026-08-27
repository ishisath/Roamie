import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState, RankBars, Funnel } from "../components/DashShell";
import { TrendChart } from "../components/charts";
import { comparePeriods, bookingFunnel, cancellationRate, avgBookingValue,
         occupancyRate } from "../lib/analytics";
import SuggestionForm from "../components/SuggestionForm";
import BidBoard from "../components/BidBoard";
import ImageUpload from "../components/ImageUpload";
import { bookingsApi, paymentsApi, availabilityApi, vehiclesApi, aiApi } from "../api/endpoints";
import ItineraryPreview from "../components/ItineraryPreview";

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
    const [plans, setPlans] = useState({});

  useEffect(() => {
    bookings.forEach((b) => {
      if (b.trip_plan_id && !plans[b.id]) {
        aiApi.planForBooking(b.id)
          .then((r) => r.data && setPlans((prev) => ({ ...prev, [b.id]: r.data })))
          .catch(() => {});
      }
    });
  }, [bookings]);

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
      setError(err.response?.data?.detail || "Couldn't add the vehicle. Check the registration number isn't already used.");
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
      setError(err.response?.data?.detail || "Couldn't update the trip status.");
    }
  };

  const toggleDate = async (d, current) => {
    const next = current === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
    await availabilityApi.set([d], next);
    availabilityApi.mine().then((r) => setAvailability(r.data));
  };

  const myItems = (b) =>
    b.items.filter((i) => i.provider_id === user?.id && i.service_type === "DRIVER");

  const field =
    "mt-1.5 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  // ----- derived analytics -----
  const monthly = earnings?.monthly?.map((m) => ({
    month: new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short" }),
    amount: m.amount,
  })) || [];

  const period = comparePeriods(monthly);
  const funnel = bookingFunnel(bookings);
  const cancelRate = cancellationRate(bookings);
  const avgValue = avgBookingValue(bookings);
  const occupancy = occupancyRate(availability);

  const passengers = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((s, b) => s + (b.num_travelers || 0), 0);

  const completedTrips = bookings.filter((b) => b.status === "COMPLETED").length;
  const upcoming = bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status));
  const live = bookings.filter((b) =>
    myItems(b).some((i) => i.trip_status && i.trip_status !== "COMPLETED" && i.trip_status !== "CONFIRMED")
  );

  // where trips sit in the status flow
  const flowSpread = FLOW.map((s) => ({
    name: FLOW_LABEL[s],
    value: bookings.reduce(
      (n, b) => n + myItems(b).filter((i) => (i.trip_status || "CONFIRMED") === s).length, 0
    ),
  })).filter((s) => s.value > 0);

  const vehicleUse = vehicles.map((v) => ({
    name: `${v.vehicle_type}${v.model ? ` · ${v.model}` : ""}`,
    value: bookings.reduce(
      (n, b) => n + myItems(b).filter((i) => i.vehicle_id === v.id).length, 0
    ),
    sub: `${v.seats} seats · ${v.is_ac ? "AC" : "Non-AC"} · ${v.reg_no}`,
  })).filter((v) => v.value > 0);

  const bookedDays = availability.filter((a) => a.status === "BOOKED").length;
  const pendingVehicles = vehicles.filter((v) => v.verification_status === "PENDING").length;

  return (
    <DashShell
      eyebrow="Driver workspace"
      title={user?.full_name ? `Hello, ${user.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle="Your trips, vehicles and earnings"
      tabs={TABS}
      tab={tab}
      setTab={setTab}
      badges={{ Trips: live.length, Vehicles: pendingVehicles }}
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---------- OVERVIEW ---------- */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Net earnings"
              prefix="LKR"
              value={Number(earnings?.total_earnings || 0)}
              delta={period.delta}
              deltaLabel={period.previous ? "vs previous month" : "First month of trading"}
              spark={monthly.map((m) => m.amount)}
            />
            <MetricCard
              label="Average per trip"
              prefix="LKR"
              value={avgValue}
              deltaLabel={`${completedTrips} completed trip${completedTrips === 1 ? "" : "s"}`}
            />
            <MetricCard
              label="Passengers carried"
              value={passengers}
              tone="saffron"
              deltaLabel="Across completed trips"
            />
            <MetricCard
              label="Calendar occupancy"
              value={`${occupancy}%`}
              deltaLabel={`${bookedDays} of ${availability.length} days booked`}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Revenue" sub="Net of the 10% platform fee" className="xl:col-span-2">
              {monthly.length === 0 ? (
                <p className="py-20 text-center text-sm text-ink-soft">
                  Revenue appears here once a trip is paid for.
                </p>
              ) : (
                <TrendChart data={monthly} xKey="month" yKey="amount" prefix="LKR " height={260} />
              )}
            </Panel>

            <Panel title="Trip funnel" sub="Requested through to completed">
              <Funnel stages={funnel} />
              <div className="mt-5 border-t border-sand-200 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-soft">Cancellation rate</span>
                  <span className={`font-display font-semibold ${
                    cancelRate > 15 ? "text-red-600" : ""
                  }`}>
                    {cancelRate}%
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Trips by stage" sub="Where your current work sits">
              <RankBars items={flowSpread} emptyText="No trips in progress." />
            </Panel>

            <Panel title="Vehicle utilisation" sub="Trips assigned per vehicle">
              <RankBars
                items={vehicleUse}
                emptyText="No vehicle has been assigned to a trip yet."
              />
            </Panel>

            <Panel title="At a glance">
              <dl className="space-y-4">
                {[
                  ["Active vehicles", vehicles.filter((v) => v.is_active).length],
                  ["Awaiting verification", pendingVehicles],
                  ["Upcoming trips", upcoming.length],
                  ["In progress", live.length],
                  ["Awaiting payment", `LKR ${Number(earnings?.pending_payments || 0).toLocaleString()}`],
                  ["Platform fees paid", `LKR ${Number(earnings?.platform_commission || 0).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-b border-sand-100 pb-3 last:border-0 last:pb-0">
                    <dt className="text-sm text-ink-soft">{k}</dt>
                    <dd className="font-display font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </div>
      )}

      {/* ---------- TRIPS ---------- */}
      {tab === "Trips" && (
        bookings.length === 0 ? (
          <EmptyState
            title="No trips yet"
            body="Trips appear here when a traveller books you directly or accepts your bid."
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((b) =>
              myItems(b).map((item) => {
                const current = item.trip_status || "CONFIRMED";
                const idx = FLOW.indexOf(current);
                const next = FLOW[idx + 1];
                const liveTrip = b.status === "CONFIRMED" || b.status === "ACTIVE";

                return (
                  <Panel key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-sm text-ink-soft">{b.reference}</p>
                        <p className="mt-1 font-display text-lg font-semibold">
                          {new Date(b.start_date).toLocaleDateString("en-GB", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                          {b.start_time && ` · ${b.start_time.slice(0, 5)}`}
                        </p>
                        <p className="text-sm text-ink-soft">
                          {b.num_travelers} passenger{b.num_travelers > 1 ? "s" : ""}
                        </p>
                        <div className="mt-3 space-y-1 text-sm">
                          {b.pickup_location && (
                            <p><span className="text-ink-soft">Pickup — </span>{b.pickup_location}</p>
                          )}
                                                    {b.dropoff_location && (
                            <p><span className="text-ink-soft">Drop-off — </span>{b.dropoff_location}</p>
                          )}
                        </div>

                        {plans[b.id] && (
                          <details className="mt-4 overflow-hidden rounded-xl border border-brand-200 bg-brand-50">
                            <summary className="cursor-pointer px-4 py-3">
                              <span className="eyebrow text-brand-700">
                                Traveller's itinerary
                              </span>
                              <span className="ml-2 font-display text-sm font-semibold">
                                {plans[b.id].title}
                              </span>
                              <span className="ml-2 text-xs text-ink-soft">
                                · {plans[b.id].items.length} stops
                              </span>
                            </summary>
                            <div className="border-t border-brand-200/60 bg-white p-5">
                              <ItineraryPreview plan={plans[b.id]} />
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="text-right">
                        <Pill tone={b.status === "CONFIRMED" ? "brand"
                                  : b.status === "CANCELLED" ? "danger" : "saffron"}>
                          {b.status}
                        </Pill>
                        <p className="mt-2 font-display text-xl font-bold text-brand-600">
                          LKR {Number(item.provider_net).toLocaleString()}
                        </p>
                        <Link to={`/messages/${b.id}`}
                              className="mt-1 block text-sm text-brand-600 hover:underline">
                          Message traveller
                        </Link>
                      </div>
                    </div>

                    {/* the rail — genuine sequence */}
                    <div className="mt-6 border-t border-sand-200 pt-5">
                      <div className="flex items-center">
                        {FLOW.map((s, i) => (
                          <div key={s} className="flex flex-1 items-center last:flex-none">
                            <div className="flex flex-col items-center">
                              <span className={`h-3 w-3 rounded-full ring-4 ${
                                i < idx ? "bg-brand-600 ring-brand-50"
                                : i === idx ? "bg-saffron-500 ring-saffron-100"
                                : "bg-sand-300 ring-transparent"
                              }`} />
                              <span className={`mt-2 whitespace-nowrap text-[11px] ${
                                i <= idx ? "font-medium text-ink" : "text-ink-soft/60"
                              }`}>
                                {FLOW_LABEL[s]}
                              </span>
                            </div>
                            {i < FLOW.length - 1 && (
                              <span className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${
                                i < idx ? "bg-brand-600" : "bg-sand-200"
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>

                      {next && liveTrip ? (
                        <button
                          onClick={() => advance(item)}
                          className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                        >
                          Mark as {FLOW_LABEL[next].toLowerCase()}
                        </button>
                      ) : !next ? (
                        <p className="mt-4 text-sm text-brand-600">Trip completed.</p>
                      ) : null}
                    </div>
                  </Panel>
                );
              })
            )}
          </div>
        )
      )}

      {/* ---------- REQUESTS ---------- */}
      {tab === "Requests" && <BidBoard />}

      {/* ---------- VEHICLES ---------- */}
      {tab === "Vehicles" && (
        <Panel
          title="My vehicles"
          sub="An admin verifies each vehicle before travellers can book it"
          action={
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? "Cancel" : "Add vehicle"}
            </button>
          }
        >
          {showForm && (
            <form onSubmit={addVehicle} className="mb-6 rounded-xl bg-sand-50 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="eyebrow text-ink-soft">Vehicle type</label>
                  <input name="vehicle_type" required value={form.vehicle_type}
                         onChange={change} placeholder="Van, Car, SUV" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Model</label>
                  <input name="model" value={form.model} onChange={change}
                         placeholder="Toyota KDH" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Registration</label>
                  <input name="reg_no" required value={form.reg_no} onChange={change}
                         placeholder="WP-ABC-1234" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Seats</label>
                  <input type="number" name="seats" min={1} value={form.seats}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Luggage capacity</label>
                  <input name="luggage_capacity" value={form.luggage_capacity}
                         onChange={change} placeholder="4 large suitcases" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Facilities</label>
                  <input name="facilities" value={form.facilities} onChange={change}
                         placeholder="WiFi, Charging ports" className={field} />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="is_ac" checked={form.is_ac}
                         onChange={change} className="accent-brand-600" />
                  Air conditioned
                </label>
                <div className="sm:col-span-2">
                  <ImageUpload value={vehiclePhotos} onChange={setVehiclePhotos}
                               max={4} label="Vehicle photos" />
                </div>
              </div>

              <button className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Submit for verification
              </button>
            </form>
          )}

          {vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles registered"
              body="Add a vehicle so travellers can see what they're booking."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicles.map((v) => (
                <div key={v.id} className="overflow-hidden rounded-xl border border-sand-200">
                  {v.photos?.length > 0 && (
                    <div className="flex gap-0.5 overflow-x-auto">
                      {v.photos.map((url) => (
                        <img key={url} src={url} alt=""
                             className="h-32 w-44 shrink-0 object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-semibold">
                          {v.vehicle_type}{v.model && ` · ${v.model}`}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-soft">
                          {v.reg_no} · {v.seats} seats · {v.is_ac ? "AC" : "Non-AC"}
                        </p>
                      </div>
                      <Pill tone={
                        v.verification_status === "APPROVED" ? "brand"
                        : v.verification_status === "REJECTED" ? "danger" : "saffron"
                      }>
                        {v.verification_status}
                      </Pill>
                    </div>

                    {v.facilities?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {v.facilities.map((f) => (
                          <span key={f} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs text-ink-soft">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => vehiclesApi.deactivate(v.id).then(loadAll)}
                      className="mt-4 text-xs text-ink-soft hover:text-red-600"
                    >
                      Remove vehicle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ---------- AVAILABILITY ---------- */}
      {tab === "Availability" && (
        <Panel
          title="Your calendar"
          sub="Click a date to switch it between available and unavailable. Booked dates are locked."
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
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
                      ? "border-sand-200 bg-white hover:border-brand-500"
                      : "border-sand-200 bg-sand-100 text-ink-soft/50 line-through"
                  }`}
                >
                  <span className="block font-display text-base font-bold">
                    {new Date(a.date).getDate()}
                  </span>
                  <span className="block text-[10px]">
                    {new Date(a.date).toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                  <span className="mt-1 block text-[9px] uppercase tracking-wide">
                    {booked ? "Booked" : free ? "Free" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ---------- SUGGEST ---------- */}
      {tab === "Suggest" && <SuggestionForm />}
    </DashShell>
  );
}