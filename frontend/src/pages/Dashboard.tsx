import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, errMsg } from "../api";

export default function Dashboard() {
  const [s, setS] = useState<any>(null), [loc, setLoc] = useState<any[]>([]), [ops, setOps] = useState<any>(null), [err, setErr] = useState("");
  useEffect(() => {
    Promise.all([api.get("/dashboard/summary"), api.get("/dashboard/by-location"), api.get("/dashboard/operations")])
      .then(([a, b, c]) => { setS(a.data); setLoc(b.data); setOps(c.data); }).catch(e => setErr(errMsg(e)));
  }, []);
  if (err) return <p role="alert" className="text-red-600">{err}</p>;
  if (!s) return <p className="text-slate-500">Loading…</p>;
  const Card = ({ t, v, sub }: { t: string; v: number; sub?: string }) => <div className="card"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div>{sub && <div className="text-xs text-slate-400">{sub}</div>}</div>;
  const locData = loc.map(l => ({ location: l.location, records: Object.values(l).reduce((a: number, x: any) => a + (x?.records ?? 0), 0) }));
  const empty = s.categories.every((c: any) => !c.records);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <div className="no-print flex flex-wrap gap-2">
        {[["/general", "General inventory"], ["/deco-room", "Deco Room"], ["/ruijie-reyee", "Networking"], ["/write-offs", "Write-off"], ["/reports", "Reports"]].map(([to, l]) => <Link key={to} className="btn-ghost" to={to}>{to === "/reports" ? "" : "+ "}{l}</Link>)}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card t="General quantity" v={s.general_quantity} /><Card t="In operation" v={s.general_in_operation} /><Card t="Not in operation" v={s.general_not_in_operation} />
        {s.categories.map((c: any) => <Card key={c.category} t={c.category} v={c.quantity} sub={`${c.records} records`} />)}
      </div>
      {empty ? <p className="card text-slate-500">No inventory records yet.</p> : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="card"><h2 className="mb-2 text-sm font-medium">Quantity by category (not summed across tables)</h2>
            <ResponsiveContainer width="100%" height={240}><BarChart data={s.categories}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" fontSize={11} /><YAxis /><Tooltip /><Bar dataKey="quantity" fill="#1e293b" /></BarChart></ResponsiveContainer></div>
          <div className="card"><h2 className="mb-2 text-sm font-medium">Records by location</h2>
            <ResponsiveContainer width="100%" height={240}><BarChart data={locData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="location" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="records" fill="#475569" /></BarChart></ResponsiveContainer></div>
          <div className="card"><h2 className="mb-2 text-sm font-medium">General inventory operational distribution (records)</h2>
            <ResponsiveContainer width="100%" height={240}><BarChart data={[{ n: "Fully", v: ops.fully_operational }, { n: "Partial", v: ops.partial }, { n: "None", v: ops.none_operational }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="n" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="v" fill="#334155" /></BarChart></ResponsiveContainer></div>
        </div>)}
    </div>
  );
}
