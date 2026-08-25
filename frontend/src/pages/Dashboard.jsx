import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookingsApi, paymentsApi, notificationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";


const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-brand-50 text-brand-700",
  ACTIVE: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-sand-100 text-ink/70",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const isProvider = user?.role === "GUIDE" || user?.role === "DRIVER";

  useEffect(() => {
    const calls = [bookingsApi.list(), notificationsApi.list({ limit: 5 })];
    if (isProvider) calls.push(paymentsApi.earnings());

    Promise.all(calls.map((c) => c.catch(() => ({ data: null }))))
      .then(([b, n, e]) => {
        setBookings(b.data || []);
        setNotifications(n.data || []);
        if (e?.data) setEarnings(e.data);
      })
      .finally(() => setLoading(false));
  }, [isProvider]);

  const grouped = {
    upcoming: bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status)),
    active: bookings.filter((b) => b.status === "ACTIVE"),
    past: bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status)),
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">
          Hello, {user?.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-ink/60">
          {user?.role === "TRAVELER" ? "Your trips and bookings" : "Your bookings and earnings"}
        </p>

        {isProvider && earnings && (
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              ["Total earnings", earnings.total_earnings],
              ["Completed", earnings.completed_payments],
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

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-sand-100" />
            ) : (
              Object.entries(grouped).map(([key, list]) =>
                list.length === 0 ? null : (
                  <section key={key}>
                    <h2 className="text-lg font-semibold capitalize">{key}</h2>
                    <div className="mt-3 space-y-3">
                      {list.map((b) => (
                        <Link
                          key={b.id}
                          to={`/bookings/${b.id}`}
                          className="block rounded-xl border border-sand-300 bg-white p-4 transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {b.booking_type.replace("_", " + ")} booking
                              </p>
                              <p className="mt-0.5 text-sm text-ink/60">
                                {new Date(b.start_date).toLocaleDateString("en-GB", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}{" "}
                                · {b.num_travelers} traveler{b.num_travelers > 1 ? "s" : ""}
                              </p>
                              <p className="mt-1 font-mono text-xs text-ink/45">
                                {b.reference}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  STATUS_STYLES[b.status] || "bg-sand-100"
                                }`}
                              >
                                {b.status}
                              </span>
                              <p className="mt-2 font-semibold text-brand-600">
                                {b.currency} {Number(b.total_amount).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )
              )
            )}

            {!loading && bookings.length === 0 && (
              <div className="rounded-xl border border-dashed border-sand-300 p-12 text-center">
                <p className="text-ink/60">No bookings yet.</p>
                <Link
                  to="/packages"
                  className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Browse packages
                </Link>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-sand-300 bg-white p-5">
              <h2 className="font-semibold">Recent activity</h2>
              {notifications.length === 0 ? (
                <p className="mt-3 text-sm text-ink/55">Nothing yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {notifications.map((n) => (
                    <li key={n.id} className="text-sm">
                      <p className={n.is_read ? "text-ink/70" : "font-medium"}>{n.title}</p>
                      {n.body && <p className="text-xs text-ink/55">{n.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {user?.role === "TRAVELER" && (
              <div className="rounded-xl border border-sand-300 bg-white p-5">
                <h2 className="font-semibold">Quick actions</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <Link to="/packages" className="block text-brand-600 hover:underline">
                    Browse packages
                  </Link>
                  <Link to="/destinations" className="block text-brand-600 hover:underline">
                    Explore destinations
                  </Link>
                  <Link to="/plan" className="block text-brand-600 hover:underline">
                    Plan a trip with AI
                  </Link>
                  <Link to="/budget" className="block text-brand-600 hover:underline">
  Track my budget
</Link>

<Link to="/reviews" className="block text-brand-600 hover:underline">
  Write a review
</Link>

<Link to="/requests" className="block text-brand-600 hover:underline">
  Post a trip request
</Link>

                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
