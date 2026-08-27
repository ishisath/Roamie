import Navbar from "./Navbar";

export function DashShell({ eyebrow, title, subtitle, tabs, tab, setTab,
                            badges = {}, right, backdrop, children }) {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar overlay />

      <div className="relative overflow-hidden border-b border-white/8">
        {/* photo wash */}
                <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700/25 via-slate-900 to-slate-900" />
          {backdrop && (
            <img src={backdrop} alt=""
                 className="absolute inset-0 h-full w-full object-cover opacity-[0.13]" />
          )}
          <div className="pointer-events-none absolute -left-24 -top-16 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-10 -top-10 h-64 w-64 rounded-full bg-saffron-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[86rem] px-6 pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-saffron-400">{eyebrow}</p>
              <h1 className="headline mt-2 text-[2.75rem] leading-none text-white">
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-sm text-white/50">{subtitle}</p>}
            </div>
            {right}
          </div>

          <div className="no-scrollbar mt-9 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t ? "text-white" : "text-white/45 hover:text-white/80"
                }`}
              >
                {t}
                {badges[t] > 0 && (
                  <span className="rounded-full bg-saffron-500 px-1.5 py-0.5 text-[10px] font-bold text-night-900">
                    {badges[t]}
                  </span>
                )}
                {tab === t && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-saffron-400" />
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
    <section className={`overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 backdrop-blur ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            {title && (
              <h2 className="font-display text-[0.95rem] font-semibold text-white">
                {title}
              </h2>
            )}
            {sub && <p className="mt-0.5 text-xs text-white/45">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={pad ? "p-6" : ""}>{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, prefix, delta, deltaLabel, spark, tone = "default" }) {
  const flat = delta === 0 || delta === undefined || delta === null;
  const up = delta > 0;

  const accent = {
    default: "text-white",
    saffron: "text-saffron-400",
    brand: "text-brand-200",
  }[tone];

  const stroke = tone === "saffron" ? "#F0B44A" : "#9CC4B2";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 p-5 backdrop-blur">
      <p className="eyebrow text-white/40">{label}</p>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={`font-display text-[1.75rem] font-bold leading-none tracking-tight ${accent}`}>
          {prefix && <span className="mr-1 text-sm font-medium text-white/40">{prefix}</span>}
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>

        {!flat && (
          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            up ? "bg-brand-500/25 text-brand-200" : "bg-red-500/20 text-red-300"
          }`}>
            {up ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </div>

      {deltaLabel && <p className="mt-1 text-[11px] text-white/40">{deltaLabel}</p>}

      {spark?.length > 1 && (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none"
             className="mt-3 h-7 w-full overflow-visible">
          <polyline
            points={spark.map((v, i) => {
              const max = Math.max(...spark, 1);
              const min = Math.min(...spark, 0);
              const y = 26 - ((v - min) / (max - min || 1)) * 24;
              return `${(i / (spark.length - 1)) * 100},${y}`;
            }).join(" ")}
            fill="none" stroke={stroke} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

/* Big coloured tile — for the numbers that matter most */
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

export function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-white/10 text-white/70",
    brand: "bg-brand-500/25 text-brand-200",
    saffron: "bg-saffron-500/20 text-saffron-400",
    danger: "bg-red-500/20 text-red-300",
    info: "bg-sky-500/25 text-sky-100",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function RankBars({ items, prefix = "", emptyText = "Nothing yet" }) {
  if (!items.length) {
    return <p className="py-10 text-center text-sm text-white/40">{emptyText}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-[11px] text-white/35">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-sm text-white/85">{it.name}</span>
            </span>
            <span className="shrink-0 font-display text-sm font-semibold text-white">
              {prefix}{it.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-saffron-500 transition-[width] duration-700"
                 style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          {it.sub && <p className="mt-1 text-[11px] text-white/35">{it.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

export function Funnel({ stages }) {
  const top = stages[0]?.value || 1;
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const pct = Math.round((s.value / top) * 100);
        const prev = i > 0 ? stages[i - 1].value : null;
        const drop = prev ? Math.round(((prev - s.value) / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55">{s.label}</span>
              <span className="font-display font-semibold text-white">{s.value}</span>
            </div>
            <div className="mt-1 h-8 overflow-hidden rounded-lg bg-white/8">
              <div className="flex h-full items-center rounded-lg bg-gradient-to-r from-brand-600 via-brand-500 to-saffron-500 px-3 transition-[width] duration-700"
                   style={{ width: `${Math.max(pct, 8)}%` }}>
                <span className="text-[11px] font-bold text-white">{pct}%</span>
              </div>
            </div>
            {drop !== null && drop > 0 && (
              <p className="mt-0.5 text-[11px] text-white/35">−{drop}% from previous</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function QueueRow({ colour = "sky", title, meta, children, actions }) {
  const bars = {
    sky: "bg-sky-500", plum: "bg-plum-500", clay: "bg-clay-500",
    saffron: "bg-saffron-500", brand: "bg-brand-500",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-slate-800/70 backdrop-blur">
      <span className={`absolute inset-y-0 left-0 w-1 ${bars[colour]}`} />
      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display font-semibold text-white">{title}</p>
            {meta && <p className="mt-0.5 text-sm text-white/50">{meta}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 p-14 text-center">
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/45">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* Key/value list — readable on dark */
export function FactList({ items }) {
  return (
    <dl className="space-y-3.5">
      {items.map(([k, v]) => (
        <div key={k}
             className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-3 last:border-0 last:pb-0">
          <dt className="text-sm text-white/55">{k}</dt>
          <dd className="font-display font-semibold text-white">{v}</dd>
        </div>
      ))}
    </dl>
  );
}