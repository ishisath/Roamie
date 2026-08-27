import Navbar from "./Navbar";

export function DashShell({ eyebrow, title, subtitle, tabs, tab, setTab, badges = {}, right, children }) {
  return (
    <div className="min-h-screen bg-[#F1EEE6]">
      <Navbar />

      <div className="border-b border-sand-200 bg-white">
        <div className="mx-auto max-w-[86rem] px-6 pt-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-brand-600">{eyebrow}</p>
              <h1 className="headline mt-1.5 text-[2.5rem] leading-none">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
            </div>
            {right}
          </div>

          <div className="mt-8 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t ? "text-ink" : "text-ink-soft/70 hover:text-ink"
                }`}
              >
                {t}
                {badges[t] > 0 && (
                  <span className="rounded-full bg-saffron-500 px-1.5 py-0.5 text-[10px] font-bold text-night-900">
                    {badges[t]}
                  </span>
                )}
                {tab === t && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[86rem] px-6 py-7">{children}</main>
    </div>
  );
}

export function Panel({ title, sub, action, pad = true, className = "", children }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-sand-200 bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            {title && <h2 className="font-display text-[0.95rem] font-semibold">{title}</h2>}
            {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={pad ? "p-6" : ""}>{children}</div>
    </section>
  );
}

/* Metric with sparkline + period comparison */
export function MetricCard({ label, value, prefix, delta, deltaLabel, spark, tone = "default" }) {
  const up = delta > 0;
  const flat = delta === 0 || delta === undefined || delta === null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sand-200 bg-white p-5">
      <p className="eyebrow text-ink-soft">{label}</p>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={`font-display text-[1.75rem] font-bold leading-none tracking-tight ${
          tone === "saffron" ? "text-saffron-600" : "text-ink"
        }`}>
          {prefix && <span className="mr-1 text-sm font-medium text-ink-soft">{prefix}</span>}
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>

        {!flat && (
          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            up ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600"
          }`}>
            {up ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </div>

      {deltaLabel && <p className="mt-1 text-[11px] text-ink-soft">{deltaLabel}</p>}

      {spark?.length > 1 && (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none"
             className="mt-3 h-7 w-full overflow-visible">
          <polyline
            points={spark
              .map((v, i) => {
                const max = Math.max(...spark, 1);
                const min = Math.min(...spark, 0);
                const y = 26 - ((v - min) / (max - min || 1)) * 24;
                return `${(i / (spark.length - 1)) * 100},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={tone === "saffron" ? "#E39A22" : "#14523F"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

export function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-sand-100 text-ink-soft",
    brand: "bg-brand-50 text-brand-700",
    saffron: "bg-saffron-100 text-saffron-600",
    danger: "bg-red-50 text-red-600",
    info: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* Horizontal ranked bars — better than a pie for "which earns most" */
export function RankBars({ items, prefix = "", emptyText = "Nothing yet" }) {
  if (!items.length) {
    return <p className="py-10 text-center text-sm text-ink-soft">{emptyText}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-[11px] text-ink-soft">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-sm">{it.name}</span>
            </span>
            <span className="shrink-0 font-display text-sm font-semibold">
              {prefix}{it.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-700"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
          {it.sub && <p className="mt-1 text-[11px] text-ink-soft">{it.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/* Funnel — conversion between stages */
export function Funnel({ stages }) {
  const top = stages[0]?.value || 1;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = Math.round((s.value / top) * 100);
        const prev = i > 0 ? stages[i - 1].value : null;
        const drop = prev ? Math.round(((prev - s.value) / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{s.label}</span>
              <span className="font-display font-semibold">{s.value}</span>
            </div>
            <div className="mt-1 h-8 overflow-hidden rounded-lg bg-sand-100">
              <div
                className="flex h-full items-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3 transition-[width] duration-700"
                style={{ width: `${Math.max(pct, 6)}%` }}
              >
                <span className="text-[11px] font-semibold text-white">{pct}%</span>
              </div>
            </div>
            {drop !== null && drop > 0 && (
              <p className="mt-0.5 text-[11px] text-ink-soft">−{drop}% from previous stage</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 p-14 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* Coloured metric tile — admin only, colour carries meaning */
export function SignalCard({ label, value, prefix, sub, colour = "brand", icon }) {
  const skins = {
    brand:   "from-brand-600 to-brand-700 text-white",
    saffron: "from-saffron-400 to-saffron-600 text-night-900",
    sky:     "from-sky-500 to-sky-600 text-white",
    plum:    "from-plum-500 to-plum-600 text-white",
    clay:    "from-clay-500 to-clay-600 text-white",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ${skins[colour]}`}>
      <p className="eyebrow opacity-70">{label}</p>
      <p className="mt-2 font-display text-[1.9rem] font-bold leading-none tracking-tight">
        {prefix && <span className="mr-1 text-sm font-medium opacity-70">{prefix}</span>}
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-1.5 text-xs opacity-70">{sub}</p>}
      {icon && (
        <span className="pointer-events-none absolute -right-3 -top-3 text-6xl opacity-15">
          {icon}
        </span>
      )}
    </div>
  );
}

/* Action queue row — used for verification and approval lists */
export function QueueRow({ colour = "sky", title, meta, children, actions }) {
  const bars = {
    sky: "bg-sky-500", plum: "bg-plum-500", clay: "bg-clay-500",
    saffron: "bg-saffron-500", brand: "bg-brand-600",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <span className={`absolute inset-y-0 left-0 w-1 ${bars[colour]}`} />
      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display font-semibold">{title}</p>
            {meta && <p className="mt-0.5 text-sm text-ink-soft">{meta}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
