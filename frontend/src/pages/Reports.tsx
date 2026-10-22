import { useState } from "react";
import { Download } from "lucide-react";

const R = [
  ["general", "General Inventory Report"],
  ["deco-room", "Deco Room Inventory Report"],
  ["ruijie-reyee", "Ruijie/Reyee Networking Report"],
  ["write-offs", "IT Write-Off Report"],
];

export default function Reports() {
  const [q, setQ] = useState(""), [location, setLocation] = useState("");
  const qs = new URLSearchParams({ ...(q && { q }), ...(location && { location }) }).toString();

  return (
    <div className="space-y-3 bg-[#f2ead9] p-4 min-h-screen text-[#3d2410]">
      <h1 className="text-lg font-semibold text-[#5a3218]">Reports</h1>

      <div className="flex gap-2">
        <input
          className="w-56 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-1.5 text-sm text-[#5a3218] placeholder:text-[#a08a6a] focus:border-[#c9a13b] focus:outline-none focus:ring-2 focus:ring-[#c9a13b]/30"
          placeholder="Search filter (optional)"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <input
          className="w-44 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-1.5 text-sm text-[#5a3218] placeholder:text-[#a08a6a] focus:border-[#c9a13b] focus:outline-none focus:ring-2 focus:ring-[#c9a13b]/30"
          placeholder="Location (optional)"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {R.map(([k, t]) => (
          <div key={k} className="flex items-center justify-between rounded-xl border border-[#e8d9a8] bg-[#fdfaf3] p-4 shadow-sm">
            <span className="text-sm font-medium text-[#5a3218]">{t}</span>
            <span className="flex gap-2">
              <a
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-1.5 text-sm font-medium text-[#7a4a1e] hover:bg-[#f5eee2] hover:border-[#c9a13b] transition"
                href={`/api/v1/reports/${k}?${qs}`}
              >
                <Download size={14} />CSV
              </a>
              <a
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-1.5 text-sm font-medium text-[#7a4a1e] hover:bg-[#f5eee2] hover:border-[#c9a13b] transition"
                href={`/api/v1/reports/${k}?${qs}${qs ? "&" : ""}format=pdf`}
              >
                <Download size={14} />PDF
              </a>
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#8a6a4a]">
        CSV and PDF contain the filtered data, with a title and generation date (PDF has page numbers). For a printable view, open an inventory page and use Print.
      </p>
    </div>
  );
}