import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { bookingsApi, notificationsApi, budgetApi, reviewsApi,
         aiApi, destinationsApi, bidsApi, messagesApi,
         paymentsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState,
         FactList } from "../components/DashShell";

const TABS = ["Overview", "Trips", "Bids", "Money", "Activity"];

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
  PENDING: "saffron", CONFIRMED: "brand", ACTIVE: "info",
  COMPLETED: "neutral", CANCELLED: "danger",
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
                strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold leading-none text-white">
          {Math.round(percent)}%
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-widest text-white/40">used</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [destMap, setDestMap] = useState({});
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadAll = () => {
    Promise.all([
      bookingsApi.list().catch(() => ({ data: [] })),
      notificationsApi.list({ limit: 20 }).catch(() => ({ data: [] })),
      budgetApi.list().catch(() => ({ data: [] })),
      reviewsApi.pending().catch(() => ({ data: [] })),
      aiApi.plans().catch(() => ({ data: [] })),
      destinationsApi.search({ size: 50 }).catch(() => ({ data: { items: [] } })),
      bidsApi.myRequests().catch(() => ({ data: [] })),
      paymentsApi.list().catch(() => ({ data: [] })),
      messagesApi.unreadCount().catch(() => ({ data: { count: 0 } })),
    ])
      .then(([b, n, bg, r, p, d, req, pay, msg]) => {
        setBookings(b.data);
        setNotifications(n.data);
        setBudgets(bg.data);
        setPendingReviews(r.data);
        setPlans(p.data);
        setRequests(req.data);
        setPayments(pay.data);
        setUnreadMsgs(msg.data.count || 0);

        const map = {};
        (d.data.items || []).forEach((x) => { map[x.id] = x; });
        setDestMap(map);

        if (bg.data[0]) {
          budgetApi.summary(bg.data[0].id)
            .then((s) => setBudgetSummary(s.data)).catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role !== "TRAVELER") return;
    loadAll();
  }, [user]);

  if (user?.role === "GUIDE") return <Navigate to="/guide" replace />;
  if (user?.role === "DRIVER") return <Navigate to="/driver" replace />;
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;

  /* ---------- actions ---------- */

  const payNow = async (booking) => {
    setError("");
    setBusy(booking.id);
    try {
      const { data: intent } = await paymentsApi.intent(booking.id);
      await paymentsApi.confirm({
        payment_id: intent.payment_id,
        intent_id: intent.intent_id,
      });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "The payment didn't go through.");
    } finally {
      setBusy("");
    }
  };

  const acceptBid = async (bidId) => {
    setError("");
    setBusy(bidId);
    try {
      const { data } = await bidsApi.acceptBid(bidId);
      loadAll();
      navigate(`/bookings/${data.booking_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't accept that bid.");
    } finally {
      setBusy("");
    }
  };

  const closeRequest = async (id) => {
    await bidsApi.closeRequest(id);
    loadAll();
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    loadAll();
  };

  /* ---------- derived ---------- */

  const active = bookings
    .filter((b) => ["PENDING", "CONFIRMED", "ACTIVE"].includes(b.status))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const next = active[0];
  const nextDest = next?.destination_id ? destMap[next.destination_id] : null;
  const daysAway = next
    ? Math.ceil((new Date(next.start_date) - new Date()) / 86400000) : null;

  const unpaid = bookings.filter(
    (b) => b.payment_status !== "SUCCESS" && b.status !== "CANCELLED"
  );

  const awaitingProvider = bookings.filter((b) =>
    b.payment_status === "SUCCESS" &&
    b.items.some((i) => i.provider_status === "PENDING")
  );

  const openRequests = requests.filter((r) => r.status === "OPEN");
  const newBids = openRequests.reduce(
    (n, r) => n + r.bids.filter((b) => b.status === "PENDING").length, 0
  );

  const totalSpent = bookings
    .filter((b) => b.payment_status === "SUCCESS")
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const paidCount = bookings.filter((b) => b.payment_status === "SUCCESS").length;
  const unread = notifications.filter((n) => !n.is_read).length;

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

  /* ---------- pieces ---------- */

  const bookingCard = (b) => (
    <div key={b.id}
         className="rounded-2xl border border-white/8 bg-slate-800/70 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link to={`/bookings/${b.id}`} className="min-w-0 flex-1 group">
          <p className="font-mono text-xs text-white/40">{b.reference}</p>
          <p className="mt-1 font-display text-lg font-semibold text-white group-hover:text-saffron-400">
            {destMap[b.destination_id]?.name ||
              `${b.booking_type.replace("_", " + ")} booking`}
          </p>
          <p className="text-sm text-white/50">
            {new Date(b.start_date).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
            {` · ${b.num_travelers} traveller${b.num_travelers > 1 ? "s" : ""}`}
          </p>
          <div className="mt-3 max-w-xs"><JourneyRail booking={b} /></div>
        </Link>

        <div className="text-right">
          <Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>
          <p className="mt-2 font-display text-xl font-bold text-saffron-400">
            LKR {Number(b.total_amount).toLocaleString()}
          </p>

          {b.payment_status !== "SUCCESS" && b.status !== "CANCELLED" ? (
            <button
              onClick={() => payNow(b)}
              disabled={busy === b.id}
              className="mt-2 rounded-full bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-60"
            >
              {busy === b.id ? "Processing…" : "Pay now"}
            </button>
          ) : b.items.some((i) => i.provider_status === "PENDING") ? (
            <p className="mt-2 text-xs text-saffron-400">Awaiting provider</p>
          ) : ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status) ? (
            <Link to={`/messages/${b.id}`}
                  className="mt-2 block text-sm text-white/60 hover:text-white">
              Message
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );

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
      badges={{
        Trips: unpaid.length,
        Bids: newBids,
        Activity: unread,
      }}
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
      {error && (
        <div className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ---------- OVERVIEW ---------- */}
      {tab === "Overview" && (
        <div className="space-y-5">
          {/* things needing attention */}
          {(unpaid.length > 0 || newBids > 0 || pendingReviews.length > 0 ||
            unreadMsgs > 0) && (
            <Panel title="Needs you" sub="Nothing moves until you act on these">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  unpaid.length > 0 && {
                    label: "Payment due", count: unpaid.length,
                    hint: "Providers aren't confirmed until you pay",
                    go: () => setTab("Trips"),
                  },
                  newBids > 0 && {
                    label: "Bids to review", count: newBids,
                    hint: "Providers have quoted you",
                    go: () => setTab("Bids"),
                  },
                  pendingReviews.length > 0 && {
                    label: "Reviews to write", count: pendingReviews.length,
                    hint: "Providers are waiting",
                    go: () => navigate("/reviews"),
                  },
                  unreadMsgs > 0 && {
                    label: "Unread messages", count: unreadMsgs,
                    hint: "From your guides and drivers",
                    go: () => navigate("/messages"),
                  },
                ].filter(Boolean).map((item) => (
                  <button
                    key={item.label}
                    onClick={item.go}
                    className="rounded-xl border border-saffron-500/25 bg-saffron-500/10 p-4 text-left transition hover:bg-saffron-500/20"
                  >
                    <p className="font-display text-2xl font-bold text-saffron-400">
                      {item.count}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-white">{item.label}</p>
                    <p className="mt-0.5 text-xs text-white/45">{item.hint}</p>
                  </button>
                ))}
              </div>
            </Panel>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total spent" prefix="LKR" value={totalSpent} tone="saffron"
                        deltaLabel={`${paidCount} paid booking${paidCount === 1 ? "" : "s"}`} />
            <MetricCard label="Trips booked" value={bookings.length} />
            <MetricCard label="Open requests" value={openRequests.length}
                        deltaLabel={newBids ? `${newBids} bid${newBids > 1 ? "s" : ""} waiting` : "No bids yet"} />
            <MetricCard label="Itineraries" value={plans.length}
                        deltaLabel="Planned with AI" />
          </div>

          {next && (
            <Panel title="Your next trip"
                   action={
                     <Link to={`/bookings/${next.id}`}
                           className="text-sm text-saffron-400 hover:underline">
                       Full details →
                     </Link>
                   }>
              {bookingCard(next)}
            </Panel>
          )}

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
            </Panel>
          </div>
        </div>
      )}

      {/* ---------- TRIPS ---------- */}
      {tab === "Trips" && (
        <div className="space-y-6">
          {unpaid.length > 0 && (
            <Panel title="Payment due"
                   sub="Your provider isn't confirmed until this is settled">
              <div className="space-y-3">{unpaid.map(bookingCard)}</div>
            </Panel>
          )}

          {awaitingProvider.length > 0 && (
            <Panel title="Waiting on your provider"
                   sub="They've been notified and usually respond within a day">
              <div className="space-y-3">{awaitingProvider.map(bookingCard)}</div>
            </Panel>
          )}

          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-800/70" />
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No trips yet"
              body="Browse packages, pick a guide, or let the AI planner draft an itinerary."
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
                  <div className="space-y-3">{list.map(bookingCard)}</div>
                </section>
              )
            )
          )}
        </div>
      )}

      {/* ---------- BIDS ---------- */}
      {tab === "Bids" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              {openRequests.length} open request{openRequests.length === 1 ? "" : "s"} ·
              {" "}{newBids} bid{newBids === 1 ? "" : "s"} waiting on you
            </p>
            <Link to="/requests"
                  className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
              Post a new request
            </Link>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title="No requests posted"
              body="Say what you need and verified guides and drivers will quote you. You pick the winner."
              action={
                <Link to="/requests"
                      className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
                  Post a request
                </Link>
              }
            />
          ) : (
            requests.map((r) => (
              <Panel
                key={r.id}
                title={r.destination_name || "Flexible destination"}
                sub={`${r.kind === "BOTH" ? "Guide + driver" : r.kind.toLowerCase()} · ${
                  new Date(r.start_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric" })} · ${
                  r.num_people} people`}
                action={
                  <div className="flex items-center gap-3">
                    <Pill tone={r.status === "OPEN" ? "brand" : "neutral"}>{r.status}</Pill>
                    {r.status === "OPEN" && (
                      <button onClick={() => closeRequest(r.id)}
                              className="text-xs text-white/45 hover:text-red-300">
                        Close
                      </button>
                    )}
                  </div>
                }
              >
                {r.tourist_requirements && (
                  <p className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">
                    “{r.tourist_requirements}”
                  </p>
                )}

                {r.bids.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/40">
                    No bids yet. Providers usually respond within a day.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {r.bids
                      .slice()
                      .sort((a, b) => Number(a.price) - Number(b.price))
                      .map((b) => (
                        <div key={b.id}
                             className={`rounded-xl border p-4 ${
                               b.status === "ACCEPTED"
                                 ? "border-brand-400/30 bg-brand-500/10"
                                 : b.status === "REJECTED"
                                 ? "border-white/8 opacity-50"
                                 : "border-white/10 bg-white/5"
                             }`}>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link to={`/providers/${b.provider_id}`}
                                      className="font-display font-semibold text-white hover:text-saffron-400">
                                  {b.provider_name}
                                </Link>
                                <Pill tone="neutral">{b.provider_role}</Pill>
                              </div>
                              <p className="mt-1 text-xs text-white/50">
                                {b.provider_rating > 0 &&
                                  `★ ${Number(b.provider_rating).toFixed(1)} · `}
                                {b.provider_experience} years experience
                                {b.vehicle_summary && ` · ${b.vehicle_summary}`}
                              </p>
                              {b.notes && (
                                <p className="mt-2 text-sm text-white/70">{b.notes}</p>
                              )}
                              {b.included_services?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {b.included_services.map((s) => (
                                    <span key={s}
                                          className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="font-display text-2xl font-bold text-saffron-400">
                                LKR {Number(b.price).toLocaleString()}
                              </p>
                              {r.status === "OPEN" && b.status === "PENDING" ? (
                                <button
                                  onClick={() => acceptBid(b.id)}
                                  disabled={busy === b.id}
                                  className="mt-2 rounded-full bg-saffron-500 px-5 py-2 text-sm font-medium text-night-900 transition hover:bg-saffron-400 disabled:opacity-60"
                                >
                                  {busy === b.id ? "Accepting…" : "Accept"}
                                </button>
                              ) : (
                                <Pill tone={b.status === "ACCEPTED" ? "brand" : "neutral"}>
                                  {b.status}
                                </Pill>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Panel>
            ))
          )}
        </div>
      )}

      {/* ---------- MONEY ---------- */}
      {tab === "Money" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total spent" prefix="LKR" value={totalSpent} tone="saffron" />
            <MetricCard label="Outstanding" prefix="LKR"
                        value={unpaid.reduce((s, b) => s + Number(b.total_amount || 0), 0)}
                        deltaLabel={unpaid.length ? "Pay to confirm" : "All settled"} />
            <MetricCard label="Budgets" value={budgets.length}
                        deltaLabel={budgetSummary ? budgetSummary.title : "None set"} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Budget"
                   action={
                     <Link to="/budget" className="text-sm text-saffron-400 hover:underline">
                       Manage →
                     </Link>
                   }>
              {budgetSummary ? (
                <div className="flex items-center gap-6">
                  <Ring percent={budgetSummary.percent_used} status={budgetSummary.status} />
                  <FactList items={[
                    ["Budget", `LKR ${Number(budgetSummary.total_budget).toLocaleString()}`],
                    ["Spent", `LKR ${Number(budgetSummary.total_spent).toLocaleString()}`],
                    ["Left", `LKR ${Number(budgetSummary.remaining).toLocaleString()}`],
                  ]} />
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-white/40">
                  No budget yet.
                </p>
              )}
            </Panel>

            <Panel title="Payments" sub="Everything you've paid through Roamie"
                   className="lg:col-span-2" pad={false}>
              {payments.length === 0 ? (
                <p className="py-14 text-center text-sm text-white/40">
                  No payments yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/8 bg-white/5 text-left">
                      <tr>
                        {["Amount", "Status", "Gateway", "Paid"].map((h) => (
                          <th key={h} className="px-5 py-3 eyebrow text-white/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5">
                          <td className="px-5 py-3.5 font-display font-semibold text-white">
                            {p.currency} {Number(p.amount).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <Pill tone={
                              p.status === "SUCCESS" ? "brand"
                              : p.status === "REFUNDED" ? "saffron" : "danger"
                            }>
                              {p.status}
                            </Pill>
                          </td>
                          <td className="px-5 py-3.5 text-white/55">{p.provider}</td>
                          <td className="px-5 py-3.5 text-white/55">
                            {p.paid_at
                              ? new Date(p.paid_at).toLocaleDateString("en-GB")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ---------- ACTIVITY ---------- */}
      {tab === "Activity" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel
            title="Recent activity"
            sub={unread ? `${unread} unread` : "All caught up"}
            className="lg:col-span-2"
            action={unread > 0 && (
              <button onClick={markAllRead}
                      className="text-sm text-saffron-400 hover:underline">
                Mark all read
              </button>
            )}
          >
            {notifications.length === 0 ? (
              <p className="py-12 text-center text-sm text-white/40">
                Booking updates, bids and messages appear here.
              </p>
            ) : (
              <ul className="divide-y divide-white/8">
                {notifications.map((n) => (
                  <li key={n.id}
                      className={`-mx-6 flex gap-4 px-6 py-4 first:pt-0 last:pb-0 ${
                        n.is_read ? "" : "bg-saffron-500/5"
                      }`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.is_read ? "bg-white/20" : "bg-saffron-500"
                    }`} />
                    <div className="min-w-0 flex-1">
                      {n.link ? (
                        <Link to={n.link}
                              className={`text-sm hover:text-saffron-400 ${
                                n.is_read ? "text-white/55" : "font-medium text-white"
                              }`}>
                          {n.title}
                        </Link>
                      ) : (
                        <p className={n.is_read ? "text-sm text-white/55" : "text-sm font-medium text-white"}>
                          {n.title}
                        </p>
                      )}
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
                unreadMsgs > 0 && ["/messages", `${unreadMsgs} unread message${unreadMsgs > 1 ? "s" : ""}`, true],
                ["/packages", "Browse packages"],
                ["/guides", "Find a guide"],
                ["/drivers", "Find a driver"],
                ["/plan", "Plan with AI"],
                ["/plans", "My itineraries"],
                ["/budget", "Track my budget"],
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