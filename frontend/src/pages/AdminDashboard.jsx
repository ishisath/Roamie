import { useEffect, useState } from "react";
import { adminApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState, RankBars,
         SignalCard, QueueRow } from "../components/DashShell";
import { TrendChart, ColumnChart, SplitChart, ADMIN_PALETTE } from "../components/charts";

const TABS = ["Overview", "Verifications", "Suggestions", "Users",
              "Destinations", "Bookings", "Payments"];

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
      placeholder="Add a note for the applicant (optional)"
      className="mt-3 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
    />
  );

  const queueTotal = guides.length + drivers.length + vehicles.length;

  // ----- derived -----
  const monthlyBookings = stats?.monthly_bookings?.map((m) => ({
    month: new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short" }),
    count: m.count,
  })) || [];

  const supply = stats ? [
    { name: "Travellers", value: stats.travelers },
    { name: "Guides", value: stats.guides },
    { name: "Drivers", value: stats.drivers },
  ] : [];

  const topDest = stats?.popular_destinations?.map((d) => ({
    name: d.name, value: d.searches, sub: `${d.bookings} booking${d.bookings === 1 ? "" : "s"}`,
  })) || [];

  const topPkg = stats?.popular_packages?.map((p) => ({
    name: p.title, value: p.bookings, sub: `★ ${p.rating.toFixed(1)}`,
  })).filter((p) => p.value > 0) || [];

  const completionRate = stats?.bookings
    ? Math.round((stats.completed_bookings / stats.bookings) * 100) : 0;
  const cancelRate = stats?.bookings
    ? Math.round((stats.cancelled_bookings / stats.bookings) * 100) : 0;
  const takeRate = stats?.revenue
    ? Math.round((Number(stats.commission) / Number(stats.revenue)) * 100) : 0;

  return (
    <DashShell
      eyebrow="Platform administration"
      title="Admin"
      subtitle={user?.full_name}
      tabs={TABS}
      tab={tab}
      setTab={setTab}
      badges={{ Verifications: queueTotal, Suggestions: suggestions.length }}
    >
      {/* ---------- OVERVIEW ---------- */}
      {tab === "Overview" && stats && (
        <div className="space-y-5">
          {/* revenue band */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SignalCard colour="brand" label="Gross revenue" prefix="LKR"
                        value={Number(stats.revenue)} icon="₨"
                        sub={`${stats.bookings} bookings all time`} />
            <SignalCard colour="saffron" label="Platform commission" prefix="LKR"
                        value={Number(stats.commission)} icon="%"
                        sub={`${takeRate}% take rate`} />
            <SignalCard colour="sky" label="Completion rate"
                        value={`${completionRate}%`} icon="✓"
                        sub={`${stats.completed_bookings} of ${stats.bookings} completed`} />
            <SignalCard colour="clay" label="Cancellation rate"
                        value={`${cancelRate}%`} icon="✕"
                        sub={`${stats.cancelled_bookings} cancelled`} />
          </div>

          {/* action queue — colour-coded by type */}
          {(queueTotal > 0 || stats.pending_suggestions > 0 || stats.open_reports > 0) && (
            <Panel title="Needs your attention" sub="Nothing moves until you review it">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Guide verifications", stats.pending_guides, "sky", "Verifications"],
                  ["Driver verifications", stats.pending_drivers, "plum", "Verifications"],
                  ["Vehicle checks", stats.pending_vehicles, "clay", "Verifications"],
                  ["Destination suggestions", stats.pending_suggestions, "saffron", "Suggestions"],
                ].map(([label, count, colour, goTo]) => (
                  <button
                    key={label}
                    onClick={() => setTab(goTo)}
                    disabled={!count}
                    className={`rounded-xl border p-4 text-left transition ${
                      count
                        ? "border-sand-200 bg-white hover:border-ink/20 hover:shadow-sm"
                        : "border-sand-200 bg-sand-50 opacity-50"
                    }`}
                  >
                    <span className={`inline-block h-1.5 w-8 rounded-full ${
                      colour === "sky" ? "bg-sky-500"
                      : colour === "plum" ? "bg-plum-500"
                      : colour === "clay" ? "bg-clay-500" : "bg-saffron-500"
                    }`} />
                    <p className="mt-3 font-display text-2xl font-bold">{count}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{label}</p>
                  </button>
                ))}
              </div>
            </Panel>
          )}

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Bookings over time" sub="By trip start date" className="xl:col-span-2">
              {monthlyBookings.length === 0 ? (
                <p className="py-20 text-center text-sm text-ink-soft">
                  No bookings recorded yet.
                </p>
              ) : (
                <TrendChart data={monthlyBookings} xKey="month" yKey="count" height={260} />
              )}
            </Panel>

            <Panel title="Marketplace balance" sub="Who's on the platform">
              <SplitChart data={supply} nameKey="name" valueKey="value" height={190} />
              <ul className="mt-4 space-y-2">
                {supply.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <span className="h-2.5 w-2.5 rounded-full"
                            style={{ background: ADMIN_PALETTE[i] }} />
                      {s.name}
                    </span>
                    <span className="font-display font-semibold">{s.value}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-sand-200 pt-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-soft">Travellers per provider</span>
                  <span className="font-display font-semibold">
                    {stats.guides + stats.drivers
                      ? (stats.travelers / (stats.guides + stats.drivers)).toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Most searched destinations" sub="Search interest vs bookings">
              <RankBars items={topDest} emptyText="No search activity yet." />
            </Panel>
            <Panel title="Best performing packages" sub="By bookings taken">
              <RankBars items={topPkg} emptyText="No package bookings yet." />
            </Panel>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {[
              ["Travellers", stats.travelers],
              ["Guides", stats.guides],
              ["Drivers", stats.drivers],
              ["Destinations", stats.destinations],
              ["Packages", stats.packages],
              ["Open reports", stats.open_reports],
            ].map(([label, value]) => (
              <MetricCard key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* ---------- VERIFICATIONS ---------- */}
      {tab === "Verifications" && (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-sky-500" />
              <h2 className="font-display text-lg font-semibold">Guides</h2>
              <Pill tone="info">{guides.length}</Pill>
            </div>

            {guides.length === 0 ? (
              <EmptyState title="Queue clear" body="No guide applications waiting." />
            ) : (
              <div className="space-y-3">
                {guides.map((g) => (
                  <QueueRow
                    key={g.profile_id}
                    colour="sky"
                    title={g.full_name}
                    meta={`${g.email} · ${g.phone || "no phone"} · ${g.years_experience} years experience`}
                    actions={
                      <div className="flex gap-2">
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "APPROVE")}
                                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "REQUEST_CHANGES")}
                                className="rounded-lg border border-sand-300 px-4 py-2 text-sm hover:bg-sand-100">
                          Request changes
                        </button>
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "REJECT")}
                                className="rounded-lg border border-clay-500/30 px-4 py-2 text-sm text-clay-600 hover:bg-clay-50">
                          Reject
                        </button>
                      </div>
                    }
                  >
                    {g.bio && <p className="mt-3 text-sm text-ink-soft">{g.bio}</p>}
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="eyebrow text-ink-soft">Languages</dt>
                        <dd className="mt-1">{g.languages?.join(", ") || "—"}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-ink-soft">Specialisations</dt>
                        <dd className="mt-1">{g.specializations?.join(", ") || "—"}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-ink-soft">Qualifications</dt>
                        <dd className="mt-1">{g.qualifications || "—"}</dd>
                      </div>
                    </dl>
                    {noteBox(g.profile_id)}
                  </QueueRow>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-plum-500" />
              <h2 className="font-display text-lg font-semibold">Drivers</h2>
              <Pill tone="neutral">{drivers.length}</Pill>
            </div>

            {drivers.length === 0 ? (
              <EmptyState title="Queue clear" body="No driver applications waiting." />
            ) : (
              <div className="space-y-3">
                {drivers.map((d) => (
                  <QueueRow
                    key={d.profile_id}
                    colour="plum"
                    title={d.full_name}
                    meta={`${d.email} · licence ${d.license_no || "not provided"} · ${d.years_experience} years`}
                    actions={
                      <div className="flex gap-2">
                        <button onClick={() => act(adminApi.verifyDriver, d.profile_id, "APPROVE")}
                                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyDriver, d.profile_id, "REJECT")}
                                className="rounded-lg border border-clay-500/30 px-4 py-2 text-sm text-clay-600 hover:bg-clay-50">
                          Reject
                        </button>
                      </div>
                    }
                  >
                    {d.bio && <p className="mt-3 text-sm text-ink-soft">{d.bio}</p>}
                    {noteBox(d.profile_id)}
                  </QueueRow>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-clay-500" />
              <h2 className="font-display text-lg font-semibold">Vehicles</h2>
              <Pill tone="neutral">{vehicles.length}</Pill>
            </div>

            {vehicles.length === 0 ? (
              <EmptyState title="Queue clear" body="No vehicles waiting for checks." />
            ) : (
              <div className="space-y-3">
                {vehicles.map((v) => (
                  <QueueRow
                    key={v.id}
                    colour="clay"
                    title={`${v.vehicle_type}${v.model ? ` · ${v.model}` : ""}`}
                    meta={`${v.driver_name} · ${v.reg_no} · ${v.seats} seats · ${v.is_ac ? "AC" : "Non-AC"}`}
                    actions={
                      <div className="flex gap-2">
                        <button onClick={() => act(adminApi.verifyVehicle, v.id, "APPROVE")}
                                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyVehicle, v.id, "REJECT")}
                                className="rounded-lg border border-clay-500/30 px-4 py-2 text-sm text-clay-600 hover:bg-clay-50">
                          Reject
                        </button>
                      </div>
                    }
                  >
                    {v.photos?.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto">
                        {v.photos.map((url) => (
                          <img key={url} src={url} alt=""
                               className="h-28 w-40 shrink-0 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    {noteBox(v.id)}
                  </QueueRow>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---------- SUGGESTIONS ---------- */}
      {tab === "Suggestions" && (
        suggestions.length === 0 ? (
          <EmptyState
            title="Nothing to review"
            body="Destination suggestions from guides and drivers land here for approval."
          />
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <QueueRow
                key={s.id}
                colour="saffron"
                title={s.name || "Update to an existing destination"}
                meta={`${s.region || "Region not given"} · submitted by ${s.submitter_name}`}
                actions={
                  <div className="flex gap-2">
                    <button onClick={() => act(adminApi.reviewSuggestion, s.id, "APPROVE")}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                      Approve &amp; publish
                    </button>
                    <button onClick={() => act(adminApi.reviewSuggestion, s.id, "REJECT")}
                            className="rounded-lg border border-clay-500/30 px-4 py-2 text-sm text-clay-600 hover:bg-clay-50">
                      Reject
                    </button>
                  </div>
                }
              >
                <div className="mt-2">
                  <Pill tone={s.kind === "NEW" ? "brand" : "saffron"}>{s.kind}</Pill>
                </div>
                {s.description && <p className="mt-3 text-sm">{s.description}</p>}
                {s.why_popular && (
                  <p className="mt-2 rounded-lg bg-saffron-50 px-3 py-2 text-sm text-ink-soft">
                    <span className="font-medium text-ink">Why it's rising — </span>
                    {s.why_popular}
                  </p>
                )}
                {s.activities?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.activities.map((a) => (
                      <span key={a} className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                {s.photos?.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {s.photos.map((url) => (
                      <img key={url} src={url} alt=""
                           className="h-32 w-44 shrink-0 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                {noteBox(s.id)}
              </QueueRow>
            ))}
          </div>
        )
      )}

      {/* ---------- USERS ---------- */}
      {tab === "Users" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["", "TRAVELER", "GUIDE", "DRIVER"].map((r) => (
              <button
                key={r || "all"}
                onClick={() => setUserFilter(r)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  userFilter === r
                    ? "bg-ink text-white"
                    : "border border-sand-300 bg-white hover:bg-sand-100"
                }`}
              >
                {r ? r.charAt(0) + r.slice(1).toLowerCase() : "Everyone"}
              </button>
            ))}
          </div>

          <Panel pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-sand-200 bg-sand-50 text-left">
                  <tr>
                    {["Name", "Email", "Role", "Verification", "Status", ""].map((h) => (
                      <th key={h} className="px-5 py-3 eyebrow text-ink-soft">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-sand-50/60">
                      <td className="px-5 py-3.5 font-medium">{u.full_name}</td>
                      <td className="px-5 py-3.5 text-ink-soft">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <Pill tone={
                          u.role === "GUIDE" ? "info"
                          : u.role === "DRIVER" ? "neutral"
                          : u.role === "ADMIN" ? "saffron" : "brand"
                        }>
                          {u.role}
                        </Pill>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.verification_status
                          ? <Pill tone={u.verification_status === "APPROVED" ? "brand" : "saffron"}>
                              {u.verification_status}
                            </Pill>
                          : <span className="text-ink-soft">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_active
                          ? <Pill tone="brand">Active</Pill>
                          : <Pill tone="danger">Suspended</Pill>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() =>
                              adminApi.setUserStatus(u.id, !u.is_active, null)
                                .then(() => adminApi.users({ role: userFilter || undefined })
                                  .then((r) => setUsers(r.data)))
                            }
                            className="rounded-lg border border-sand-300 px-3 py-1.5 text-xs hover:bg-sand-100"
                          >
                            {u.is_active ? "Suspend" : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ---------- DESTINATIONS ---------- */}
      {tab === "Destinations" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <div key={d.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
              <div className="h-32 bg-sand-100">
                {d.photos?.[0] && (
                  <img src={d.photos[0].url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <p className="font-display font-semibold">{d.name}</p>
                <p className="text-sm text-ink-soft">{d.region}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => toggleFlag(d, "is_featured")}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      d.is_featured
                        ? "bg-brand-600 text-white"
                        : "border border-sand-300 hover:bg-sand-100"
                    }`}
                  >
                    Featured
                  </button>
                  <button
                    onClick={() => toggleFlag(d, "is_trending")}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      d.is_trending
                        ? "bg-saffron-500 text-night-900"
                        : "border border-sand-300 hover:bg-sand-100"
                    }`}
                  >
                    Trending
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- BOOKINGS ---------- */}
      {tab === "Bookings" && (
        <Panel pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-sand-200 bg-sand-50 text-left">
                <tr>
                  {["Reference", "Traveller", "Type", "Date", "Amount", "Status", "Payment"].map((h) => (
                    <th key={h} className="px-5 py-3 eyebrow text-ink-soft">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-sand-50/60">
                    <td className="px-5 py-3.5 font-mono text-xs">{b.reference}</td>
                    <td className="px-5 py-3.5">{b.traveler}</td>
                    <td className="px-5 py-3.5 text-ink-soft">{b.booking_type}</td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {new Date(b.start_date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-5 py-3.5 font-display font-semibold">
                      {b.currency} {b.total_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Pill tone={
                        b.status === "COMPLETED" ? "brand"
                        : b.status === "CANCELLED" ? "danger"
                        : b.status === "CONFIRMED" ? "info" : "saffron"
                      }>
                        {b.status}
                      </Pill>
                    </td>
                    <td className="px-5 py-3.5">
                      <Pill tone={b.payment_status === "SUCCESS" ? "brand" : "saffron"}>
                        {b.payment_status}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ---------- PAYMENTS ---------- */}
      {tab === "Payments" && (
        <Panel pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-sand-200 bg-sand-50 text-left">
                <tr>
                  {["Transaction", "Amount", "Commission", "Gateway", "Status", "Paid"].map((h) => (
                    <th key={h} className="px-5 py-3 eyebrow text-ink-soft">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-sand-50/60">
                    <td className="px-5 py-3.5 font-mono text-xs">{p.transaction_id || "—"}</td>
                    <td className="px-5 py-3.5 font-display font-semibold">
                      {p.currency} {p.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-saffron-600">
                      {p.commission.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">{p.provider}</td>
                    <td className="px-5 py-3.5">
                      <Pill tone={
                        p.status === "SUCCESS" ? "brand"
                        : p.status === "FAILED" ? "danger" : "saffron"
                      }>
                        {p.status}
                      </Pill>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </DashShell>
  );
}