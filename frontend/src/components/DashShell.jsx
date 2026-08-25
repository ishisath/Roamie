import Navbar from "./Navbar";

export function DashShell({ eyebrow, title, subtitle, tabs, tab, setTab, badges = {}, children }) {
  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="border-b border-sand-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 pt-10">
          <p className="eyebrow text-brand-600">{eyebrow}</p>
          <h1 className="headline mt-2 text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}

          <div className="mt-7 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {t}
                {badges[t] > 0 && (
                  <span className="rounded-full bg-saffron-500 px-1.5 py-0.5 text-[10px] font-bold text-night-900">
                    {badges[t]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

export function Panel({ title, sub, action, className = "", children }) {
  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
            {sub && <p className="mt-0.5 text-sm text-ink-soft">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, prefix, delta, tone = "brand" }) {
  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-5">
      <p className="eyebrow text-ink-soft">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold tracking-tight ${
        tone === "saffron" ? "text-saffron-600" : tone === "plain" ? "text-ink" : "text-brand-600"
      }`}>
        {prefix && <span className="mr-1 text-base font-medium text-ink-soft">{prefix}</span>}
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {delta && <p className="mt-1 text-xs text-ink-soft">{delta}</p>}
    </div>
  );
}

export function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-sand-100 text-ink-soft",
    brand: "bg-brand-50 text-brand-700",
    saffron: "bg-saffron-100 text-saffron-600",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-[14px] border border-dashed border-sand-300 p-14 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}