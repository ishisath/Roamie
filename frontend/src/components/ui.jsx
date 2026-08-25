export function Card({ className = "", children, ...rest }) {
  return (
    <div
      className={`rounded-[14px] border border-sand-200 bg-white shadow-[0_1px_2px_rgba(20,32,27,0.04)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = "" }) {
  return <p className={`eyebrow text-brand-600 ${className}`}>{children}</p>;
}

export function SectionHead({ eyebrow, title, sub, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="headline mt-2 text-3xl sm:text-4xl">{title}</h2>
        {sub && <p className="mt-2 max-w-lg text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-sand-100 text-ink-soft",
    brand: "bg-brand-50 text-brand-700",
    saffron: "bg-saffron-100 text-saffron-600",
    danger: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, unit, tone = "brand" }) {
  return (
    <Card className="p-5">
      <p className="eyebrow text-ink-soft">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold tracking-tight ${
        tone === "brand" ? "text-brand-600" : "text-ink"
      }`}>
        {unit && <span className="mr-1 text-base font-medium text-ink-soft">{unit}</span>}
        {value}
      </p>
    </Card>
  );
}

export function Button({ variant = "primary", className = "", children, ...rest }) {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    accent: "bg-saffron-500 text-night-900 hover:bg-saffron-400",
    ghost: "border border-sand-300 bg-white hover:bg-sand-100",
    dark: "bg-white/10 text-white backdrop-blur hover:bg-white/20",
  };
  return (
    <button
      className={`rounded-lg px-5 py-2.5 text-sm font-medium transition disabled:opacity-60 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* Rail — for genuine sequences only */
export function Rail({ children }) {
  return <ol className="rail space-y-4">{children}</ol>;
}

export function RailStop({ state = "todo", children }) {
  const cls = state === "done" ? "rail-stop--done" : state === "next" ? "rail-stop--next" : "";
  return <li className={`rail-stop relative ${cls}`}>{children}</li>;
}