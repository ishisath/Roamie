import { useEffect, useState } from "react";
import { adminApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const TABS = ["Overview", "Verifications", "Suggestions", "Users",
              "Destinations", "Bookings", "Payments"];

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-sand-300 bg-white p-4">
      <p className="text-xs text-ink/55">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent || ""}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [guides, setGuides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [note, setNote] = useState({});
  const [userFilter, setUserFilter] = useState("");

  const load = () => {
    adminApi.analytics().then((r) => setStats(r.data)).catch(() => {});
    adminApi.pendingGuides().then((r) => setGuides(r.data)).catch(() => {});
    adminApi.pendingDrivers().then((r) => setDrivers(r.data)).catch(() => {});
    adminApi.pendingVehicles().then((r) => setVehicles(r.data)).catch(() => {});
    adminApi.suggestions("PENDING").then((r) => setSuggestions(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab === "Users")
      adminApi.users({ role: userFilter || undefined })
        .then((r) => setUsers(r.data)).catch(() => {});
    if (tab === "Destinations")
      destinationsApi.search({ size: 50 })
        .then((r) => setDestinations(r.data.items)).catch(() => {});
    if (tab === "Bookings")
      adminApi.bookings().then((r) => setBookings(r.data)).catch(() => {});
    if (tab === "Payments")
      adminApi.payments().then((r) => setPayments(r.data)).catch(() => {});
  }, [tab, userFilter]);

  const act = async (fn, id, action) => {
    await fn(id, action, note[id] || null);
    setNote({ ...note, [id]: "" });
    load();
  };

  const toggleFlag = async (d, key) => {
    await adminApi.setFlags(d.id, { [key]: !d[key] });
    destinationsApi.search({ size: 50 }).then((r) => setDestinations(r.data.items));
  };

  const noteBox = (id) => (
    <input
      value={note[id] || ""}
      onChange={(e) => setNote({ ...note, [id]: e.target.value })}
      placeholder="Note (optional)"
      className="mt-2 w-full rounded-lg border border-sand-300 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
    />
  );

  const pill = (text, tone = "sand") => {
    const tones = {
      sand: "bg-sand-100 text-ink/70",
      green: "bg-brand-50 text-brand-700",
      amber: "bg-amber-50 text-amber-700",
      red: "bg-red-50 text-red-700",
    };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{text}</span>;
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-1 text-ink/60">{user?.full_name}</p>

        <div className="mt-6 flex flex-wrap gap-1 border-b border-sand-300">
          {TABS.map((t) => {
            const badge =
              t === "Verifications"
                ? guides.length + drivers.length + vehicles.length
                : t === "Suggestions"
                ? suggestions.length
                : 0;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                  tab === t
                    ? "border-b-2 border-brand-600 text-brand-600"
                    : "text-ink/55 hover:text-ink"
                }`}
              >
                {t}
                {badge > 0 && (
                  <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Overview */}
        {tab === "Overview" && stats && (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Travellers" value={stats.travelers} />
              <Stat label="Guides" value={stats.guides} />
              <Stat label="Drivers" value={stats.drivers} />
              <Stat label="Destinations" value={stats.destinations} />
              <Stat label="Packages" value={stats.packages} />
              <Stat label="Bookings" value={stats.bookings} />
              <Stat label="Completed" value={stats.completed_bookings} />
              <Stat label="Cancelled" value={stats.cancelled_bookings} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-sand-300 bg-white p-5">
                <p className="text-xs text-ink/55">Total revenue</p>
                <p className="mt-1 text-3xl font-semibold text-brand-600">
                  LKR {Number(stats.revenue).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-ink/60">
                  Platform commission: LKR {Number(stats.commission).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-sand-300 bg-white p-5">
                <p className="font-semibold">Needs attention</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex justify-between">
                    <span className="text-ink/60">Guide verifications</span>
                    <span className="font-medium">{stats.pending_guides}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink/60">Driver verifications</span>
                    <span className="font-medium">{stats.pending_drivers}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink/60">Vehicle verifications</span>
                    <span className="font-medium">{stats.pending_vehicles}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink/60">Destination suggestions</span>
                    <span className="font-medium">{stats.pending_suggestions}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink/60">Open reports</span>
                    <span className="font-medium">{stats.open_reports}</span>
                  </li>
                </ul>
              </div>
            </div>

            {stats.popular_destinations?.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-sand-300 bg-white p-5">
                  <h3 className="font-semibold">Most searched destinations</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {stats.popular_destinations.map((d) => (
                      <li key={d.name} className="flex justify-between">
                        <span>{d.name}</span>
                        <span className="text-ink/55">{d.searches} searches</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-sand-300 bg-white p-5">
                  <h3 className="font-semibold">Top packages</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {stats.popular_packages.map((p) => (
                      <li key={p.title} className="flex justify-between gap-3">
                        <span className="truncate">{p.title}</span>
                        <span className="shrink-0 text-ink/55">
                          {p.bookings} · ★{p.rating.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verifications */}
        {tab === "Verifications" && (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-lg font-semibold">Guides</h2>
              {guides.length === 0 ? (
                <p className="mt-3 text-sm text-ink/55">Nothing pending.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {guides.map((g) => (
                    <div key={g.profile_id} className="rounded-xl border border-sand-300 bg-white p-5">
                      <p className="font-medium">{g.full_name}</p>
                      <p className="text-sm text-ink/60">{g.email} · {g.phone}</p>
                      <p className="mt-2 text-sm">{g.bio}</p>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p><span className="text-ink/55">Experience:</span> {g.years_experience} years</p>
                        <p><span className="text-ink/55">Languages:</span> {g.languages?.join(", ")}</p>
                        <p><span className="text-ink/55">Specialisations:</span> {g.specializations?.join(", ")}</p>
                        <p><span className="text-ink/55">Qualifications:</span> {g.qualifications}</p>
                      </div>
                      {noteBox(g.profile_id)}
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "APPROVE")}
                                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "REQUEST_CHANGES")}
                                className="rounded-lg border border-sand-300 px-4 py-1.5 text-sm hover:bg-sand-100">
                          Request changes
                        </button>
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "REJECT")}
                                className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold">Drivers</h2>
              {drivers.length === 0 ? (
                <p className="mt-3 text-sm text-ink/55">Nothing pending.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {drivers.map((d) => (
                    <div key={d.profile_id} className="rounded-xl border border-sand-300 bg-white p-5">
                      <p className="font-medium">{d.full_name}</p>
                      <p className="text-sm text-ink/60">{d.email} · {d.phone}</p>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p><span className="text-ink/55">Experience:</span> {d.years_experience} years</p>
                        <p><span className="text-ink/55">Licence:</span> {d.license_no}</p>
                        <p><span className="text-ink/55">Languages:</span> {d.languages?.join(", ")}</p>
                      </div>
                      {noteBox(d.profile_id)}
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => act(adminApi.verifyDriver, d.profile_id, "APPROVE")}
                                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyDriver, d.profile_id, "REJECT")}
                                className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold">Vehicles</h2>
              {vehicles.length === 0 ? (
                <p className="mt-3 text-sm text-ink/55">Nothing pending.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {vehicles.map((v) => (
                    <div key={v.id} className="rounded-xl border border-sand-300 bg-white p-5">
                      <p className="font-medium">
                        {v.vehicle_type} {v.model && `· ${v.model}`}
                      </p>
                      <p className="text-sm text-ink/60">
                        {v.driver_name} · {v.reg_no} · {v.seats} seats ·{" "}
                        {v.is_ac ? "AC" : "Non-AC"}
                      </p>
                      {noteBox(v.id)}
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => act(adminApi.verifyVehicle, v.id, "APPROVE")}
                                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyVehicle, v.id, "REJECT")}
                                className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Suggestions */}
        {tab === "Suggestions" && (
          <div className="mt-8 space-y-3">
            {suggestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sand-300 p-10 text-center text-ink/55">
                No pending destination suggestions.
              </p>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="rounded-xl border border-sand-300 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name || "Update suggestion"}</p>
                        {pill(s.kind, s.kind === "NEW" ? "green" : "amber")}
                      </div>
                      <p className="text-sm text-ink/60">
                        {s.region} · submitted by {s.submitter_name}
                      </p>
                    </div>
                  </div>
                  {s.description && <p className="mt-3 text-sm">{s.description}</p>}
                  {s.why_popular && (
                    <p className="mt-2 text-sm">
                      <span className="text-ink/55">Why it's popular:</span> {s.why_popular}
                    </p>
                  )}
                  {s.activities?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.activities.map((a) => (
                        <span key={a} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs">{a}</span>
                      ))}
                    </div>
                  )}
                  {noteBox(s.id)}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => act(adminApi.reviewSuggestion, s.id, "APPROVE")}
                            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700">
                      Approve &amp; publish
                    </button>
                    <button onClick={() => act(adminApi.reviewSuggestion, s.id, "REJECT")}
                            className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50">
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users */}
        {tab === "Users" && (
          <div className="mt-8">
            <div className="flex gap-2">
              {["", "TRAVELER", "GUIDE", "DRIVER"].map((r) => (
                <button
                  key={r || "all"}
                  onClick={() => setUserFilter(r)}
                  className={`rounded-full px-4 py-1.5 text-sm ${
                    userFilter === r ? "bg-brand-600 text-white" : "border border-sand-300 bg-white"
                  }`}
                >
                  {r || "All"}
                </button>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-sand-300 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-sand-300 text-left text-xs text-ink/55">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-300">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3 font-medium">{u.full_name}</td>
                      <td className="p-3 text-ink/70">{u.email}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">
                        {u.verification_status
                          ? pill(u.verification_status,
                                 u.verification_status === "APPROVED" ? "green" : "amber")
                          : "—"}
                      </td>
                      <td className="p-3">
                        {u.is_active ? pill("Active", "green") : pill("Suspended", "red")}
                      </td>
                      <td className="p-3 text-right">
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() =>
                              adminApi.setUserStatus(u.id, !u.is_active, null)
                                .then(() => adminApi.users({ role: userFilter || undefined })
                                  .then((r) => setUsers(r.data)))
                            }
                            className="rounded-lg border border-sand-300 px-3 py-1 text-xs hover:bg-sand-100"
                          >
                            {u.is_active ? "Suspend" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Destinations */}
        {tab === "Destinations" && (
          <div className="mt-8 space-y-3">
            {destinations.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-sand-300 bg-white p-4">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm text-ink/60">{d.region}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFlag(d, "is_featured")}
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      d.is_featured ? "bg-brand-600 text-white" : "border border-sand-300"
                    }`}
                  >
                    Featured
                  </button>
                  <button
                    onClick={() => toggleFlag(d, "is_trending")}
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      d.is_trending ? "bg-brand-600 text-white" : "border border-sand-300"
                    }`}
                  >
                    Trending
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bookings */}
        {tab === "Bookings" && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-sand-300 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-sand-300 text-left text-xs text-ink/55">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Traveller</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-300">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 font-mono text-xs">{b.reference}</td>
                    <td className="p-3">{b.traveler}</td>
                    <td className="p-3">{b.booking_type}</td>
                    <td className="p-3">
                      {new Date(b.start_date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3">{b.currency} {b.total_amount.toLocaleString()}</td>
                    <td className="p-3">{pill(b.status)}</td>
                    <td className="p-3">
                      {pill(b.payment_status, b.payment_status === "SUCCESS" ? "green" : "amber")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments */}
        {tab === "Payments" && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-sand-300 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-sand-300 text-left text-xs text-ink/55">
                <tr>
                  <th className="p-3">Transaction</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-300">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-xs">{p.transaction_id || "—"}</td>
                    <td className="p-3">{p.currency} {p.amount.toLocaleString()}</td>
                    <td className="p-3">{p.commission.toLocaleString()}</td>
                    <td className="p-3">{p.provider}</td>
                    <td className="p-3">
                      {pill(p.status, p.status === "SUCCESS" ? "green" :
                            p.status === "FAILED" ? "red" : "amber")}
                    </td>
                    <td className="p-3 text-ink/60">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}