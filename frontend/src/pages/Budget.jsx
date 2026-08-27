import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { budgetApi } from "../api/endpoints";
import { DashShell, Panel, Pill, EmptyState, MetricCard } from "../components/DashShell";
import { ColumnChart } from "../components/charts";

const CATEGORIES = ["PACKAGE", "GUIDE", "DRIVER", "TRANSPORT",
                    "ACCOMMODATION", "FOOD", "ACTIVITIES", "OTHER"];

const RING_TONE = {
  OK: "#9CC4B2",
  WARNING: "#F0B44A",
  CRITICAL: "#D98B68",
  OVER: "#E05C48",
};

function Ring({ percent, status, size = 168 }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, percent));
  const colour = RING_TONE[status] || RING_TONE.OK;

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
        <span className="font-display text-4xl font-bold leading-none text-white">
          {Math.round(percent)}%
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
          of budget used
        </span>
      </div>
    </div>
  );
}

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [active, setActive] = useState(null);
  const [summary, setSummary] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingExpense, setEditingExpense] = useState(null);
  const [error, setError] = useState("");

  const [newBudget, setNewBudget] = useState({
    title: "", total_budget: "", start_date: "", end_date: "",
  });
  const [expense, setExpense] = useState({
    category: "FOOD", amount: "", note: "",
    spent_on: new Date().toISOString().slice(0, 10),
  });

  const loadBudgets = () =>
    budgetApi.list().then((r) => {
      setBudgets(r.data);
      if (r.data.length && !active) setActive(r.data[0].id);
    });

  useEffect(() => { loadBudgets(); }, []);

  useEffect(() => {
    if (active) budgetApi.summary(active).then((r) => setSummary(r.data)).catch(() => {});
  }, [active]);

  const refresh = () => budgetApi.summary(active).then((r) => setSummary(r.data));

  const createBudget = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await budgetApi.create({
        title: newBudget.title,
        total_budget: Number(newBudget.total_budget),
        start_date: newBudget.start_date || null,
        end_date: newBudget.end_date || null,
      });
      setCreating(false);
      setNewBudget({ title: "", total_budget: "", start_date: "", end_date: "" });
      await loadBudgets();
      setActive(data.id);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't create that budget.");
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await budgetApi.addExpense(active, {
        category: expense.category,
        amount: Number(expense.amount),
        note: expense.note || null,
        spent_on: expense.spent_on,
      });
      setExpense({ ...expense, amount: "", note: "" });
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't add that expense.");
    }
  };

  const removeExpense = async (id) => {
    setError("");
    try {
      await budgetApi.deleteExpense(id);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't remove that expense.");
    }
  };

  const startEdit = () => {
    setEditForm({
      title: summary.title,
      total_budget: summary.total_budget,
      start_date: summary.start_date || "",
      end_date: summary.end_date || "",
    });
    setEditing(true);
  };

  const saveBudget = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await budgetApi.update(active, {
        title: editForm.title,
        total_budget: Number(editForm.total_budget),
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      });
      setEditing(false);
      await loadBudgets();
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't save those changes.");
    }
  };

  const deleteBudget = async () => {
    setError("");
    try {
      await budgetApi.remove(active);
      setActive(null);
      setSummary(null);
      const { data } = await budgetApi.list();
      setBudgets(data);
      if (data[0]) setActive(data[0].id);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't delete that budget.");
    }
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await budgetApi.updateExpense(editingExpense.id, {
        category: editingExpense.category,
        amount: Number(editingExpense.amount),
        note: editingExpense.note || null,
        spent_on: editingExpense.spent_on,
      });
      setEditingExpense(null);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't update that expense.");
    }
  };

  const field =
    "mt-1.5 w-full rounded-lg border border-white/12 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-saffron-400";

  const catChart = summary?.by_category?.map((c) => ({
    name: c.category.charAt(0) + c.category.slice(1).toLowerCase(),
    amount: Number(c.amount),
  })) || [];

  const isTripBudget = Boolean(summary?.booking_id);
  const tripBudgets = budgets.filter((b) => b.booking_id);
  const ownBudgets = budgets.filter((b) => !b.booking_id);

  const chip = (b) => (
    <button
      key={b.id}
      onClick={() => { setActive(b.id); setEditing(false); setEditingExpense(null); }}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition ${
        active === b.id
          ? "bg-saffron-500 font-medium text-night-900"
          : "border border-white/15 text-white/70 hover:text-white"
      }`}
    >
      {b.booking_id && (
        <span className={`h-1.5 w-1.5 rounded-full ${
          active === b.id ? "bg-night-900/50" : "bg-saffron-500"
        }`} />
      )}
      {b.title}
    </button>
  );

  return (
    <DashShell
      eyebrow="Money"
      title="Budgets"
      subtitle="Track any trip, booked through Roamie or not"
      tabs={["Overview"]}
      tab="Overview"
      setTab={() => {}}
      right={
        <button
          onClick={() => setCreating(!creating)}
          className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400"
        >
          {creating ? "Cancel" : "New budget"}
        </button>
      }
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {budgets.length > 0 && (
        <div className="mb-5 space-y-3">
          {tripBudgets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1 text-white/35">Booked trips</span>
              {tripBudgets.map(chip)}
            </div>
          )}
          {ownBudgets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1 text-white/35">Your own</span>
              {ownBudgets.map(chip)}
            </div>
          )}
        </div>
      )}

      {creating && (
        <Panel title="New budget" sub="For a trip you're planning or tracking yourself"
               className="mb-5">
          <form onSubmit={createBudget} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="eyebrow text-white/45">Name it</label>
              <input required value={newBudget.title}
                     onChange={(e) => setNewBudget({ ...newBudget, title: e.target.value })}
                     placeholder="Hill country, September" className={field} />
            </div>
            <div>
              <label className="eyebrow text-white/45">Total budget (LKR)</label>
              <input type="number" required value={newBudget.total_budget}
                     onChange={(e) => setNewBudget({ ...newBudget, total_budget: e.target.value })}
                     className={field} />
            </div>
            <div />
            <div>
              <label className="eyebrow text-white/45">Start date</label>
              <input type="date" value={newBudget.start_date}
                     onChange={(e) => setNewBudget({ ...newBudget, start_date: e.target.value })}
                     className={field} />
            </div>
            <div>
              <label className="eyebrow text-white/45">End date</label>
              <input type="date" value={newBudget.end_date}
                     onChange={(e) => setNewBudget({ ...newBudget, end_date: e.target.value })}
                     className={field} />
            </div>
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
                Create budget
              </button>
            </div>
          </form>
        </Panel>
      )}

      {!summary && budgets.length === 0 && !creating && (
        <EmptyState
          title="No budgets yet"
          body="Create one for any trip, or book something through Roamie and a budget is set up for you."
          action={
            <button onClick={() => setCreating(true)}
                    className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
              Create a budget
            </button>
          }
        />
      )}

      {summary && (
        <div className="space-y-5">
          {editing && (
            <Panel title="Edit budget">
              <form onSubmit={saveBudget} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="eyebrow text-white/45">Name</label>
                  <input required value={editForm.title}
                         onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                         className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">Total budget (LKR)</label>
                  <input type="number" required value={editForm.total_budget}
                         onChange={(e) => setEditForm({ ...editForm, total_budget: e.target.value })}
                         className={field} />
                </div>
                <div />
                <div>
                  <label className="eyebrow text-white/45">Start date</label>
                  <input type="date" value={editForm.start_date}
                         onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                         className={field} />
                </div>
                <div>
                  <label className="eyebrow text-white/45">End date</label>
                  <input type="date" value={editForm.end_date}
                         onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                         className={field} />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <button className="rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
                    Save changes
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white hover:bg-white/10">
                    Cancel
                  </button>
                </div>
              </form>
            </Panel>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-8">
                <Ring percent={summary.percent_used} status={summary.status} />

                <div className="flex-1 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-white">
                          {summary.title}
                        </h2>
                        {isTripBudget && <Pill tone="saffron">Booked trip</Pill>}
                      </div>
                      <p className="mt-1 text-sm text-white/45">
                        {summary.start_date && (
                          <>
                            {new Date(summary.start_date).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short" })} –{" "}
                            {new Date(summary.end_date).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric" })}
                          </>
                        )}
                        {summary.booking_reference && (
                          <>
                            {summary.start_date && " · "}
                            <Link to={`/bookings/${summary.booking_id}`}
                                  className="font-mono text-saffron-400 hover:underline">
                              {summary.booking_reference}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={startEdit}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                        Edit
                      </button>
                      <button onClick={deleteBudget}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/50 hover:border-red-400/40 hover:text-red-300">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      ["Budget", summary.total_budget, "text-white"],
                      ["Spent", summary.total_spent, "text-white"],
                      ["Left", summary.remaining,
                       summary.remaining < 0 ? "text-red-300" : "text-brand-200"],
                    ].map(([k, v, cls]) => (
                      <div key={k}>
                        <p className="eyebrow text-white/40">{k}</p>
                        <p className={`mt-1 font-display text-xl font-bold ${cls}`}>
                          <span className="text-sm font-medium text-white/40">
                            {summary.currency}{" "}
                          </span>
                          {Number(v).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {summary.message && (
                    <div className={`rounded-xl px-4 py-3 text-sm ${
                      summary.status === "OVER" ? "bg-red-500/15 text-red-200"
                      : summary.status === "CRITICAL" ? "bg-clay-500/20 text-clay-500"
                      : "bg-saffron-500/15 text-saffron-400"
                    }`}>
                      {summary.message}
                    </div>
                  )}

                  {summary.daily_burn && (
                    <p className="text-xs text-white/40">
                      Day {summary.days_elapsed} of {summary.days_total} ·{" "}
                      {summary.currency} {Number(summary.daily_burn).toLocaleString()} a day ·
                      projected {summary.currency}{" "}
                      {Number(summary.projected_total).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="Add an expense" sub="Anything you've spent on this trip">
              <form onSubmit={addExpense} className="space-y-3">
                <div>
                  <label className="eyebrow text-white/45">Category</label>
                  <select value={expense.category}
                          onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                          className={field}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="eyebrow text-white/45">Amount</label>
                    <input type="number" required value={expense.amount}
                           onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                           className={field} />
                  </div>
                  <div>
                    <label className="eyebrow text-white/45">Date</label>
                    <input type="date" required value={expense.spent_on}
                           onChange={(e) => setExpense({ ...expense, spent_on: e.target.value })}
                           className={field} />
                  </div>
                </div>
                <div>
                  <label className="eyebrow text-white/45">Note</label>
                  <input value={expense.note}
                         onChange={(e) => setExpense({ ...expense, note: e.target.value })}
                         placeholder="Lunch in Ella" className={field} />
                </div>
                <button className="w-full rounded-lg bg-saffron-500 py-2.5 text-sm font-medium text-night-900 hover:bg-saffron-400">
                  Add expense
                </button>
              </form>
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Where it's going" sub="By category">
              {catChart.length === 0 ? (
                <p className="py-16 text-center text-sm text-white/40">
                  Nothing spent yet.
                </p>
              ) : (
                <>
                  <ColumnChart data={catChart} xKey="name" yKey="amount"
                               prefix="LKR " height={200} />
                  <ul className="mt-4 space-y-2">
                    {summary.by_category.map((c) => (
                      <li key={c.category} className="flex items-baseline justify-between text-sm">
                        <span className="capitalize text-white/55">
                          {c.category.toLowerCase()}
                        </span>
                        <span>
                          <span className="font-display font-semibold text-white">
                            {Number(c.amount).toLocaleString()}
                          </span>
                          <span className="ml-2 text-xs text-white/35">{c.percent}%</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <Panel
              title="Expenses"
              sub={isTripBudget
                ? "What you paid Roamie is logged. Add everything else yourself."
                : "Everything here is yours to manage"}
              className="lg:col-span-2"
            >
              {editingExpense && (
                <form onSubmit={saveExpense} className="mb-5 rounded-xl border border-white/8 bg-slate-900/60 p-4">
                  <p className="eyebrow text-white/45">Edit expense</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <select value={editingExpense.category}
                            onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                            className={field}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0) + c.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <input type="number" value={editingExpense.amount}
                           onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                           className={field} />
                    <input type="date" value={editingExpense.spent_on}
                           onChange={(e) => setEditingExpense({ ...editingExpense, spent_on: e.target.value })}
                           className={field} />
                    <input value={editingExpense.note || ""}
                           onChange={(e) => setEditingExpense({ ...editingExpense, note: e.target.value })}
                           placeholder="Note" className={field} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-lg bg-saffron-500 px-4 py-2 text-xs font-medium text-night-900 hover:bg-saffron-400">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingExpense(null)}
                            className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white hover:bg-white/10">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {summary.expenses.length === 0 ? (
                <p className="py-16 text-center text-sm text-white/40">
                  Nothing logged yet. Add your first expense on the right.
                </p>
              ) : (
                <ul className="divide-y divide-white/8">
                  {summary.expenses.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize text-white">
                            {e.category.toLowerCase()}
                          </span>
                          {e.booking_id && <Pill tone="brand">Paid via Roamie</Pill>}
                        </div>
                        <p className="mt-0.5 text-xs text-white/40">
                          {new Date(e.spent_on).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          {e.note && ` · ${e.note}`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <span className="font-display font-semibold text-white">
                          {summary.currency} {Number(e.amount).toLocaleString()}
                        </span>
                        {e.booking_id ? (
                          <Link to={`/bookings/${e.booking_id}`}
                                className="text-xs text-saffron-400 hover:underline">
                            Booking
                          </Link>
                        ) : (
                          <>
                            <button onClick={() => setEditingExpense({ ...e })}
                                    className="text-xs text-white/45 hover:text-saffron-400">
                              Edit
                            </button>
                            <button onClick={() => removeExpense(e.id)}
                                    className="text-xs text-white/45 hover:text-red-300">
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </DashShell>
  );
}