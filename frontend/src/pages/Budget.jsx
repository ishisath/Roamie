import { useEffect, useState } from "react";
import { budgetApi } from "../api/endpoints";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CATEGORIES = ["PACKAGE", "GUIDE", "DRIVER", "TRANSPORT",
                    "ACCOMMODATION", "FOOD", "ACTIVITIES", "OTHER"];

const STATUS_STYLES = {
  OK: "border-sand-300 bg-white",
  WARNING: "border-amber-200 bg-amber-50 text-amber-900",
  CRITICAL: "border-orange-200 bg-orange-50 text-orange-900",
  OVER: "border-red-200 bg-red-50 text-red-900",
};

const BAR_COLOR = {
  OK: "bg-brand-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-orange-500",
  OVER: "bg-red-500",
};

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [active, setActive] = useState(null);
  const [summary, setSummary] = useState(null);
  const [creating, setCreating] = useState(false);

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
    if (active) budgetApi.summary(active).then((r) => setSummary(r.data));
  }, [active]);

  const refresh = () => budgetApi.summary(active).then((r) => setSummary(r.data));

  const createBudget = async (e) => {
    e.preventDefault();
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
  };

  const addExpense = async (e) => {
    e.preventDefault();
    await budgetApi.addExpense(active, {
      category: expense.category,
      amount: Number(expense.amount),
      note: expense.note || null,
      spent_on: expense.spent_on,
    });
    setExpense({ ...expense, amount: "", note: "" });
    refresh();
  };

  const removeExpense = async (id) => {
    await budgetApi.deleteExpense(id);
    refresh();
  };

  const field =
    "mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Trip budget</h1>
          <button
            onClick={() => setCreating(!creating)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {creating ? "Cancel" : "New budget"}
          </button>
        </div>

        {creating && (
          <form onSubmit={createBudget} className="mt-6 rounded-xl border border-sand-300 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Trip name</label>
                <input
                  required value={newBudget.title}
                  onChange={(e) => setNewBudget({ ...newBudget, title: e.target.value })}
                  placeholder="Hill country, September"
                  className={field}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total budget (LKR)</label>
                <input
                  type="number" required value={newBudget.total_budget}
                  onChange={(e) => setNewBudget({ ...newBudget, total_budget: e.target.value })}
                  className={field}
                />
              </div>
              <div />
              <div>
                <label className="text-sm font-medium">Start date</label>
                <input
                  type="date" value={newBudget.start_date}
                  onChange={(e) => setNewBudget({ ...newBudget, start_date: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End date</label>
                <input
                  type="date" value={newBudget.end_date}
                  onChange={(e) => setNewBudget({ ...newBudget, end_date: e.target.value })}
                  className={field}
                />
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Create budget
            </button>
          </form>
        )}

        {budgets.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {budgets.map((b) => (
              <button
                key={b.id}
                onClick={() => setActive(b.id)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  active === b.id ? "bg-brand-600 text-white" : "border border-sand-300 bg-white"
                }`}
              >
                {b.title}
              </button>
            ))}
          </div>
        )}

        {!summary && budgets.length === 0 && !creating && (
          <div className="mt-10 rounded-xl border border-dashed border-sand-300 p-12 text-center">
            <p className="text-ink/60">No budget yet. Create one to start tracking.</p>
          </div>
        )}

        {summary && (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className={`rounded-xl border p-6 ${STATUS_STYLES[summary.status]}`}>
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">{summary.title}</h2>
                  <span className="text-sm">{summary.percent_used}% used</span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-sand-100">
                  <div
                    className={`h-full rounded-full transition-all ${BAR_COLOR[summary.status]}`}
                    style={{ width: `${Math.min(100, summary.percent_used)}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-ink/55">Budget</p>
                    <p className="font-semibold">
                      {summary.currency} {Number(summary.total_budget).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink/55">Spent</p>
                    <p className="font-semibold">
                      {summary.currency} {Number(summary.total_spent).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink/55">Remaining</p>
                    <p className={`font-semibold ${summary.remaining < 0 ? "text-red-600" : "text-brand-600"}`}>
                      {summary.currency} {Number(summary.remaining).toLocaleString()}
                    </p>
                  </div>
                </div>

                {summary.message && (
                  <p className="mt-4 border-t border-current/10 pt-3 text-sm font-medium">
                    {summary.message}
                  </p>
                )}

                {summary.daily_burn && (
                  <p className="mt-2 text-xs opacity-80">
                    Day {summary.days_elapsed} of {summary.days_total} ·{" "}
                    {summary.currency} {Number(summary.daily_burn).toLocaleString()}/day ·
                    projected {summary.currency} {Number(summary.projected_total).toLocaleString()}
                  </p>
                )}
              </div>

              {summary.by_category.length > 0 && (
                <div className="rounded-xl border border-sand-300 bg-white p-5">
                  <h3 className="font-semibold">Where it's going</h3>
                  <div className="mt-4 space-y-3">
                    {summary.by_category.map((c) => (
                      <div key={c.category}>
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{c.category.toLowerCase()}</span>
                          <span className="font-medium">
                            {summary.currency} {Number(c.amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand-100">
                          <div className="h-full rounded-full bg-brand-500"
                               style={{ width: `${c.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-sand-300 bg-white p-5">
                <h3 className="font-semibold">Expenses</h3>
                {summary.expenses.length === 0 ? (
                  <p className="mt-3 text-sm text-ink/55">Nothing logged yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-sand-300">
                    {summary.expenses.map((e) => (
                      <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                        <div>
                          <p className="font-medium capitalize">{e.category.toLowerCase()}</p>
                          <p className="text-xs text-ink/55">
                            {new Date(e.spent_on).toLocaleDateString("en-GB")}
                            {e.note && ` · ${e.note}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {Number(e.amount).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeExpense(e.id)}
                            className="text-xs text-ink/40 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <aside>
              <form onSubmit={addExpense} className="sticky top-24 rounded-xl border border-sand-300 bg-white p-5">
                <h3 className="font-semibold">Add expense</h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={expense.category}
                      onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                      className={field}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0) + c.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount (LKR)</label>
                    <input
                      type="number" required value={expense.amount}
                      onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date" required value={expense.spent_on}
                      onChange={(e) => setExpense({ ...expense, spent_on: e.target.value })}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Note</label>
                    <input
                      value={expense.note}
                      onChange={(e) => setExpense({ ...expense, note: e.target.value })}
                      placeholder="Lunch in Ella"
                      className={field}
                    />
                  </div>
                </div>
                <button className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                  Add expense
                </button>
              </form>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}