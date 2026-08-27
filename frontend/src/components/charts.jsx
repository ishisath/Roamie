import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const GREEN = "#9CC4B2";
const SAFFRON = "#F0B44A";
const GRID = "rgba(255,255,255,0.07)";
const AXIS = "rgba(255,255,255,0.4)";

export const PALETTE = [GREEN, SAFFRON, "#7FB3C8", "#B98FC4", "#D98B68", "#A8C47E"];
export const ADMIN_PALETTE = PALETTE;

function ChartTip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/12 bg-slate-800 px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-display text-sm font-semibold text-white">
          {prefix}{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data, xKey, yKey, prefix = "", height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAFFRON} stopOpacity={0.35} />
            <stop offset="100%" stopColor={SAFFRON} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTip prefix={prefix} />} />
        <Area type="monotone" dataKey={yKey} stroke={SAFFRON} strokeWidth={2.5}
              fill="url(#fillArea)" dot={{ fill: SAFFRON, r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({ data, xKey, yKey, prefix = "", height = 240, accent }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="fillBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAFFRON} />
            <stop offset="100%" stopColor={GREEN} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTip prefix={prefix} />} />
        <Bar dataKey={yKey} fill="url(#fillBar)" radius={[6, 6, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SplitChart({ data, nameKey, valueKey, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey}
             innerRadius="58%" outerRadius="84%" paddingAngle={3} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTip prefix="LKR " />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StackedChart({ data, xKey, series, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTip />} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} stackId="a"
               fill={PALETTE[i % PALETTE.length]}
               radius={i === series.length - 1 ? [6, 6, 0, 0] : 0}
               maxBarSize={44} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}