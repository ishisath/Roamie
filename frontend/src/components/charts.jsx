import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const GREEN = "#14523F";
const SAFFRON = "#E39A22";
const GRID = "#DFD8C6";
const AXIS = "#4A5952";

export const PALETTE = [GREEN, SAFFRON, "#1B5E4A", "#F0B44A", "#9CC4B2", "#C07B10"];

function ChartTip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-sand-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs text-ink-soft">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-display text-sm font-semibold text-ink">
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
          <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTip prefix={prefix} />} />
        <Area type="monotone" dataKey={yKey} stroke={GREEN} strokeWidth={2.5}
              fill="url(#fillGreen)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({ data, xKey, yKey, prefix = "", height = 240, accent }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(20,82,63,0.05)" }} content={<ChartTip prefix={prefix} />} />
        <Bar dataKey={yKey} fill={accent ? SAFFRON : GREEN} radius={[6, 6, 0, 0]} maxBarSize={42} />
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