import { useState } from "react";
import { Download } from "lucide-react";

const R = [["general", "General Inventory Report"], ["deco-room", "Deco Room Inventory Report"], ["ruijie-reyee", "Ruijie/Reyee Networking Report"], ["write-offs", "IT Write-Off Report"]];
export default function Reports() {
  const [q, setQ] = useState(""), [location, setLocation] = useState("");
  const qs = new URLSearchParams({ ...(q && { q }), ...(location && { location }) }).toString();
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Reports</h1>
      <div className="flex gap-2"><input className="input w-56" placeholder="Search filter (optional)" value={q} onChange={e => setQ(e.target.value)} /><input className="input w-44" placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {R.map(([k, t]) => <div key={k} className="card flex items-center justify-between"><span className="text-sm">{t}</span><span className="flex gap-2"><a className="btn" href={`/api/v1/reports/${k}?${qs}`}><Download size={14} />CSV</a><a className="btn" href={`/api/v1/reports/${k}?${qs}${qs ? "&" : ""}format=pdf`}><Download size={14} />PDF</a></span></div>)}
      </div>
      <p className="text-xs text-slate-500">CSV and PDF contain the filtered data, with a title and generation date (PDF has page numbers). For a printable view, open an inventory page and use Print.</p>
    </div>
  );
}
