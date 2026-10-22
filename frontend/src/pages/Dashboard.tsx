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
import austinLogo from "../image/austin.png";

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

// Austin Park Hotel palette (browns & golds)
const BRAND_COLORS = ["#5a3218", "#7a4a1e", "#b8862b", "#c9a13b", "#e8d9a8"];
const VENDOR_COLORS = ["#5a3218", "#7a4a1e", "#b8862b", "#c9a13b", "#e8d9a8"];
const OPS_COLORS = { Fully: "#7a4a1e", Partial: "#b8862b", None: "#a0522d" };

const TOOLTIP_STYLE = {
  borderRadius: 8,
  fontSize: 11,
  background: "#fdfaf3",
  border: "1px solid #c9a13b",
  color: "#5a3218",
};

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
    slate: "bg-[#faf6ef] border-[#e8d9a8] text-[#5a3218]",
    purple: "bg-[#f5eee2] border-[#c9a13b] text-[#5a3218]",
    emerald: "bg-[#f3ecd9] border-[#b8862b] text-[#5a3218]",
    amber: "bg-[#faf3e4] border-[#c9a13b] text-[#7a4a1e]",
    rose: "bg-[#f5e8e0] border-[#a0522d] text-[#5a3218]",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${accents[accent]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#a08a6a]">{label}</div>
      <div className="mt-1.5 text-2xl font-black tracking-tight text-[#5a3218] tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[11px] font-medium text-[#8a6a4a]">{sub}</div>}
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
    <div className={`rounded-xl border border-[#e8d9a8]/80 bg-[#fdfaf3] p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-baseline justify-between border-b border-[#e8d9a8] pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#5a3218]">{title}</h2>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-[11px] text-[#a08a6a]">{subtitle}</span>}
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
      <div className="h-14 w-full rounded-xl bg-[#e8d9a8]" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[#f5eee2]" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-80 rounded-xl bg-[#f5eee2] col-span-2" />
        <div className="h-80 rounded-xl bg-[#f5eee2]" />
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

  // Top categories for the "Top 4" pie
  const topCategories = useMemo(() => {
    if (!summary) return [];
    return [...summary.categories]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4)
      .map((c) => ({ name: c.category, value: c.quantity }));
  }, [summary]);

  // Top locations for vendor-style horizontal bar
  const topLocations = useMemo(() => locData.slice(0, 5), [locData]);

  if (loading) return <Skeleton />;

  if (err)
    return (
      <div role="alert" className="rounded-xl border border-[#a0522d] bg-[#f5e8e0] p-6 max-w-md mx-auto mt-10 text-center">
        <div className="font-semibold text-[#5a3218]">Failed to load inventory data</div>
        <p className="mt-1 text-sm text-[#a0522d]">{err}</p>
        <button onClick={() => load()} className="mt-3 rounded-lg bg-[#7a4a1e] px-4 py-1.5 text-xs font-semibold text-[#faf6ef] hover:bg-[#5a3218] transition">
          Retry
        </button>
      </div>
    );

  if (!summary || !ops) return null;

  return (
    <div className="space-y-4 bg-[#f2ead9] p-4 min-h-screen text-[#3d2410]">
      {/* ===== Top Banner / Title Header (Austin Park Hotel branding) ===== */}
      <header className="flex flex-wrap items-center justify-between rounded-xl bg-[#5a3218] px-5 py-3 text-[#faf6ef] shadow-md">
        <div className="flex items-center gap-4">
          <img
            src={austinLogo}
            alt="Austin Park Hotel"
            className="h-12 w-auto rounded bg-white/95 p-1"
          />
          <div>
            <h1 className="text-base font-bold tracking-wide uppercase">Austin Park IT Inventory</h1>
            <p className="text-[11px] text-[#e8d9a8]">Enterprise BI Dashboard &amp; Analytics View</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Time filter tabs */}
          <div className="inline-flex rounded-lg bg-[#7a4a1e] p-0.5 text-[11px] font-medium text-[#e8d9a8]">
            {(["today", "7d", "30d", "all"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  timeRange === r ? "bg-[#b8862b] text-white font-semibold" : "hover:text-white"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "7D" : r === "30d" ? "30D" : "All"}
              </button>
            ))}
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-[#e8d9a8]">
              Synced: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-lg bg-[#7a4a1e] px-3 py-1 text-xs font-medium text-[#e8d9a8] hover:bg-[#b8862b] disabled:opacity-50 transition"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </header>

      {/* ===== Navigation Links (branded pill row) ===== */}
      <nav className="flex flex-wrap gap-2">
        {NAV_LINKS.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-1.5 text-xs font-semibold text-[#7a4a1e] shadow-sm hover:bg-[#f5eee2] hover:border-[#c9a13b] transition"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* ===== TOP ROW: Inventory Analysis | KPI | Stock Reorder | Selection ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Inventory Analysis Section */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-4">
          <SectionCard title="Inventory Analysis" subtitle="Category & Operational Status">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-[#8a6a4a] mb-1">Quantity by Category</div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.categories} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="category" fontSize={9} tickLine={false} axisLine={false} stroke="#a08a6a" />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} stroke="#a08a6a" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
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
                <div className="text-[11px] font-semibold text-[#8a6a4a] mb-1">Top 4 Categories by Quantity</div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topCategories} dataKey="value" nameKey="name" innerRadius={22} outerRadius={38}>
                        {topCategories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* KPI Panel */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
          <KpiCard label="General Qty" value={fmt(summary.general_quantity)} accent="slate" />
          <KpiCard label="Categories" value={summary.categories.length} accent="purple" />
          <KpiCard label="In Operation" value={fmt(summary.general_in_operation)} accent="emerald" />
          <KpiCard label="Not Operating" value={fmt(summary.general_not_in_operation)} accent="rose" />
        </div>

        {/* Operational Health Gauge */}
        <div className="lg:col-span-2">
          <SectionCard title="Operational Health" className="h-full flex flex-col justify-between">
            <div className="text-center py-2">
              <div className="text-2xl font-extrabold text-[#7a4a1e]">{healthPct}%</div>
              <div className="text-[11px] text-[#a08a6a]">
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
                    <Cell fill="#5a3218" />
                    <Cell fill="#e8d9a8" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Selection Filters Panel */}
        <div className="lg:col-span-2">
          <SectionCard title="Selection" subtitle="Filters">
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#8a6a4a] uppercase">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full mt-0.5 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] p-1.5 text-xs text-[#5a3218]"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8a6a4a] uppercase">Category</label>
                <select className="w-full mt-0.5 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] p-1.5 text-xs text-[#5a3218]">
                  <option value="All">All ({summary.categories.length})</option>
                  {summary.categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({c.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8a6a4a] uppercase">Location</label>
                <select className="w-full mt-0.5 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] p-1.5 text-xs text-[#5a3218]">
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
        {/* Category Breakdown Table */}
        <div className="lg:col-span-4 space-y-4">
          <SectionCard title="Category Breakdown" subtitle="Records & Quantity">
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold text-[#5a3218] mb-1">Quantity Split</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="bg-[#e8d9a8] text-[#5a3218]">
                        <th className="p-1">Category</th>
                        <th className="p-1">Quantity</th>
                        <th className="p-1">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8d9a8]/60">
                      {summary.categories.map((c, i) => (
                        <tr key={c.category}>
                          <td className="font-semibold p-1 truncate max-w-[100px] text-[#5a3218]">{c.category}</td>
                          <td
                            className="p-1 tabular-nums"
                            style={{ background: `${BRAND_COLORS[i % BRAND_COLORS.length]}1a` }}
                          >
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

        {/* Warehouse Status Donuts */}
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
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
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
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Top Locations & Categories Bars */}
        <div className="lg:col-span-4 space-y-4">
          <SectionCard title="Top Locations" subtitle="Top 5 - Records">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topLocations} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8d9a8" />
                  <XAxis type="number" fontSize={10} allowDecimals={false} stroke="#a08a6a" />
                  <YAxis dataKey="location" type="category" fontSize={10} width={80} stroke="#a08a6a" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="records" fill="#7a4a1e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Top Categories" subtitle="Top 5 - Quantity">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topCategories} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8d9a8" />
                  <XAxis type="number" fontSize={10} allowDecimals={false} stroke="#a08a6a" />
                  <YAxis dataKey="name" type="category" fontSize={10} width={80} stroke="#a08a6a" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#b8862b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}