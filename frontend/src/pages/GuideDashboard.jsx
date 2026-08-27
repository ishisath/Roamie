import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { packagesApi, bookingsApi, paymentsApi, availabilityApi,
         destinationsApi, aiApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState, RankBars, Funnel,
         FactList } from "../components/DashShell";
import { TrendChart } from "../components/charts";
import { comparePeriods, bookingFunnel, cancellationRate, avgBookingValue,
         avgLeadTime, occupancyRate } from "../lib/analytics";
import SuggestionForm from "../components/SuggestionForm";
import BidBoard from "../components/BidBoard";
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

  useEffect(() => {
    bookings.forEach((b) => {
      if (b.trip_plan_id && !plans[b.id]) {
        aiApi.planForBooking(b.id)
          .then((r) => r.data && setPlans((prev) => ({ ...prev, [b.id]: r.data })))
          .catch(() => {});
      }
    });
  }, [bookings]);

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

  const respond = async (itemId, accept) => {
    setError("");
    try {
      await bookingsApi.respond(itemId, accept, null);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't record that response.");
    }
  };

  const toggleDate = async (d, current) => {
    const next = current === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
    await availabilityApi.set([d], next);
    availabilityApi.mine().then((r) => setAvailability(r.data));
  };

  const myItems = (b) => b.items.filter((i) => i.provider_id === user?.id);

  const field =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-saffron-400";

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

  const awaitingResponse = bookings.filter((b) =>
    myItems(b).some((i) => i.provider_status === "PENDING") &&
    b.payment_status === "SUCCESS" && b.status !== "CANCELLED"
  ).length;

  const backdrop = packages.find((p) => p.photos?.[0])?.photos[0].url;

  return (
    <DashShell
      eyebrow="Guide workspace"
      title={user?.full_name ? `Hello, ${user.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle="Your packages, bookings and earnings"
      tabs={TABS}
      tab={tab}
      setTab={setTab}
      badges={{ Bookings: awaitingResponse || upcoming.length }}
      backdrop={backdrop}
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ---------- OVERVIEW ---------- */}
      {tab === "Overview" && (
        <div className="space-y-5">
          {awaitingResponse > 0 && (
            <button
              onClick={() => setTab("Bookings")}
              className="flex w-full items-center justify-between rounded-2xl border border-saffron-500/30 bg-saffron-500/10 p-5 text-left transition hover:bg-saffron-500/15"
            >
              <div>
                <p className="font-display font-semibold text-white">
                  {awaitingResponse} booking{awaitingResponse > 1 ? "s" : ""} waiting on you
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Travellers have paid. Accept to lock in the dates.
                </p>
              </div>
              <span className="text-saffron-400">→</span>
            </button>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Net earnings"
              prefix="LKR"
              value={Number(earnings?.total_earnings || 0)}
              delta={period.delta}
              deltaLabel={period.previous ? "vs previous month" : "First month of trading"}
              spark={monthly.map((m) => m.amount)}
              tone="saffron"
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
                <p className="py-20 text-center text-sm text-white/40">
                  Revenue appears here once a booking is paid.
                </p>
              ) : (
                <TrendChart data={monthly} xKey="month" yKey="amount" prefix="LKR " height={260} />
              )}
            </Panel>

            <Panel title="Booking funnel" sub="Where travellers drop off">
              <Funnel stages={funnel} />
              <div className="mt-5 border-t border-white/8 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-white/55">Request → paid</span>
                  <span className="font-display font-semibold text-white">
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
              <FactList items={[
                ["Active packages", packages.filter((p) => p.status !== "INACTIVE").length],
                ["Upcoming trips", upcoming.length],
                ["Awaiting payment", `LKR ${Number(earnings?.pending_payments || 0).toLocaleString()}`],
                ["Platform fees paid", `LKR ${Number(earnings?.platform_commission || 0).toLocaleString()}`],
                ["Avg. lead time", `${leadTime} days`],
                ["Free days ahead", freeDays],
              ]} />
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
              className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400"
            >
              {showForm ? "Cancel" : "New package"}
            </button>
          }
        >
          {showForm && (
            <form onSubmit={createPackage} className="mb-6 rounded-xl border border-white/8 bg-slate-900/60 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Title</label>
                  <input name="title" required value={form.title} onChange={change} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Description</label>
                  <textarea name="description" rows={3} value={form.description}
                            onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Destination</label>
                  <select name="destination_id" required value={form.destination_id}
                          onChange={change} className={field}>
                    <option value="">Choose…</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow text-white/45">Type</label>
                  <input name="package_type" value={form.package_type} onChange={change}
                         placeholder="Cultural, Wildlife…" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Days</label>
                  <input type="number" name="duration_days" min={1} value={form.duration_days}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Price per person</label>
                  <input type="number" name="price" required value={form.price}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Max travellers</label>
                  <input type="number" name="max_travelers" min={1} value={form.max_travelers}
                         onChange={change} className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Activities</label>
                  <input name="activities" value={form.activities} onChange={change}
                         placeholder="Hiking, Photography" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Included</label>
                  <input name="included" value={form.included} onChange={change}
                         placeholder="Guide, Lunch" className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Not included</label>
                  <input name="excluded" value={form.excluded} onChange={change}
                         placeholder="Tips" className={field} />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/10 p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <input type="checkbox" name="transport_included"
                         checked={form.transport_included} onChange={change}
                         className="accent-saffron-500" />
                  Transport included — I arrange the vehicle
                </label>

                {form.transport_included && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="eyebrow text-white/45">Vehicle</label>
                      <input name="vehicle_type" required value={form.vehicle_type}
                             onChange={change} placeholder="Toyota KDH Van" className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-white/45">Seats</label>
                      <input type="number" name="vehicle_seats" value={form.vehicle_seats}
                             onChange={change} className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-white/45">Pickup</label>
                      <input name="pickup_info" value={form.pickup_info}
                             onChange={change} className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-white/45">Drop-off</label>
                      <input name="dropoff_info" value={form.dropoff_info}
                             onChange={change} className={field} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-white sm:col-span-2">
                      <input type="checkbox" name="is_ac" checked={form.is_ac}
                             onChange={change} className="accent-saffron-500" />
                      Air conditioned
                    </label>
                  </div>
                )}
              </div>

              <button className="mt-5 rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
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
            <div className="divide-y divide-white/8">
              {packages.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link to={`/packages/${p.id}`}
                          className="font-display font-semibold text-white hover:text-saffron-400">
                      {p.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-white/50">
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
                      className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
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
            {bookings.map((b) => {
              const mine = myItems(b);
              const pending = mine.some((i) => i.provider_status === "PENDING");
              const paid = b.payment_status === "SUCCESS";
              const live = b.status !== "CANCELLED";

              return (
                <Panel key={b.id}
                       className={pending && paid && live ? "ring-1 ring-saffron-500/30" : ""}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-white/45">{b.reference}</p>
                      <p className="mt-1 font-display text-lg font-semibold text-white">
                        {new Date(b.start_date).toLocaleDateString("en-GB", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-white/50">
                        {b.traveler?.full_name && `${b.traveler.full_name} · `}
                        {b.num_travelers} traveller{b.num_travelers > 1 ? "s" : ""}
                        {b.pickup_location && ` · pickup at ${b.pickup_location}`}
                      </p>

                      {b.notes && (
                        <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
                          “{b.notes}”
                        </p>
                      )}

                      {plans[b.id] && (
                        <details className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                          <summary className="cursor-pointer px-4 py-3">
                            <span className="eyebrow text-saffron-400">
                              Traveller's itinerary
                            </span>
                            <span className="ml-2 font-display text-sm font-semibold text-white">
                              {plans[b.id].title}
                            </span>
                            <span className="ml-2 text-xs text-white/40">
                              · {plans[b.id].items.length} stops
                            </span>
                          </summary>
                          <div className="border-t border-white/8 p-5">
                            <ItineraryPreview plan={plans[b.id]} dark />
                          </div>
                        </details>
                      )}

                      {/* accept / decline */}
                      {mine.map((item) =>
                        item.provider_status === "PENDING" && paid && live ? (
                          <div key={item.id}
                               className="mt-4 rounded-xl border border-saffron-500/30 bg-saffron-500/10 p-4">
                            <p className="font-display text-sm font-semibold text-white">
                              This booking needs your answer
                            </p>
                            <p className="mt-1 text-xs text-white/60">
                              The traveller has paid and your dates are on hold. Accept to
                              lock it in, or decline and they'll be refunded.
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => respond(item.id, true)}
                                className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400"
                              >
                                Accept booking
                              </button>
                              <button
                                onClick={() => respond(item.id, false)}
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-red-400/40 hover:text-red-300"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ) : item.provider_status === "PENDING" && !paid ? (
                          <p key={item.id} className="mt-3 text-xs text-white/45">
                            Waiting for the traveller to pay before you respond.
                          </p>
                        ) : (
                          <p key={item.id} className="mt-3 text-xs text-white/45">
                            You {item.provider_status.toLowerCase()} this booking.
                          </p>
                        )
                      )}
                    </div>

                    <div className="text-right">
                      <Pill tone={
                        mine[0]?.provider_status === "ACCEPTED" ? "brand"
                        : mine[0]?.provider_status === "DECLINED" ? "danger"
                        : b.status === "CANCELLED" ? "danger" : "saffron"
                      }>
                        {mine[0]?.provider_status === "PENDING" && paid
                          ? "Needs your answer"
                          : mine[0]?.provider_status || b.status}
                      </Pill>
                      <p className="mt-2 font-display text-xl font-bold text-saffron-400">
                        LKR {Number(b.total_amount).toLocaleString()}
                      </p>
                      <Link to={`/messages/${b.id}`}
                            className="mt-1 block text-sm text-white/60 hover:text-white">
                        Message traveller
                      </Link>
                    </div>
                  </div>
                </Panel>
              );
            })}
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
                      ? "cursor-not-allowed border-saffron-500/40 bg-saffron-500/15 text-saffron-400"
                      : free
                      ? "border-white/10 bg-white/5 text-white hover:border-saffron-400"
                      : "border-white/8 bg-transparent text-white/25 line-through"
                  }`}
                >
                  <span className="block font-display text-base font-bold">
                    {new Date(a.date).getDate()}
                  </span>
                  <span className="block text-[10px] opacity-70">
                    {new Date(a.date).toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                  <span className="mt-1 block text-[9px] uppercase tracking-wide opacity-60">
                    {booked ? "Booked" : free ? "Free" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ---------- SUGGEST ---------- */}
      {tab === "Suggest" && <SuggestionForm dark />}
    </DashShell>
  );
}