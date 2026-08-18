import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";

import { myr } from "@/lib/dashboard";
import { useCopy } from "@/lib/i18n/dict";
import { shellCopy } from "@/lib/i18n/app/shell.i18n";

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Box({
  label,
  rows,
}: {
  label?: string | number | undefined;
  rows: Array<{ name: string; value: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      {label !== undefined ? (
        <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      ) : null}
      {rows.map((row) => (
        <p key={row.name} className="text-muted-foreground">
          {row.name}: <span className="font-semibold text-foreground">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

type TooltipProps = {
  active?: boolean | undefined;
  label?: unknown;
  payload?: unknown;
};

function makeTooltip(format: (key: string, value: number) => string) {
  return function ChartTooltip(props: TooltipProps) {
    const items = (props.payload ?? []) as Array<{
      name?: string;
      dataKey?: string | number;
      value?: number | string;
    }>;
    if (!props.active || !items.length) return null;
    const label = props.label as string | number | undefined;
    return (
      <Box
        label={label}
        rows={items.map((p) => ({
          name: String(p.name ?? p.dataKey),
          value: format(String(p.dataKey), Number(p.value)),
        }))}
      />
    );
  };
}

const countTooltip = makeTooltip((_k, v) => String(v));
const mixedTooltip = makeTooltip((k, v) =>
  k === "revenue" ? myr(v) : k === "conversion" ? `${v}%` : String(v),
);

export function ConversionFunnelChart({
  data,
}: {
  data: Array<{ stage: string; leads: number; rate: number }>;
}) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" width={86} {...axisProps} />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.25 }}
          content={makeTooltip((k, v) => (k === "rate" ? `${v}%` : String(v))) as never}
        />
        <Bar dataKey="leads" name={t.leads} radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopPackagesChart({
  data,
}: {
  data: Array<{ name: string; bookings: number; revenue: number }>;
}) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          {...axisProps}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <YAxis type="category" dataKey="name" width={120} {...axisProps} />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.25 }}
          content={makeTooltip((k, v) => (k === "revenue" ? myr(v) : String(v))) as never}
        />
        <Bar
          dataKey="revenue"
          name={t.revenue}
          fill="var(--color-chart-1)"
          radius={[0, 6, 6, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadSourceChart({
  data,
}: {
  data: Array<{ source: string; leads: number; booked: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="leads"
          nameKey="source"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
          stroke="var(--color-background)"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Tooltip content={countTooltip as never} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BookingTrendChart({
  data,
}: {
  data: Array<{ month: string; bookings: number; pax: number }>;
}) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="bookingTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip content={countTooltip as never} />
        <Area
          dataKey="bookings"
          name={t.bookings}
          type="monotone"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#bookingTrendFill)"
        />
        <Area
          dataKey="pax"
          name={t.pilgrims}
          type="monotone"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          fillOpacity={0}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueConversionChart({
  data,
}: {
  data: Array<{ month: string; revenue: number; conversion: number }>;
}) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis
          yAxisId="left"
          {...axisProps}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          {...axisProps}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.25 }}
          content={mixedTooltip as never}
        />
        <Bar
          yAxisId="left"
          dataKey="revenue"
          name={t.revenue}
          fill="var(--color-chart-1)"
          radius={[6, 6, 0, 0]}
          maxBarSize={34}
        />
        <Line
          yAxisId="right"
          dataKey="conversion"
          name={t.conversion}
          type="monotone"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function FollowupPerformanceChart({
  data,
}: {
  data: Array<{ month: string; sent: number; pending: number; skipped: number }>;
}) {
  const t = useCopy(shellCopy).charts;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.25 }}
          content={countTooltip as never}
        />
        <Bar dataKey="sent" name={t.sent} stackId="f" fill="var(--color-chart-1)" maxBarSize={34} />
        <Bar dataKey="pending" name={t.pending} stackId="f" fill="var(--color-chart-3)" />
        <Bar
          dataKey="skipped"
          name={t.skipped}
          stackId="f"
          fill="var(--color-chart-4)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
