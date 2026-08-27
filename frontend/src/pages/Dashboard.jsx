import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { bookingsApi, notificationsApi, budgetApi, reviewsApi,
         aiApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState,
         FactList } from "../components/DashShell";

const TABS = ["Trips", "Activity"];

const JOURNEY = ["Requested", "Paid", "Confirmed", "Travelling", "Completed"];

function journeyIndex(b) {
  if (b.status === "CANCELLED") return -1;
  if (b.status === "COMPLETED") return 4;
  if (b.status === "ACTIVE") return 3;
  if (b.status === "CONFIRMED") return 2;
  if (b.payment_status === "SUCCESS") return 1;
  return 0;
}

const STATUS_TONE = {
  PENDING: "saffron",
  CONFIRMED: "brand",
  ACTIVE: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

function JourneyRail({ booking }) {
  const idx = journeyIndex(booking);
  if (idx === -1) return null;

  return (
    <div className="flex items-center">
      {JOURNEY.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <span className={`h-2 w-2 shrink-0 rounded-full ${
            i < idx ? "bg-brand-400" : i === idx ? "bg-saffron-500" : "bg-white/15"
          }`} />
          {i < JOURNEY.length - 1 && (
            <span className={`mx-1.5 h-0.5 flex-1 rounded-full ${
              i < idx ? "bg-brand-500" : "bg-white/10"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Ring({ percent, status, size = 132 }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, percent));
  const colour = status === "OVER" ? "#E05C48"
    : status === "CRITICAL" ? "#D98B68"
    : status === "WARNING" ? "#F0B44A" : "#9CC4B2";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={colour} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - (pct / 100) * c}
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold leading-none text-white">
          {Math.round(percent)}%
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
          used
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Trips");
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [plans, setPlans] = useState([]);
  const [destMap, setDestMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "TRAVELER") return;

    Promise.all([
      bookingsApi.list().catch(() => ({ data: [] })),
      notificationsApi.list({ limit: 12 }).catch(() => ({ data: [] })),
      budgetApi.list().catch(() => ({ data: [] })),
      reviewsApi.pending().catch(() => ({ data: [] })),
      aiApi.plans().catch(() => ({ data: [] })),
      destinationsApi.search({ size: 50 }).catch(() => ({ data: { items: [] } })),
    ])
      .then(([b, n, bg, r, p, d]) => {
        setBookings(b.data);
        setNotifications(n.data);
        setBudgets(bg.data);
        setPendingReviews(r.data);
        setPlans(p.data);
        const map = {};
        (d.data.items || []).forEach((x) => { map[x.id] = x; });
        setDestMap(map);
        if (bg.data[0]) {
          budgetApi.summary(bg.data[0].id)
            .then((s) => setBudgetSummary(s.data)).catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role === "GUIDE") return <Navigate to="/guide" replace />;
  if (user?.role === "DRIVER") return <Navigate to="/driver" replace />;
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;

  const active = bookings
    .filter((b) => ["PENDING", "CONFIRMED", "ACTIVE"].includes(b.status))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const next = active[0];
  const nextDest = next?.destination_id ? destMap[next.destination_id] : null;
  const daysAway = next
    ? Math.ceil((new Date(next.start_date) - new Date()) / 86400000) : null;

  const totalSpent = bookings
    .filter((b) => b.payment_status === "SUCCESS")
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const paidCount = bookings.filter((b) => b.payment_status === "SUCCESS").length;
  const unpaid = bookings.filter(
    (b) => b.payment_status !== "SUCCESS" && b.status !== "CANCELLED"
  );

  const visited = bookings
    .filter((b) => b.status === "COMPLETED" && b.destination_id)
    .map((b) => destMap[b.destination_id])
    .filter(Boolean)
    .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);

  const groups = {
    Upcoming: bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status)),
    "On the road": bookings.filter((b) => b.status === "ACTIVE"),
    Past: bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status)),
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <DashShell
      eyebrow={daysAway > 0
        ? `${daysAway} day${daysAway === 1 ? "" : "s"} until your next trip`
        : "Your travel"}
      title={user?.full_name ? `Hello, ${user.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle={next
        ? `${nextDest?.name || next.booking_type.replace("_", " + ")} · ${
            new Date(next.start_date).toLocaleDateString("en-GB", {
              day: "numeric", month: "long" })}`
        : "Nothing booked yet"}
      tabs={TABS}
      tab={tab}
      setTab={setTab}
      badges={{ Activity: unread }}
      backdrop={nextDest?.photos?.[0]?.url}
      right={
        <div className="flex flex-wrap gap-2">
          <Link to="/plan"
                className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
            Plan a trip
          </Link>
          <Link to="/requests"
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
            Post a request
          </Link>
        </div>
      }
    >
      {tab === "Trips" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total spent" prefix="LKR" value={totalSpent} tone="saffron"
                        deltaLabel={`${paidCount} paid booking${paidCount === 1 ? "" : "s"}`} />
            <MetricCard label="Trips booked" value={bookings.length} />
            <MetricCard label="Awaiting payment" value={unpaid.length}
                        deltaLabel={unpaid.length ? "Pay to confirm your provider" : "All settled"} />
            <MetricCard label="Reviews to write" value={pendingReviews.length}
                        deltaLabel={pendingReviews.length ? "Providers are waiting" : "Nothing pending"} />
          </div>

          {/* budget + passport */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel
              title="Spending"
              sub={budgetSummary ? budgetSummary.title : "No budget set"}
              action={
                <Link to="/budget" className="text-sm text-saffron-400 hover:underline">
                  {budgetSummary ? "Manage" : "Set one"} →
                </Link>
              }
            >
              {budgetSummary ? (
                <div className="flex items-center gap-6">
                  <Ring percent={budgetSummary.percent_used} status={budgetSummary.status} />
                  <div className="space-y-3">
                    <div>
                      <p className="eyebrow text-white/40">Remaining</p>
                      <p className={`font-display text-xl font-bold ${
                        budgetSummary.remaining < 0 ? "text-red-300" : "text-brand-200"
                      }`}>
                        LKR {Number(budgetSummary.remaining).toLocaleString()}
                      </p>
                    </div>
                    {budgetSummary.daily_burn && (
                      <p className="text-xs text-white/40">
                        LKR {Number(budgetSummary.daily_burn).toLocaleString()}/day ·
                        day {budgetSummary.days_elapsed} of {budgetSummary.days_total}
                      </p>
                    )}
                    {budgetSummary.message && (
                      <p className="rounded-lg bg-saffron-500/15 px-3 py-2 text-xs text-saffron-400">
                        {budgetSummary.message}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-white/40">
                  Set a budget and Roamie will warn you before you overspend.
                </p>
              )}
            </Panel>

            <Panel title="Places visited" sub="Completed trips" className="lg:col-span-2">
              {visited.length === 0 ? (
                <p className="py-12 text-center text-sm text-white/40">
                  Your first stamp lands here once a trip is completed.
                </p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {visited.map((d) => (
                    <Link key={d.id} to={`/destinations/${d.slug}`} className="group text-center">
                      <span className="relative block h-20 w-20 overflow-hidden rounded-full border-2 border-saffron-500/50 grayscale transition group-hover:border-saffron-400 group-hover:grayscale-0">
                        {d.photos?.[0] && (
                          <img src={d.photos[0].url} alt=""
                               className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="mt-2 block max-w-20 truncate text-xs font-medium text-white/70">
                        {d.name}
                      </span>
                    </Link>
                  ))}
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-white/12 text-2xl text-white/20">
                    +
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-white/8 pt-5">
                <FactList items={[
                  ["Trips completed", groups.Past.filter((b) => b.status === "COMPLETED").length],
                  ["Total spent", `LKR ${totalSpent.toLocaleString()}`],
                  ["Itineraries planned", plans.length],
                ]} />
              </div>
            </Panel>
          </div>

          {/* bookings */}
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-800/70" />
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No trips yet"
              body="Browse packages, pick a guide, or let the AI planner draft an itinerary for you."
              action={
                <Link to="/packages"
                      className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
                  Browse packages
                </Link>
              }
            />
          ) : (
            Object.entries(groups).map(([label, list]) =>
              list.length === 0 ? null : (
                <section key={label}>
                  <h2 className="mb-3 font-display text-lg font-semibold text-white">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {list.map((b) => (
                      <Link
                        key={b.id}
                        to={`/bookings/${b.id}`}
                        className="block rounded-2xl border border-white/8 bg-slate-800/70 p-5 backdrop-blur transition hover:border-white/20 hover:bg-slate-800"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-white/40">{b.reference}</p>
                            <p className="mt-1 font-display text-lg font-semibold text-white">
                              {destMap[b.destination_id]?.name ||
                                `${b.booking_type.replace("_", " + ")} booking`}
                            </p>
                            <p className="text-sm text-white/50">
                              {new Date(b.start_date).toLocaleDateString("en-GB", {
                                day: "numeric", month: "long", year: "numeric",
                              })}
                              {` · ${b.num_travelers} traveller${b.num_travelers > 1 ? "s" : ""}`}
                            </p>
                            <div className="mt-3 max-w-xs">
                              <JourneyRail booking={b} />
                            </div>
                          </div>
                          <div className="text-right">
                            <Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>
                            <p className="mt-2 font-display text-xl font-bold text-saffron-400">
                              LKR {Number(b.total_amount).toLocaleString()}
                            </p>
                            {b.payment_status !== "SUCCESS" && b.status !== "CANCELLED" && (
                              <p className="mt-0.5 text-xs text-saffron-400">Payment due</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            )
          )}
        </div>
      )}

      {tab === "Activity" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Recent activity" className="lg:col-span-2">
            {notifications.length === 0 ? (
              <p className="py-12 text-center text-sm text-white/40">
                Booking updates and messages appear here.
              </p>
            ) : (
              <ul className="divide-y divide-white/8">
                {notifications.map((n) => (
                  <li key={n.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.is_read ? "bg-white/20" : "bg-saffron-500"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={n.is_read ? "text-sm text-white/55" : "text-sm font-medium text-white"}>
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-xs text-white/40">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-white/35">
                      {new Date(n.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Do next">
            <div className="space-y-2">
              {[
                pendingReviews.length > 0 &&
                  ["/reviews", `Write ${pendingReviews.length} review${pendingReviews.length > 1 ? "s" : ""}`, true],
                ["/packages", "Browse packages"],
                ["/guides", "Find a guide"],
                ["/drivers", "Find a driver"],
                ["/requests", "Post a trip request"],
                ["/plan", "Plan with AI"],
                ["/budget", "Track my budget"],
                ["/plans", "My itineraries"],
                ["/messages", "Messages"],
              ].filter(Boolean).map(([to, label, urgent]) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition ${
                    urgent
                      ? "border-saffron-500/40 bg-saffron-500/15 font-medium text-saffron-400 hover:bg-saffron-500/25"
                      : "border-white/8 text-white/75 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  {label}
                  <span className="opacity-40">→</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </DashShell>
  );
}