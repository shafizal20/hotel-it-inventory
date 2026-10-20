import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";
import { api, errMsg } from "../api";

/* ---------- Types ---------- */
type Category = { category: string; quantity: number; records: number };
type Summary = {
  general_quantity: number;
  general_in_operation: number;
  general_not_in_operation: number;
  categories: Category[];
};
type LocationRow = { location: string; [key: string]: any };
type Operations = { fully_operational: number; partial: number; none_operational: number };
type TimeRange = "today" | "7d" | "30d" | "all";

/* ---------- Constants ---------- */
const NAV_LINKS: [string, string][] = [
  ["/general", "General inventory"],
  ["/deco-room", "Deco Room"],
  ["/ruijie-reyee", "Networking"],
  ["/write-offs", "Write-off"],
  ["/reports", "Reports"],
];

const BRAND_COLORS = ["#475569", "#64748b", "#334155", "#cbd5e1", "#94a3b8"];
const VENDOR_COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];
const OPS_COLORS = { Fully: "#10b981", Partial: "#f59e0b", None: "#ef4444" };

const fmt = (n: number) => new Intl.NumberFormat().format(n ?? 0);

/* ---------- Sub-components ---------- */
function KpiCard({
  label,
  value,
  sub,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "slate" | "purple" | "emerald" | "amber" | "rose";
}) {
  const accents: Record<string, string> = {
    slate: "bg-white border-slate-200 text-slate-900",
    purple: "bg-purple-50/40 border-purple-200 text-purple-950",
    emerald: "bg-emerald-50/40 border-emerald-200 text-emerald-950",
    amber: "bg-amber-50/40 border-amber-200 text-amber-950",
    rose: "bg-rose-50/40 border-rose-200 text-rose-950",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-xs transition-all hover:shadow-sm ${accents[accent]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1.5 text-2xl font-black tracking-tight text-slate-800 tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[11px] font-medium text-slate-500">{sub}</div>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs ${className}`}>
      <div className="mb-3 flex items-baseline justify-between border-b border-slate-100 pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</h2>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="h-14 w-full rounded-xl bg-slate-200" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-80 rounded-xl bg-slate-100 col-span-2" />
        <div className="h-80 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [ops, setOps] = useState<Operations | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false, range: TimeRange = timeRange) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setErr("");
    try {
      const params = { params: { range } };
      const [a, b, c] = await Promise.all([
        api.get("/dashboard/summary", params),
        api.get("/dashboard/by-location", params),
        api.get("/dashboard/operations", params),
      ]);
      setSummary(a.data);
      setLocations(b.data);
      setOps(c.data);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    load(false, timeRange);
  }, [timeRange, load]);

  const locData = useMemo(
    () =>
      locations
        .map((l) => ({
          location: l.location,
          records: Object.entries(l).reduce(
            (sum, [k, v]) => (k === "location" ? sum : sum + (Number(v?.records) || 0)),
            0
          ),
        }))
        .filter((l) => l.records > 0)
        .sort((a, b) => b.records - a.records),
    [locations]
  );

  const opsData = useMemo(
    () =>
      ops
        ? [
            { name: "Fully operational", value: ops.fully_operational, color: OPS_COLORS.Fully },
            { name: "Partial", value: ops.partial, color: OPS_COLORS.Partial },
            { name: "Not operational", value: ops.none_operational, color: OPS_COLORS.None },
          ]
        : [],
    [ops]
  );

  const totalOps = opsData.reduce((a, b) => a + b.value, 0) || 1;
  const healthPct = ops ? Math.round((ops.fully_operational / totalOps) * 100) : 0;
  const isEmpty = summary?.categories.every((c) => !c.records) ?? true;

  // Top categories for the "Top 4" pie (mirrors Design 2's Top 4 Sales Quantity)
  const topCategories = useMemo(() => {
    if (!summary) return [];
    return [...summary.categories]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4)
      .map((c) => ({ name: c.category, value: c.quantity }));
  }, [summary]);

  // Top locations for vendor-style horizontal bar (mirrors Design 2's Top 5 Vendors)
  const topLocations = useMemo(() => locData.slice(0, 5), [locData]);

  if (loading) return <Skeleton />;

  if (err)
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 max-w-md mx-auto mt-10 text-center">
        <div className="font-semibold text-red-700">Failed to load inventory data</div>
        <p className="mt-1 text-sm text-red-600">{err}</p>
        <button onClick={() => load()} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white">
          Retry
        </button>
      </div>
    );

  if (!summary || !ops) return null;

  return (
    <div className="space-y-4 bg-slate-100/60 p-4 min-h-screen text-slate-800">
      {/* ===== Top Banner / Title Header (dark, like Design 2) ===== */}
      <header className="flex flex-wrap items-center justify-between rounded-xl bg-slate-800 px-5 py-3 text-white shadow-xs">
        <div>
          <h1 className="text-base font-bold tracking-wide uppercase">Inventory Management</h1>
          <p className="text-[11px] text-slate-400">Enterprise BI Dashboard &amp; Analytics View</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Time filter tabs (kept from Design 1, restyled) */}
          <div className="inline-flex rounded-lg bg-slate-700 p-0.5 text-[11px] font-medium text-slate-300">
            {(["today", "7d", "30d", "all"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  timeRange === r ? "bg-slate-600 text-white font-semibold" : "hover:text-white"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "7D" : r === "30d" ? "30D" : "All"}
              </button>
            ))}
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-slate-400">
              Synced: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </header>

      {/* ===== Navigation Links (restyled pill row) ===== */}
      <nav className="flex flex-wrap gap-2">
        {NAV_LINKS.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 transition"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* ===== TOP ROW: Inventory Analysis | KPI | Stock Reorder | Selection ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Inventory Analysis Section — replaces the two tiny mock charts with real category/ops data */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-4">
          <SectionCard title="Inventory Analysis" subtitle="Category & Operational Status">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Quantity by Category</div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.categories} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="category" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="quantity" radius={[3, 3, 0, 0]}>
                        {summary.categories.map((_, i) => (
                          <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Top 4 Categories by Quantity</div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topCategories} dataKey="value" nameKey="name" innerRadius={22} outerRadius={38}>
                        {topCategories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* KPI Panel — real summary numbers in a 2x2 grid (matches Design 2's KPI block) */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
          <KpiCard label="General Qty" value={fmt(summary.general_quantity)} accent="slate" />
          <KpiCard label="Categories" value={summary.categories.length} accent="purple" />
          <KpiCard label="In Operation" value={fmt(summary.general_in_operation)} accent="emerald" />
          <KpiCard label="Not Operating" value={fmt(summary.general_not_in_operation)} accent="rose" />
        </div>

        {/* Stock Reorder Panel — repurposed as "Operational Health" gauge card */}
        <div className="lg:col-span-2">
          <SectionCard title="Operational Health" className="h-full flex flex-col justify-between">
            <div className="text-center py-2">
              <div className="text-2xl font-extrabold text-purple-700">{healthPct}%</div>
              <div className="text-[11px] text-slate-400">
                {fmt(ops.fully_operational)} of {fmt(totalOps)} fully operational
              </div>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: ops.fully_operational }, { value: ops.partial + ops.none_operational }]}
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={20}
                    outerRadius={32}
                  >
                    <Cell fill="#7c3aed" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Selection Filters Panel — restyled, no mock filter values (shows range + counts) */}
        <div className="lg:col-span-2">
          <SectionCard title="Selection" subtitle="Filters">
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                <select className="w-full mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs">
                  <option value="All">All ({summary.categories.length})</option>
                  {summary.categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({c.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                <select className="w-full mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs">
                  <option value="All">All ({locData.length})</option>
                  {locData.map((l) => (
                    <option key={l.location} value={l.location}>
                      {l.location} ({l.records})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ===== BOTTOM SECTION: Matrix Tables | Warehouse Donuts | Vendor Bars ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Category Breakdown Table — replaces ABC/XYZ matrix with real category data */}
        <div className="lg:col-span-4 space-y-4">
          <SectionCard title="Category Breakdown" subtitle="Records & Quantity">
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold text-slate-600 mb-1">Quantity Split</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700">
                        <th className="p-1">Category</th>
                        <th className="p-1">Quantity</th>
                        <th className="p-1">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.categories.map((c, i) => (
                        <tr key={c.category}>
                          <td className="font-semibold p-1 truncate max-w-[100px]">{c.category}</td>
                          <td className="p-1 tabular-nums" style={{ background: `${BRAND_COLORS[i % BRAND_COLORS.length]}1a` }}>
                            {fmt(c.quantity)}
                          </td>
                          <td className="p-1 tabular-nums">{fmt(c.records)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Warehouse Status Donuts — real operational & location distribution */}
        <div className="lg:col-span-4 space-y-4">
          <SectionCard title="Warehouse Status - Operational" subtitle="Distribution by status">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={opsData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} label>
                    {opsData.map((d, index) => (
                      <Cell key={`cell-${index}`} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Warehouse Status - Records" subtitle="Units per location">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={locData} dataKey="records" nameKey="location" innerRadius={40} outerRadius={65} label>
                    {locData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Vendor Status Bars — replaced with top-location horizontal bars */}
        <div className="lg:col-span-4 space-y-4">
          <SectionCard title="Top Locations" subtitle="Top 5 - Records">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topLocations} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={10} allowDecimals={false} />
                  <YAxis dataKey="location" type="category" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="records" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Top Categories" subtitle="Top 5 - Quantity">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topCategories} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={10} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" fill="#475569" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}