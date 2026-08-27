import { useEffect, useState } from "react";
import { adminApi, destinationsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { DashShell, Panel, MetricCard, Pill, EmptyState, RankBars,
         SignalCard, QueueRow } from "../components/DashShell";
import { TrendChart, SplitChart, ADMIN_PALETTE } from "../components/charts";
import ImageUpload from "../components/ImageUpload";

const TABS = ["Overview", "Verifications", "Suggestions", "Users",
              "Destinations", "Bookings", "Payments"];

const emptyDest = {
  name: "", region: "", category_id: "", description: "",
  lat: "", lng: "", best_time_to_visit: "",
  est_cost_min: "", est_cost_max: "",
  activities: "", recommended_clothing: "", necessary_items: "",
  attractions: "", travel_warnings: "",
  is_featured: false, is_trending: false,
};

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

  const [categories, setCategories] = useState([]);
  const [editingDest, setEditingDest] = useState(null);
  const [destForm, setDestForm] = useState(emptyDest);
  const [destPhotos, setDestPhotos] = useState([]);
  const [destError, setDestError] = useState("");

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
    if (tab === "Destinations") {
      adminApi.destinations().then((r) => setDestinations(r.data)).catch(() => {});
      destinationsApi.categories().then((r) => setCategories(r.data)).catch(() => {});
    }
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

  const noteBox = (id) => (
    <input
      value={note[id] || ""}
      onChange={(e) => setNote({ ...note, [id]: e.target.value })}
      placeholder="Add a note for the applicant (optional)"
      className="mt-3 w-full rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-saffron-400"
    />
  );

  /* ---------- destinations ---------- */

  const dField =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-saffron-400";

  const toList = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

  const changeDest = (e) => {
    const { name, value, type, checked } = e.target;
    setDestForm({ ...destForm, [name]: type === "checkbox" ? checked : value });
  };

  const reloadDestinations = () =>
    adminApi.destinations().then((r) => setDestinations(r.data));

  const toggleFlag = async (d, key) => {
    await adminApi.setFlags(d.id, { [key]: !d[key] });
    reloadDestinations();
  };

  const startEditDest = (d) => {
    setDestForm({
      name: d.name || "",
      region: d.region || "",
      category_id: d.category_id || "",
      description: d.description || "",
      lat: d.lat ?? "",
      lng: d.lng ?? "",
      best_time_to_visit: d.best_time_to_visit || "",
      est_cost_min: d.est_cost_min ?? "",
      est_cost_max: d.est_cost_max ?? "",
      activities: (d.activities || []).join(", "),
      recommended_clothing: (d.recommended_clothing || []).join(", "),
      necessary_items: (d.necessary_items || []).join(", "),
      attractions: (d.popular_attractions || []).map((a) => a.name || a).join(", "),
      travel_warnings: d.travel_warnings || "",
      is_featured: d.is_featured,
      is_trending: d.is_trending,
    });
    setDestPhotos(d.photos.map((p) => p.url));
    setEditingDest(d.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDestination = async (e) => {
    e.preventDefault();
    setDestError("");

    const payload = {
      name: destForm.name,
      region: destForm.region || null,
      category_id: destForm.category_id || null,
      description: destForm.description || null,
      lat: destForm.lat ? Number(destForm.lat) : null,
      lng: destForm.lng ? Number(destForm.lng) : null,
      best_time_to_visit: destForm.best_time_to_visit || null,
      est_cost_min: destForm.est_cost_min ? Number(destForm.est_cost_min) : null,
      est_cost_max: destForm.est_cost_max ? Number(destForm.est_cost_max) : null,
      activities: toList(destForm.activities),
      recommended_clothing: toList(destForm.recommended_clothing),
      necessary_items: toList(destForm.necessary_items),
      popular_attractions: toList(destForm.attractions).map((n) => ({ name: n })),
      travel_warnings: destForm.travel_warnings || null,
      is_featured: destForm.is_featured,
      is_trending: destForm.is_trending,
    };

    try {
      if (editingDest === "new") {
        await adminApi.createDestination({ ...payload, photos: destPhotos });
      } else {
        await adminApi.updateDestination(editingDest, payload);
        const before = destinations.find((d) => d.id === editingDest)?.photos || [];
        const existing = before.map((p) => p.url);
        for (const url of destPhotos.filter((u) => !existing.includes(u))) {
          await adminApi.addDestinationPhoto(editingDest, url);
        }
        for (const p of before.filter((p) => !destPhotos.includes(p.url))) {
          await adminApi.deleteDestinationPhoto(p.id);
        }
      }
      setEditingDest(null);
      setDestPhotos([]);
      setDestForm(emptyDest);
      reloadDestinations();
    } catch (err) {
      setDestError(err.response?.data?.detail || "Couldn't save that destination.");
    }
  };

  const removeDestination = async (d) => {
    setDestError("");
    try {
      await adminApi.deleteDestination(d.id);
      reloadDestinations();
    } catch (err) {
      setDestError(err.response?.data?.detail || "Couldn't remove that destination.");
    }
  };

  /* ---------- derived ---------- */

  const queueTotal = guides.length + drivers.length + vehicles.length;

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
    name: d.name, value: d.searches,
    sub: `${d.bookings} booking${d.bookings === 1 ? "" : "s"}`,
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

  const th = "px-5 py-3 eyebrow text-white/40";
  const td = "px-5 py-3.5";

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
                        ? "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                        : "border-white/5 opacity-40"
                    }`}
                  >
                    <span className={`inline-block h-1.5 w-8 rounded-full ${
                      colour === "sky" ? "bg-sky-500"
                      : colour === "plum" ? "bg-plum-500"
                      : colour === "clay" ? "bg-clay-500" : "bg-saffron-500"
                    }`} />
                    <p className="mt-3 font-display text-2xl font-bold text-white">{count}</p>
                    <p className="mt-0.5 text-xs text-white/45">{label}</p>
                  </button>
                ))}
              </div>
            </Panel>
          )}

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Bookings over time" sub="By trip start date" className="xl:col-span-2">
              {monthlyBookings.length === 0 ? (
                <p className="py-20 text-center text-sm text-white/40">
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
                    <span className="flex items-center gap-2 text-white/55">
                      <span className="h-2.5 w-2.5 rounded-full"
                            style={{ background: ADMIN_PALETTE[i] }} />
                      {s.name}
                    </span>
                    <span className="font-display font-semibold text-white">{s.value}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-white/8 pt-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-white/55">Travellers per provider</span>
                  <span className="font-display font-semibold text-white">
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
              <h2 className="font-display text-lg font-semibold text-white">Guides</h2>
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
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "APPROVE")}
                                className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "REQUEST_CHANGES")}
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10">
                          Request changes
                        </button>
                        <button onClick={() => act(adminApi.verifyGuide, g.profile_id, "REJECT")}
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-red-400/40 hover:text-red-300">
                          Reject
                        </button>
                      </div>
                    }
                  >
                    {g.bio && <p className="mt-3 text-sm text-white/60">{g.bio}</p>}
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="eyebrow text-white/40">Languages</dt>
                        <dd className="mt-1 text-white/80">{g.languages?.join(", ") || "—"}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-white/40">Specialisations</dt>
                        <dd className="mt-1 text-white/80">{g.specializations?.join(", ") || "—"}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-white/40">Qualifications</dt>
                        <dd className="mt-1 text-white/80">{g.qualifications || "—"}</dd>
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
              <h2 className="font-display text-lg font-semibold text-white">Drivers</h2>
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
                                className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyDriver, d.profile_id, "REJECT")}
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-red-400/40 hover:text-red-300">
                          Reject
                        </button>
                      </div>
                    }
                  >
                    {d.bio && <p className="mt-3 text-sm text-white/60">{d.bio}</p>}
                    {noteBox(d.profile_id)}
                  </QueueRow>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-clay-500" />
              <h2 className="font-display text-lg font-semibold text-white">Vehicles</h2>
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
                                className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400">
                          Approve
                        </button>
                        <button onClick={() => act(adminApi.verifyVehicle, v.id, "REJECT")}
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-red-400/40 hover:text-red-300">
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
                            className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-night-900 hover:bg-saffron-400">
                      Approve &amp; publish
                    </button>
                    <button onClick={() => act(adminApi.reviewSuggestion, s.id, "REJECT")}
                            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-red-400/40 hover:text-red-300">
                      Reject
                    </button>
                  </div>
                }
              >
                <div className="mt-2">
                  <Pill tone={s.kind === "NEW" ? "brand" : "saffron"}>{s.kind}</Pill>
                </div>
                {s.description && <p className="mt-3 text-sm text-white/70">{s.description}</p>}
                {s.why_popular && (
                  <p className="mt-2 rounded-lg bg-saffron-500/12 px-3 py-2 text-sm text-white/70">
                    <span className="font-medium text-saffron-400">Why it's rising — </span>
                    {s.why_popular}
                  </p>
                )}
                {s.activities?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.activities.map((a) => (
                      <span key={a} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">
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
                    ? "bg-saffron-500 font-medium text-night-900"
                    : "border border-white/15 text-white/70 hover:text-white"
                }`}
              >
                {r ? r.charAt(0) + r.slice(1).toLowerCase() : "Everyone"}
              </button>
            ))}
          </div>

          <Panel pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/8 bg-white/5 text-left">
                  <tr>
                    {["Name", "Email", "Role", "Verification", "Status", ""].map((h) => (
                      <th key={h} className={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className={`${td} font-medium text-white`}>{u.full_name}</td>
                      <td className={`${td} text-white/55`}>{u.email}</td>
                      <td className={td}>
                        <Pill tone={
                          u.role === "GUIDE" ? "info"
                          : u.role === "DRIVER" ? "neutral"
                          : u.role === "ADMIN" ? "saffron" : "brand"
                        }>
                          {u.role}
                        </Pill>
                      </td>
                      <td className={td}>
                        {u.verification_status
                          ? <Pill tone={u.verification_status === "APPROVED" ? "brand" : "saffron"}>
                              {u.verification_status}
                            </Pill>
                          : <span className="text-white/35">—</span>}
                      </td>
                      <td className={td}>
                        {u.is_active
                          ? <Pill tone="brand">Active</Pill>
                          : <Pill tone="danger">Suspended</Pill>}
                      </td>
                      <td className={`${td} text-right`}>
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() =>
                              adminApi.setUserStatus(u.id, !u.is_active, null)
                                .then(() => adminApi.users({ role: userFilter || undefined })
                                  .then((r) => setUsers(r.data)))
                            }
                            className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
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
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              {destinations.length} destination{destinations.length === 1 ? "" : "s"} ·
              travellers only see active ones
            </p>
            <button
              onClick={() => {
                setDestForm({ ...emptyDest });
                setDestPhotos([]);
                setEditingDest("new");
              }}
              className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400"
            >
              Add destination
            </button>
          </div>

          {destError && (
            <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {destError}
            </div>
          )}

          {editingDest && (
            <Panel title={editingDest === "new" ? "New destination" : "Edit destination"}>
              <form onSubmit={saveDestination} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="eyebrow text-white/45">Name</label>
                  <input name="name" required value={destForm.name}
                         onChange={changeDest} placeholder="Diyaluma Falls"
                         className={dField} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Category</label>
                  <select name="category_id" value={destForm.category_id}
                          onChange={changeDest} className={dField}>
                    <option value="">Choose…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eyebrow text-white/45">Region</label>
                  <input name="region" value={destForm.region} onChange={changeDest}
                         placeholder="Uva Province" className={dField} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Best time to visit</label>
                  <input name="best_time_to_visit" value={destForm.best_time_to_visit}
                         onChange={changeDest} placeholder="January to April"
                         className={dField} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="eyebrow text-white/45">Latitude</label>
                    <input name="lat" value={destForm.lat} onChange={changeDest}
                           placeholder="6.7333" className={dField} />
                  </div>
                  <div>
                    <label className="eyebrow text-white/45">Longitude</label>
                    <input name="lng" value={destForm.lng} onChange={changeDest}
                           placeholder="81.0333" className={dField} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="eyebrow text-white/45">Cost from (LKR)</label>
                    <input type="number" name="est_cost_min" value={destForm.est_cost_min}
                           onChange={changeDest} className={dField} />
                  </div>
                  <div>
                    <label className="eyebrow text-white/45">Cost to (LKR)</label>
                    <input type="number" name="est_cost_max" value={destForm.est_cost_max}
                           onChange={changeDest} className={dField} />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Description</label>
                  <textarea name="description" rows={3} value={destForm.description}
                            onChange={changeDest} className={dField} />
                </div>

                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Activities (comma separated)</label>
                  <input name="activities" value={destForm.activities}
                         onChange={changeDest} placeholder="Hiking, Swimming, Photography"
                         className={dField} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">What to wear</label>
                  <input name="recommended_clothing" value={destForm.recommended_clothing}
                         onChange={changeDest} placeholder="Light clothes, Hat"
                         className={dField} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">What to bring</label>
                  <input name="necessary_items" value={destForm.necessary_items}
                         onChange={changeDest} placeholder="Water, Sunscreen"
                         className={dField} />
                </div>

                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Attractions (comma separated)</label>
                  <input name="attractions" value={destForm.attractions}
                         onChange={changeDest} placeholder="Lower falls, Upper pools"
                         className={dField} />
                </div>

                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Travel warnings</label>
                  <textarea name="travel_warnings" rows={2} value={destForm.travel_warnings}
                            onChange={changeDest}
                            placeholder="Slippery rocks after rain. No lifeguards."
                            className={dField} />
                </div>

                <div className="sm:col-span-2">
                  <ImageUpload value={destPhotos} onChange={setDestPhotos}
                               max={5} label="Photos" />
                </div>

                <div className="flex flex-wrap gap-5 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input type="checkbox" name="is_featured" checked={destForm.is_featured}
                           onChange={changeDest} className="accent-saffron-500" />
                    Featured on the home page
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input type="checkbox" name="is_trending" checked={destForm.is_trending}
                           onChange={changeDest} className="accent-saffron-500" />
                    Trending
                  </label>
                </div>

                <div className="flex gap-2 sm:col-span-2">
                  <button className="rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
                    {editingDest === "new" ? "Publish destination" : "Save changes"}
                  </button>
                  <button type="button"
                          onClick={() => { setEditingDest(null); setDestPhotos([]); }}
                          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white hover:bg-white/10">
                    Cancel
                  </button>
                </div>
              </form>
            </Panel>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d) => (
              <div key={d.id}
                   className="overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 backdrop-blur">
                <div className="relative h-36 bg-slate-700">
                  {d.photos?.[0] && (
                    <img src={d.photos[0].url} alt=""
                         className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 to-transparent p-3">
                    <p className="font-display font-semibold text-white">{d.name}</p>
                    <p className="text-xs text-white/60">
                      {d.region}
                      {d.category_name && ` · ${d.category_name}`}
                    </p>
                  </div>
                  {d.status !== "ACTIVE" && (
                    <span className="absolute right-2 top-2">
                      <Pill tone="danger">{d.status}</Pill>
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45">
                    <span>{d.search_count} searches</span>
                    <span>{d.package_count} package{d.package_count === 1 ? "" : "s"}</span>
                    <span>{d.photos.length} photo{d.photos.length === 1 ? "" : "s"}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => toggleFlag(d, "is_featured")}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        d.is_featured
                          ? "bg-brand-600 text-white"
                          : "border border-white/12 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      Featured
                    </button>
                    <button
                      onClick={() => toggleFlag(d, "is_trending")}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        d.is_trending
                          ? "bg-saffron-500 text-night-900"
                          : "border border-white/12 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      Trending
                    </button>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => startEditDest(d)}
                      className="flex-1 rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeDestination(d)}
                      className="flex-1 rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/50 hover:border-red-400/40 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- BOOKINGS ---------- */}
      {tab === "Bookings" && (
        <Panel pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8 bg-white/5 text-left">
                <tr>
                  {["Reference", "Traveller", "Type", "Date", "Amount", "Status", "Payment"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5">
                    <td className={`${td} font-mono text-xs text-white/70`}>{b.reference}</td>
                    <td className={`${td} text-white`}>{b.traveler}</td>
                    <td className={`${td} text-white/55`}>{b.booking_type}</td>
                    <td className={`${td} text-white/55`}>
                      {new Date(b.start_date).toLocaleDateString("en-GB")}
                    </td>
                    <td className={`${td} font-display font-semibold text-white`}>
                      {b.currency} {b.total_amount.toLocaleString()}
                    </td>
                    <td className={td}>
                      <Pill tone={
                        b.status === "COMPLETED" ? "brand"
                        : b.status === "CANCELLED" ? "danger"
                        : b.status === "CONFIRMED" ? "info" : "saffron"
                      }>
                        {b.status}
                      </Pill>
                    </td>
                    <td className={td}>
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
              <thead className="border-b border-white/8 bg-white/5 text-left">
                <tr>
                  {["Transaction", "Amount", "Commission", "Gateway", "Status", "Paid"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5">
                    <td className={`${td} font-mono text-xs text-white/70`}>
                      {p.transaction_id || "—"}
                    </td>
                    <td className={`${td} font-display font-semibold text-white`}>
                      {p.currency} {p.amount.toLocaleString()}
                    </td>
                    <td className={`${td} text-saffron-400`}>
                      {p.commission.toLocaleString()}
                    </td>
                    <td className={`${td} text-white/55`}>{p.provider}</td>
                    <td className={td}>
                      <Pill tone={
                        p.status === "SUCCESS" ? "brand"
                        : p.status === "FAILED" ? "danger" : "saffron"
                      }>
                        {p.status}
                      </Pill>
                    </td>
                    <td className={`${td} text-white/55`}>
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