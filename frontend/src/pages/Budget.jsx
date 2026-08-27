import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { budgetApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import { Panel, Pill, EmptyState } from "../components/DashShell";
import { ColumnChart } from "../components/charts";

const CATEGORIES = ["PACKAGE", "GUIDE", "DRIVER", "TRANSPORT",
                    "ACCOMMODATION", "FOOD", "ACTIVITIES", "OTHER"];

const RING_TONE = {
  OK: "#14523F",
  WARNING: "#E39A22",
  CRITICAL: "#C0603C",
  OVER: "#B23B2E",
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
                stroke="#EBE6D9" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={colour} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - (pct / 100) * c}
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold leading-none">
          {Math.round(percent)}%
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-ink-soft">
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

  const field =
    "mt-1.5 w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500";

  const catChart = summary?.by_category?.map((c) => ({
    name: c.category.charAt(0) + c.category.slice(1).toLowerCase(),
    amount: Number(c.amount),
  })) || [];

  const autoTotal = summary?.expenses
    ?.filter((e) => e.booking_id)
    .reduce((s, e) => s + Number(e.amount), 0) || 0;

  return (
    <div className="min-h-screen bg-[#F1EEE6]">
      <Navbar />

      <div className="border-b border-sand-200 bg-white">
        <div className="mx-auto max-w-[86rem] px-6 py-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-brand-600">Money</p>
              <h1 className="headline mt-1.5 text-[2.5rem] leading-none">Trip budget</h1>
              <p className="mt-2 text-sm text-ink-soft">
                Anything you pay for through Roamie is added automatically. Add the rest yourself.
              </p>
            </div>
            <button
              onClick={() => setCreating(!creating)}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              {creating ? "Cancel" : "New budget"}
            </button>
          </div>

          {budgets.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {budgets.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActive(b.id)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    active === b.id
                      ? "bg-ink text-white"
                      : "border border-sand-300 hover:bg-sand-100"
                  }`}
                >
                  {b.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[86rem] space-y-5 px-6 py-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {creating && (
          <Panel title="New budget" sub="Set the dates and Roamie will match bookings to it">
            <form onSubmit={createBudget} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="eyebrow text-ink-soft">Trip name</label>
                <input required value={newBudget.title}
                       onChange={(e) => setNewBudget({ ...newBudget, title: e.target.value })}
                       placeholder="Hill country, September" className={field} />
              </div>
              <div>
                <label className="eyebrow text-ink-soft">Total budget (LKR)</label>
                <input type="number" required value={newBudget.total_budget}
                       onChange={(e) => setNewBudget({ ...newBudget, total_budget: e.target.value })}
                       className={field} />
              </div>
              <div />
              <div>
                <label className="eyebrow text-ink-soft">Start date</label>
                <input type="date" value={newBudget.start_date}
                       onChange={(e) => setNewBudget({ ...newBudget, start_date: e.target.value })}
                       className={field} />
              </div>
              <div>
                <label className="eyebrow text-ink-soft">End date</label>
                <input type="date" value={newBudget.end_date}
                       onChange={(e) => setNewBudget({ ...newBudget, end_date: e.target.value })}
                       className={field} />
              </div>
              <div className="sm:col-span-2">
                <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                  Create budget
                </button>
              </div>
            </form>
          </Panel>
        )}

        {!summary && budgets.length === 0 && !creating && (
          <EmptyState
            title="No budget yet"
            body="Create one and Roamie will track what you spend, warn you before you run out, and add your bookings automatically."
            action={
              <button onClick={() => setCreating(true)}
                      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Create a budget
              </button>
            }
          />
        )}

        {summary && (
          <>
            {/* headline */}
            <div className="grid gap-5 lg:grid-cols-3">
              <Panel className="lg:col-span-2">
                <div className="flex flex-wrap items-center gap-8">
                  <Ring percent={summary.percent_used} status={summary.status} />

                  <div className="flex-1 space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-bold">{summary.title}</h2>
                      {summary.start_date && (
                        <p className="text-sm text-ink-soft">
                          {new Date(summary.start_date).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short" })} –{" "}
                          {new Date(summary.end_date).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        ["Budget", summary.total_budget, "text-ink"],
                        ["Spent", summary.total_spent, "text-ink"],
                        ["Left", summary.remaining,
                         summary.remaining < 0 ? "text-red-600" : "text-brand-600"],
                      ].map(([k, v, cls]) => (
                        <div key={k}>
                          <p className="eyebrow text-ink-soft">{k}</p>
                          <p className={`mt-1 font-display text-xl font-bold ${cls}`}>
                            <span className="text-sm font-medium text-ink-soft">
                              {summary.currency}{" "}
                            </span>
                            {Number(v).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    {summary.message && (
                      <div className={`rounded-xl px-4 py-3 text-sm ${
                        summary.status === "OVER" ? "bg-red-50 text-red-700"
                        : summary.status === "CRITICAL" ? "bg-clay-50 text-clay-600"
                        : "bg-saffron-50 text-saffron-600"
                      }`}>
                        {summary.message}
                      </div>
                    )}

                    {summary.daily_burn && (
                      <p className="text-xs text-ink-soft">
                        Day {summary.days_elapsed} of {summary.days_total} ·{" "}
                        {summary.currency} {Number(summary.daily_burn).toLocaleString()} a day ·
                        projected {summary.currency}{" "}
                        {Number(summary.projected_total).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </Panel>

              {/* add expense */}
              <Panel title="Add an expense" sub="For anything you paid outside Roamie">
                <form onSubmit={addExpense} className="space-y-3">
                  <div>
                    <label className="eyebrow text-ink-soft">Category</label>
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
                      <label className="eyebrow text-ink-soft">Amount</label>
                      <input type="number" required value={expense.amount}
                             onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                             className={field} />
                    </div>
                    <div>
                      <label className="eyebrow text-ink-soft">Date</label>
                      <input type="date" required value={expense.spent_on}
                             onChange={(e) => setExpense({ ...expense, spent_on: e.target.value })}
                             className={field} />
                    </div>
                  </div>
                  <div>
                    <label className="eyebrow text-ink-soft">Note</label>
                    <input value={expense.note}
                           onChange={(e) => setExpense({ ...expense, note: e.target.value })}
                           placeholder="Lunch in Ella" className={field} />
                  </div>
                  <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                    Add expense
                  </button>
                </form>
              </Panel>
            </div>

            {/* breakdown + list */}
            <div className="grid gap-5 lg:grid-cols-3">
              <Panel title="Where it's going" sub="By category">
                {catChart.length === 0 ? (
                  <p className="py-16 text-center text-sm text-ink-soft">
                    Nothing spent yet.
                  </p>
                ) : (
                  <>
                    <ColumnChart data={catChart} xKey="name" yKey="amount"
                                 prefix="LKR " height={200} />
                    <ul className="mt-4 space-y-2">
                      {summary.by_category.map((c) => (
                        <li key={c.category} className="flex items-baseline justify-between text-sm">
                          <span className="capitalize text-ink-soft">
                            {c.category.toLowerCase()}
                          </span>
                          <span>
                            <span className="font-display font-semibold">
                              {Number(c.amount).toLocaleString()}
                            </span>
                            <span className="ml-2 text-xs text-ink-soft">{c.percent}%</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>

              <Panel
                title="Expenses"
                sub={autoTotal > 0
                  ? `LKR ${autoTotal.toLocaleString()} added automatically from bookings`
                  : "Nothing from bookings yet"}
                className="lg:col-span-2"
              >
                {summary.expenses.length === 0 ? (
                  <p className="py-16 text-center text-sm text-ink-soft">
                    Nothing logged yet. Pay for a booking, or add an expense manually.
                  </p>
                ) : (
                  <ul className="divide-y divide-sand-100">
                    {summary.expenses.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {e.category.toLowerCase()}
                            </span>
                            {e.booking_id && <Pill tone="brand">Auto</Pill>}
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {new Date(e.spent_on).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                            {e.note && ` · ${e.note}`}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <span className="font-display font-semibold">
                            {summary.currency} {Number(e.amount).toLocaleString()}
                          </span>
                          {e.booking_id ? (
                            <Link to={`/bookings/${e.booking_id}`}
                                  className="text-xs text-brand-600 hover:underline">
                              Booking
                            </Link>
                          ) : (
                            <button
                              onClick={() => removeExpense(e.id)}
                              className="text-xs text-ink-soft hover:text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </div>
  );
}