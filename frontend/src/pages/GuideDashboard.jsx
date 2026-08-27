import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState, RankBars, Funnel } from "../components/DashShell";
import { TrendChart } from "../components/charts";
import { comparePeriods, bookingFunnel, cancellationRate, avgBookingValue,
         avgLeadTime, occupancyRate } from "../lib/analytics";
import SuggestionForm from "../components/SuggestionForm";
import BidBoard from "../components/BidBoard";
import { packagesApi, bookingsApi, paymentsApi, availabilityApi, destinationsApi, aiApi } from "../api/endpoints";
import ItineraryPreview from "../components/ItineraryPreview";

const TABS = ["Overview", "Packages", "Bookings", "Requests", "Availability", "Suggest"];

const emptyPackage = {
  title: "", description: "", destination_id: "", package_type: "",
  duration_days: 1, price: "", max_travelers: 10,
  activities: "", included: "", excluded: "",
  transport_included: false, vehicle_type: "", vehicle_seats: "",
  is_ac: true, pickup_info: "", dropoff_info: "", driver_info: "",
  extra_transport_cost: 0,
};

export default function GuideDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyPackage);
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
    packagesApi.mine().then((r) => setPackages(r.data)).catch(() => {});
    bookingsApi.list().then((r) => setBookings(r.data)).catch(() => {});
    paymentsApi.earnings().then((r) => setEarnings(r.data)).catch(() => {});
    availabilityApi.mine().then((r) => setAvailability(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadAll();
    destinationsApi.search({ size: 50 })
      .then((r) => setDestinations(r.data.items)).catch(() => {});
  }, []);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const toList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const createPackage = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await packagesApi.create({
        ...form,
        duration_days: Number(form.duration_days),
        price: Number(form.price),
        max_travelers: Number(form.max_travelers),
        vehicle_seats: form.vehicle_seats ? Number(form.vehicle_seats) : null,
        extra_transport_cost: Number(form.extra_transport_cost || 0),
        activities: toList(form.activities),
        included: toList(form.included),
        excluded: toList(form.excluded),
        vehicle_type: form.transport_included ? form.vehicle_type : null,
      });
      setShowForm(false);
      setForm(emptyPackage);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't create the package. Check the price and destination.");
    }
  };

  const toggleDate = async (d, current) => {
    const next = current === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
    await availabilityApi.set([d], next);
    availabilityApi.mine().then((r) => setAvailability(r.data));
  };

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
  const leadTime = avgLeadTime(bookings);
  const occupancy = occupancyRate(availability);

  const topPackages = packages
    .map((p) => ({
      name: p.title,
      value: p.booking_count || 0,
      sub: `LKR ${Number(p.price).toLocaleString()} · ${p.duration_days}d`,
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const upcoming = bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status));
  const paidCount = bookings.filter((b) => b.payment_status === "SUCCESS").length;
  const bookedDays = availability.filter((a) => a.status === "BOOKED").length;
  const freeDays = availability.filter((a) => a.status === "AVAILABLE").length;

  return (
    <DashShell
      eyebrow="Guide workspace"
      title={user?.full_name ? `Hello, ${user.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle="Your packages, bookings and earnings"
      tabs={TABS}
      tab={tab}
      setTab={setTab}
      badges={{ Bookings: upcoming.length }}
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
              label="Average booking"
              prefix="LKR"
              value={avgValue}
              deltaLabel={`Across ${paidCount} paid booking${paidCount === 1 ? "" : "s"}`}
            />
            <MetricCard
              label="Calendar occupancy"
              value={`${occupancy}%`}
              tone="saffron"
              deltaLabel={`${bookedDays} of ${availability.length} days booked`}
            />
            <MetricCard
              label="Cancellation rate"
              value={`${cancelRate}%`}
              deltaLabel={cancelRate > 15 ? "Higher than healthy" : "Within a normal range"}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Revenue" sub="Net of the 10% platform fee" className="xl:col-span-2">
              {monthly.length === 0 ? (
                <p className="py-20 text-center text-sm text-ink-soft">
                  Revenue appears here once a booking is paid.
                </p>
              ) : (
                <TrendChart data={monthly} xKey="month" yKey="amount" prefix="LKR " height={260} />
              )}
            </Panel>

            <Panel title="Booking funnel" sub="Where travellers drop off">
              <Funnel stages={funnel} />
              <div className="mt-5 border-t border-sand-200 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-soft">Request → paid</span>
                  <span className="font-display font-semibold">
                    {funnel[0].value ? Math.round((funnel[1].value / funnel[0].value) * 100) : 0}%
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Top earning packages" sub="By total bookings" className="xl:col-span-2">
              <RankBars
                items={topPackages}
                emptyText="No package bookings yet — they'll rank here as they come in."
              />
            </Panel>

            <Panel title="At a glance">
              <dl className="space-y-4">
                {[
                  ["Active packages", packages.filter((p) => p.status !== "INACTIVE").length],
                  ["Upcoming trips", upcoming.length],
                  ["Awaiting payment", `LKR ${Number(earnings?.pending_payments || 0).toLocaleString()}`],
                  ["Platform fees paid", `LKR ${Number(earnings?.platform_commission || 0).toLocaleString()}`],
                  ["Avg. lead time", `${leadTime} days`],
                  ["Free days ahead", freeDays],
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

      {/* ---------- PACKAGES ---------- */}
      {tab === "Packages" && (
        <Panel
          title="My packages"
          sub="Transport details are shown to travellers before they book"
          action={
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? "Cancel" : "New package"}
            </button>
          }
        >
          {showForm && (
            <form onSubmit={createPackage} className="mb-6 rounded-xl bg-sand-50 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ink-soft">Title</label>
                  <input name="title" required value={form.title} onChange={change} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ink-soft">Description</label>
                  <textarea name="description" rows={3} value={form.description}
                            onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Destination</label>
                  <select name="destination_id" required value={form.destination_id}
                          onChange={change} className={field}>
                    <option value="">Choose…</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Type</label>
                  <input name="package_type" value={form.package_type} onChange={change}
                         placeholder="Cultural, Wildlife…" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Days</label>
                  <input type="number" name="duration_days" min={1} value={form.duration_days}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Price per person</label>
                  <input type="number" name="price" required value={form.price}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Max travellers</label>
                  <input type="number" name="max_travelers" min={1} value={form.max_travelers}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Activities</label>
                  <input name="activities" value={form.activities} onChange={change}
                         placeholder="Hiking, Photography" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Included</label>
                  <input name="included" value={form.included} onChange={change}
                         placeholder="Guide, Lunch" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-ink-soft">Not included</label>
                  <input name="excluded" value={form.excluded} onChange={change}
                         placeholder="Tips" className={field} />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-sand-300 bg-white p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="transport_included"
                         checked={form.transport_included} onChange={change}
                         className="accent-brand-600" />
                  Transport included — I arrange the vehicle
                </label>

                {form.transport_included && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="eyebrow text-ink-soft">Vehicle</label>
                      <input name="vehicle_type" required value={form.vehicle_type}
                             onChange={change} placeholder="Toyota KDH Van" className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-ink-soft">Seats</label>
                      <input type="number" name="vehicle_seats" value={form.vehicle_seats}
                             onChange={change} className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-ink-soft">Pickup</label>
                      <input name="pickup_info" value={form.pickup_info}
                             onChange={change} className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-ink-soft">Drop-off</label>
                      <input name="dropoff_info" value={form.dropoff_info}
                             onChange={change} className={field} />
                    </div>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" name="is_ac" checked={form.is_ac}
                             onChange={change} className="accent-brand-600" />
                      Air conditioned
                    </label>
                  </div>
                )}
              </div>

              <button className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Publish package
              </button>
            </form>
          )}

          {packages.length === 0 ? (
            <EmptyState
              title="No packages yet"
              body="Create your first package and it goes live for travellers immediately."
            />
          ) : (
            <div className="divide-y divide-sand-200">
              {packages.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link to={`/packages/${p.id}`}
                          className="font-display font-semibold hover:text-brand-600">
                      {p.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {p.duration_days}d · LKR {Number(p.price).toLocaleString()} ·{" "}
                      {p.booking_count || 0} booking{p.booking_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Pill tone={p.transport_included ? "brand" : "neutral"}>
                      {p.transport_included ? "Transport" : "No transport"}
                    </Pill>
                    <button
                      onClick={() => packagesApi.deactivate(p.id).then(loadAll)}
                      className="rounded-lg border border-sand-300 px-3 py-1.5 text-xs hover:bg-sand-100"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ---------- BOOKINGS ---------- */}
      {tab === "Bookings" && (
        bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            body="When a traveller books one of your packages it appears here."
          />
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Panel key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-ink-soft">{b.reference}</p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      {new Date(b.start_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {b.num_travelers} traveller{b.num_travelers > 1 ? "s" : ""}
                      {b.pickup_location && ` · pickup at ${b.pickup_location}`}
                    </p>
                                        {b.notes && (
                      <p className="mt-2 rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink-soft">
                        “{b.notes}”
                      </p>
                    )}

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
                      LKR {Number(b.total_amount).toLocaleString()}
                    </p>
                    <Link to={`/messages/${b.id}`}
                          className="mt-1 block text-sm text-brand-600 hover:underline">
                      Message traveller
                    </Link>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )
      )}

      {/* ---------- REQUESTS ---------- */}
      {tab === "Requests" && <BidBoard />}

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