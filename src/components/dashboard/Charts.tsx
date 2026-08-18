import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { myr } from "@/lib/dashboard";
import { useCopy } from "@/lib/i18n/dict";
import { shellCopy } from "@/lib/i18n/app/shell.i18n";

type Point = { month: string; leads: number; bookings: number; revenue: number };

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; dataKey?: string | number; value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="text-muted-foreground">
          {item.name}:{" "}
          <span className="font-semibold text-foreground">
            {item.dataKey === "revenue" ? myr(Number(item.value)) : item.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function SalesPerformanceChart({ data }: { data: Point[] }) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260} minWidth={0}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} />
        <Bar
          dataKey="revenue"
          name={t.revenue}
          fill="var(--color-chart-1)"
          radius={[6, 6, 0, 0]}
          maxBarSize={38}
        />
        <Line
          dataKey="bookings"
          name={t.bookings}
          type="monotone"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
          yAxisId={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MonthlyAnalyticsChart({ data }: { data: Point[] }) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260} minWidth={0}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          dataKey="leads"
          name={t.leads}
          type="monotone"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#leadsFill)"
        />
        <Area
          dataKey="bookings"
          name={t.bookings}
          type="monotone"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          fill="url(#bookingsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
