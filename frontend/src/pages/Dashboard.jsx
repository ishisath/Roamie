import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { bookingsApi, notificationsApi, budgetApi, reviewsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState } from "../components/DashShell";
import { bookingFunnel } from "../lib/analytics";

const TABS = ["Trips", "Activity"];

const STATUS_TONE = {
  PENDING: "saffron",
  CONFIRMED: "brand",
  ACTIVE: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Trips");
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "TRAVELER") return;
    Promise.all([
      bookingsApi.list().catch(() => ({ data: [] })),
      notificationsApi.list({ limit: 12 }).catch(() => ({ data: [] })),
      budgetApi.list().catch(() => ({ data: [] })),
      reviewsApi.pending().catch(() => ({ data: [] })),
    ])
      .then(([b, n, bg, r]) => {
        setBookings(b.data);
        setNotifications(n.data);
        setBudgets(bg.data);
        setPendingReviews(r.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role === "GUIDE") return <Navigate to="/guide" replace />;
  if (user?.role === "DRIVER") return <Navigate to="/driver" replace />;
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;

  const groups = {
    Upcoming: bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status)),
    "On the road": bookings.filter((b) => b.status === "ACTIVE"),
    Past: bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status)),
  };

  const totalSpent = bookings
    .filter((b) => b.payment_status === "SUCCESS")
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const unpaid = bookings.filter(
    (b) => b.payment_status !== "SUCCESS" && b.status !== "CANCELLED"
  );

  const funnel = bookingFunnel(bookings);
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <DashShell
      eyebrow="Your travel"
      title={user?.full_name ? `Hello, ${user.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle="Trips, spending and everything in motion"
      tabs={TABS}
      tab={tab}
      setTab={setTab}
      badges={{ Activity: unread }}
      right={
        <div className="flex flex-wrap gap-2">
          <Link to="/plan"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Plan a trip
          </Link>
          <Link to="/requests"
                className="rounded-lg border border-sand-300 bg-white px-4 py-2 text-sm font-medium hover:bg-sand-100">
            Post a request
          </Link>
        </div>
      }
    >
      {tab === "Trips" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total spent" prefix="LKR" value={totalSpent}
                        deltaLabel={`${funnel[1].value} paid booking${funnel[1].value === 1 ? "" : "s"}`} />
            <MetricCard label="Trips booked" value={bookings.length} />
            <MetricCard label="Awaiting payment" tone="saffron" value={unpaid.length}
                        deltaLabel={unpaid.length ? "Pay to confirm your provider" : "All settled"} />
            <MetricCard label="Reviews to write" value={pendingReviews.length}
                        deltaLabel={pendingReviews.length ? "Providers are waiting" : "Nothing pending"} />
          </div>

          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No trips yet"
              body="Browse packages, pick a guide, or let the AI planner draft an itinerary for you."
              action={
                <Link to="/packages"
                      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                  Browse packages
                </Link>
              }
            />
          ) : (
            Object.entries(groups).map(([label, list]) =>
              list.length === 0 ? null : (
                <section key={label}>
                  <h2 className="mb-3 font-display text-lg font-semibold">{label}</h2>
                  <div className="space-y-3">
                    {list.map((b) => (
                      <Link
                        key={b.id}
                        to={`/bookings/${b.id}`}
                        className="block rounded-2xl border border-sand-200 bg-white p-5 transition hover:border-ink/15 hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-mono text-xs text-ink-soft">{b.reference}</p>
                            <p className="mt-1 font-display text-lg font-semibold">
                              {b.booking_type.replace("_", " + ")} booking
                            </p>
                            <p className="text-sm text-ink-soft">
                              {new Date(b.start_date).toLocaleDateString("en-GB", {
                                day: "numeric", month: "long", year: "numeric",
                              })}
                              {` · ${b.num_travelers} traveller${b.num_travelers > 1 ? "s" : ""}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>
                            <p className="mt-2 font-display text-xl font-bold text-brand-600">
                              LKR {Number(b.total_amount).toLocaleString()}
                            </p>
                            {b.payment_status !== "SUCCESS" && b.status !== "CANCELLED" && (
                              <p className="mt-0.5 text-xs text-saffron-600">Payment due</p>
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

          {budgets.length > 0 && (
            <Panel
              title="Budgets"
              action={
                <Link to="/budget" className="text-sm text-brand-600 hover:underline">
                  Manage →
                </Link>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {budgets.map((bg) => (
                  <Link key={bg.id} to="/budget"
                        className="rounded-xl border border-sand-200 p-4 transition hover:border-ink/15">
                    <p className="font-display font-semibold">{bg.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {bg.currency} {Number(bg.total_budget).toLocaleString()} budget
                    </p>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {tab === "Activity" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Recent activity" className="lg:col-span-2">
            {notifications.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-soft">
                Nothing yet. Booking updates and messages land here.
              </p>
            ) : (
              <ul className="divide-y divide-sand-100">
                {notifications.map((n) => (
                  <li key={n.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.is_read ? "bg-sand-300" : "bg-saffron-500"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={n.is_read ? "text-ink-soft" : "font-medium"}>{n.title}</p>
                      {n.body && <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {new Date(n.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Quick actions">
            <div className="space-y-2">
              {[
                ["/packages", "Browse packages"],
                ["/guides", "Find a guide"],
                ["/drivers", "Find a driver"],
                ["/plan", "Plan with AI"],
                ["/budget", "Track my budget"],
                ["/requests", "Post a trip request"],
                ["/reviews", "Write a review"],
                ["/messages", "Messages"],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between rounded-lg border border-sand-200 px-4 py-2.5 text-sm transition hover:border-ink/15 hover:bg-sand-50"
                >
                  {label}
                  <span className="text-ink-soft">→</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </DashShell>
  );
}