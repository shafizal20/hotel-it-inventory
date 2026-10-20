import { useCallback, useEffect, useState } from "react";
import { ArrowDownUp, Download, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { api, errMsg } from "../api";

type Field = { key: string; label: string; type: "text" | "number"; required?: boolean };
type Col = { key: string; label: string; sortable?: boolean; render?: (r: any) => React.ReactNode };
export type Cfg = { title: string; path: string; report: string; search: string; fields: Field[]; cols: Col[] };

const loc: Field = { key: "location", label: "Location", type: "text" };
const bil: Field = { key: "bil", label: "Bil", type: "number" };
const STATUS: Record<string, [string, string]> = { full: ["Fully operational", "bg-green-100 text-green-800"], partial: ["Partially operational", "bg-amber-100 text-amber-800"], none: ["None operating", "bg-red-100 text-red-800"] };

export const CONFIGS: Record<string, Cfg> = {
  general: { title: "General Inventory", path: "/general", report: "general", search: "Search item…",
    fields: [bil, { key: "item", label: "Item", type: "text", required: true }, { key: "quantity", label: "Quantity", type: "number", required: true }, { key: "in_operation", label: "In Operation", type: "number", required: true }, loc],
    cols: [{ key: "bil", label: "Bil", sortable: true }, { key: "item", label: "Item", sortable: true }, { key: "quantity", label: "Quantity", sortable: true }, { key: "in_operation", label: "In Operation", sortable: true }, { key: "remaining", label: "Remaining" },
      { key: "status", label: "Status", render: r => <span className={`rounded px-2 py-0.5 text-xs ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span> }, { key: "location", label: "Location", sortable: true }] },
  "deco-room": { title: "Deco Room Inventory", path: "/deco-room", report: "deco-room", search: "Search item code or name…",
    fields: [bil, { key: "item_code", label: "Item Code", type: "text" }, { key: "item_name", label: "Item Name", type: "text", required: true }, { key: "pcs", label: "Pieces", type: "number", required: true }, loc],
    cols: [{ key: "bil", label: "Bil", sortable: true }, { key: "item_code", label: "Item Code", sortable: true }, { key: "item_name", label: "Item Name", sortable: true }, { key: "pcs", label: "Pieces", sortable: true }, { key: "location", label: "Location", sortable: true }] },
  "ruijie-reyee": { title: "Ruijie/Reyee Networking", path: "/ruijie-reyee", report: "ruijie-reyee", search: "Search serial number…",
    fields: [bil, { key: "serial_number", label: "Serial Number", type: "text" }, { key: "kuantiti", label: "Quantity", type: "number", required: true }, loc],
    cols: [{ key: "bil", label: "Bil", sortable: true }, { key: "serial_number", label: "Serial Number", sortable: true }, { key: "kuantiti", label: "Quantity", sortable: true }, { key: "location", label: "Location", sortable: true }] },
  "write-offs": { title: "IT Write-Off (retired assets)", path: "/write-offs", report: "write-offs", search: "Search item or reference…",
    fields: [{ key: "no", label: "No.", type: "text" }, { key: "item", label: "Item", type: "text", required: true }, { key: "quantity", label: "Quantity", type: "number", required: true }, loc],
    cols: [{ key: "no", label: "No.", sortable: true }, { key: "item", label: "Item", sortable: true }, { key: "quantity", label: "Quantity", sortable: true }, { key: "location", label: "Location", sortable: true }] },
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}><div role="dialog" aria-modal className="card max-h-[90vh] w-full max-w-md overflow-auto" onClick={e => e.stopPropagation()}>{children}</div></div>;
}

export default function Inventory({ cfg }: { cfg: Cfg }) {
  const [data, setData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [q, setQ] = useState(""), [location, setLocation] = useState(""), [sort, setSort] = useState("id"), [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1), [size, setSize] = useState(20), [err, setErr] = useState(""), [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null), [del, setDel] = useState<any | null>(null), [big, setBig] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(cfg.path, { params: { q: q || undefined, location: location || undefined, sort, order, page, size } })
      .then(r => { setData(r.data); setErr(""); }).catch(e => setErr(errMsg(e))).finally(() => setLoading(false));
  }, [cfg.path, q, location, sort, order, page, size]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / size));
  const toggleSort = (k: string) => { setPage(1); if (sort === k) setOrder(order === "asc" ? "desc" : "asc"); else { setSort(k); setOrder("asc"); } };
  const qs = new URLSearchParams({ ...(q && { q }), ...(location && { location }) }).toString();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">{cfg.title}</h1>
        <input className="input w-56" placeholder={cfg.search} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        <input className="input w-40" placeholder="Location" value={location} onChange={e => { setLocation(e.target.value); setPage(1); }} />
        {(q || location) && <button className="btn-ghost" onClick={() => { setQ(""); setLocation(""); setPage(1); }}>Clear</button>}
        <a className="btn-ghost no-print" href={`/api/v1/reports/${cfg.report}?${qs}`}><Download size={14} />CSV</a>
        <a className="btn-ghost no-print" href={`/api/v1/reports/${cfg.report}?${qs}${qs ? "&" : ""}format=pdf`}><Download size={14} />PDF</a>
        <button className="btn-ghost no-print" onClick={() => window.print()}><Printer size={14} />Print</button>
        <button className="btn no-print" onClick={() => setEdit({})}><Plus size={14} />Add</button>
      </div>
      {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>
            <th className="p-2">Picture</th>
            {cfg.cols.map(c => <th key={c.key} className="p-2">{c.sortable ? <button className="flex items-center gap-1 uppercase" onClick={() => toggleSort(c.key)}>{c.label}<ArrowDownUp size={12} /></button> : c.label}</th>)}
            <th className="no-print p-2">Actions</th></tr></thead>
          <tbody>
            {data.items.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.has_image
                  ? <img loading="lazy" alt="" src={`/api/v1${cfg.path}/${r.id}/image`} className="h-10 w-10 cursor-pointer rounded object-cover" onClick={() => setBig(`/api/v1${cfg.path}/${r.id}/image`)} />
                  : <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">none</div>}</td>
                {cfg.cols.map(c => <td key={c.key} className="p-2">{c.render ? c.render(r) : r[c.key] ?? "—"}</td>)}
                <td className="no-print whitespace-nowrap p-2">
                  <button aria-label="Edit" className="p-1 text-slate-600 hover:text-slate-900" onClick={() => setEdit(r)}><Pencil size={15} /></button>
                  <button aria-label="Delete" className="p-1 text-red-600 hover:text-red-800" onClick={() => setDel(r)}><Trash2 size={15} /></button></td>
              </tr>))}
            {!loading && !data.items.length && <tr><td colSpan={cfg.cols.length + 2} className="p-6 text-center text-slate-500">No records found.</td></tr>}
            {loading && <tr><td colSpan={cfg.cols.length + 2} className="p-6 text-center text-slate-400">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="no-print flex items-center justify-between text-sm">
        <span>{data.total} records</span>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={size} onChange={e => { setSize(+e.target.value); setPage(1); }}>{[10, 20, 50, 100].map(n => <option key={n}>{n}</option>)}</select>
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>{page} / {pages}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
      {edit && <EditForm cfg={cfg} row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {del && <Modal onClose={() => setDel(null)}>
        <p className="mb-4 text-sm">Delete this record permanently? This cannot be undone.</p>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setDel(null)}>Cancel</button>
          <button className="btn !bg-red-700" onClick={async () => { try { await api.delete(`${cfg.path}/${del.id}`); setDel(null); load(); } catch (e) { setErr(errMsg(e)); setDel(null); } }}>Delete</button></div></Modal>}
      {big && <Modal onClose={() => setBig(null)}><img alt="Full size" src={big} className="w-full" /></Modal>}
    </div>
  );
}

function EditForm({ cfg, row, onClose, onSaved }: { cfg: Cfg; row: any; onClose: () => void; onSaved: () => void }) {
  const isNew = !row.id;
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(cfg.fields.map(f => [f.key, row[f.key] == null ? (f.type === "number" && f.required ? "0" : "") : String(row[f.key])])));
  const [file, setFile] = useState<File | null>(null), [remove, setRemove] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const preview = file ? URL.createObjectURL(file) : row.has_image && !remove ? `/api/v1${cfg.path}/${row.id}/image` : null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const fd = new FormData();
    cfg.fields.forEach(f => fd.append(f.key, v[f.key] ?? ""));
    if (file) fd.append("image", file);
    if (remove) fd.append("remove_image", "true");
    try { isNew ? await api.post(cfg.path, fd) : await api.put(`${cfg.path}/${row.id}`, fd); onSaved(); }
    catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{isNew ? "Add" : "Edit"} record</h2><button type="button" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        {cfg.fields.map(f => <label key={f.key} className="block text-sm">{f.label}{f.required && " *"}
          <input className="input mt-1" type={f.type} min={f.type === "number" ? 0 : undefined} required={f.required} value={v[f.key]} onChange={e => setV({ ...v, [f.key]: e.target.value })} /></label>)}
        <div className="text-sm">Photo (JPEG, PNG or WebP)
          <input className="input mt-1" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setFile(e.target.files?.[0] ?? null); setRemove(false); }} />
          {preview && <div className="mt-2 flex items-center gap-3"><img alt="Preview" src={preview} className="h-20 w-20 rounded object-cover" />
            <button type="button" className="btn-ghost" onClick={() => { setFile(null); setRemove(true); }}>Remove</button></div>}</div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}
