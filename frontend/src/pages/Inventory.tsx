import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp, Download, Pencil, Plus, Printer, Trash2, X, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ImageOff,
  CheckSquare, Square, Filter, RotateCcw, AlertTriangle, Loader2,
  FileSpreadsheet, FileText, MoreHorizontal, Eye, Columns3,
} from "lucide-react";
import { api, errMsg } from "../api";

/* ==========================================================================
   TYPES & CONFIG
   ========================================================================== */
type Field = { key: string; label: string; type: "text" | "number"; required?: boolean };
type Col = { key: string; label: string; sortable?: boolean; render?: (r: any) => React.ReactNode; hidden?: boolean };
export type Cfg = { title: string; path: string; report: string; search: string; fields: Field[]; cols: Col[] };

const loc: Field = { key: "location", label: "Location", type: "text" };
const bil: Field = { key: "bil", label: "Bil", type: "number" };

const STATUS: Record<string, [string, string]> = {
  full: ["Fully operational", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  partial: ["Partially operational", "bg-amber-50 text-amber-700 border-amber-200"],
  none: ["None operating", "bg-rose-50 text-rose-700 border-rose-200"],
};

export const CONFIGS: Record<string, Cfg> = {
  general: {
    title: "General Inventory", path: "/general", report: "general", search: "Search item…",
    fields: [bil, { key: "item", label: "Item", type: "text", required: true }, { key: "quantity", label: "Quantity", type: "number", required: true }, { key: "in_operation", label: "In Operation", type: "number", required: true }, loc],
    cols: [
      { key: "bil", label: "Bil", sortable: true },
      { key: "item", label: "Item", sortable: true },
      { key: "quantity", label: "Quantity", sortable: true },
      { key: "in_operation", label: "In Operation", sortable: true },
      { key: "remaining", label: "Remaining" },
      { key: "status", label: "Status", render: r => <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS[r.status]?.[1] ?? ""}`}>{STATUS[r.status]?.[0] ?? r.status}</span> },
      { key: "location", label: "Location", sortable: true },
    ],
  },
  "deco-room": {
    title: "Deco Room Inventory", path: "/deco-room", report: "deco-room", search: "Search item code or name…",
    fields: [bil, { key: "item_code", label: "Item Code", type: "text" }, { key: "item_name", label: "Item Name", type: "text", required: true }, { key: "pcs", label: "Pieces", type: "number", required: true }, loc],
    cols: [
      { key: "bil", label: "Bil", sortable: true },
      { key: "item_code", label: "Item Code", sortable: true },
      { key: "item_name", label: "Item Name", sortable: true },
      { key: "pcs", label: "Pieces", sortable: true },
      { key: "location", label: "Location", sortable: true },
    ],
  },
  "ruijie-reyee": {
    title: "Ruijie/Reyee Networking", path: "/ruijie-reyee", report: "ruijie-reyee", search: "Search serial number…",
    fields: [bil, { key: "serial_number", label: "Serial Number", type: "text" }, { key: "kuantiti", label: "Quantity", type: "number", required: true }, loc],
    cols: [
      { key: "bil", label: "Bil", sortable: true },
      { key: "serial_number", label: "Serial Number", sortable: true },
      { key: "kuantiti", label: "Quantity", sortable: true },
      { key: "location", label: "Location", sortable: true },
    ],
  },
  "write-offs": {
    title: "IT Write-Off (retired assets)", path: "/write-offs", report: "write-offs", search: "Search item or reference…",
    fields: [{ key: "no", label: "No.", type: "text" }, { key: "item", label: "Item", type: "text", required: true }, { key: "quantity", label: "Quantity", type: "number", required: true }, loc],
    cols: [
      { key: "no", label: "No.", sortable: true },
      { key: "item", label: "Item", sortable: true },
      { key: "quantity", label: "Quantity", sortable: true },
      { key: "location", label: "Location", sortable: true },
    ],
  },
};

/* ==========================================================================
   HOOKS
   ========================================================================== */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const selectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(el.querySelectorAll<HTMLElement>(selectors));
    const first = focusables[0], last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { el.dispatchEvent(new CustomEvent("trap:escape")); return; }
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [active]);
  return ref;
}

/* ==========================================================================
   PRIMITIVES
   ========================================================================== */
function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const ref = useFocusTrap(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("trap:escape", handler);
    return () => el.removeEventListener("trap:escape", handler);
  }, [onClose, ref]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-[fadeIn_150ms_ease-out]"
      onMouseDown={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children, tone = "slate", disabled }: {
  label: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode;
  tone?: "slate" | "rose" | "amber"; disabled?: boolean;
}) {
  const tones = {
    slate: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    rose: "text-slate-500 hover:bg-rose-50 hover:text-rose-700",
    amber: "text-slate-500 hover:bg-amber-50 hover:text-amber-700",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function ToolbarButton({ icon, children, onClick, href, tone = "ghost" }: {
  icon: React.ReactNode; children: React.ReactNode; onClick?: () => void;
  href?: string; tone?: "ghost" | "primary" | "danger";
}) {
  const base = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition whitespace-nowrap";
  const tones = {
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  };
  if (href) return <a href={href} className={`${base} ${tones[tone]}`}>{icon}{children}</a>;
  return <button type="button" onClick={onClick} className={`${base} ${tones[tone]}`}>{icon}{children}</button>;
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */
export default function Inventory({ cfg }: { cfg: Cfg }) {
  /* ---- State ---- */
  const [data, setData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("id");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [del, setDel] = useState<any | null>(null);
  const [big, setBig] = useState<{ list: string[]; index: number } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showColMenu, setShowColMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dq = useDebounced(q, 300);
  const dl = useDebounced(location, 300);

  /* ---- Data loading ---- */
  const load = useCallback(() => {
    setLoading(true);
    api
      .get(cfg.path, { params: { q: dq || undefined, location: dl || undefined, sort, order, page, size } })
      .then(r => { setData(r.data); setErr(""); })
      .catch(e => setErr(errMsg(e)))
      .finally(() => setLoading(false));
  }, [cfg.path, dq, dl, sort, order, page, size]);

  useEffect(() => { load(); }, [load]);

  /* ---- Derived ---- */
  const pages = Math.max(1, Math.ceil(data.total / size));
  const visibleCols = useMemo(() => cfg.cols.filter(c => !hidden.has(c.key)), [cfg.cols, hidden]);
  const allOnPage = data.items.length > 0 && data.items.every(r => selected.has(r.id));
  const someOnPage = data.items.some(r => selected.has(r.id));
  const qs = useMemo(() => new URLSearchParams({ ...(q && { q }), ...(location && { location }) }).toString(), [q, location]);
  const filterActive = !!(q || location);

  /* ---- Handlers ---- */
  const toggleSort = (k: string) => {
    setPage(1);
    if (sort === k) setOrder(o => (o === "asc" ? "desc" : "asc"));
    else { setSort(k); setOrder("asc"); }
  };

  const clearFilters = () => { setQ(""); setLocation(""); setPage(1); };

  const toggleRow = (id: number) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected(s => {
      const next = new Set(s);
      if (allOnPage) data.items.forEach(r => next.delete(r.id));
      else data.items.forEach(r => next.add(r.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    if (!selected.size) return;
    setDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`${cfg.path}/${id}`)));
      clearSelection();
      load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  const toggleCol = (key: string) => {
    setHidden(h => {
      const next = new Set(h);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openLightbox = (item: any) => {
    const withImages = data.items.filter(r => r.has_image);
    const list = withImages.map(r => `/api/v1${cfg.path}/${r.id}/image`);
    const index = withImages.findIndex(r => r.id === item.id);
    setBig({ list, index: Math.max(0, index) });
  };

  /* ---- Render ---- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{cfg.title}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {data.total.toLocaleString()} record{data.total === 1 ? "" : "s"}
            {filterActive && <span className="ml-1 text-slate-400">· filtered</span>}
          </p>
        </div>

        {/* Search & filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder={cfg.search}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setQ(""); setPage(1); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative">
            <Filter size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Filter by location…"
              value={location}
              onChange={e => { setLocation(e.target.value); setPage(1); }}
            />
          </div>

          {filterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}

          <div className="relative">
            <ToolbarButton icon={<Columns3 size={14} />} onClick={() => setShowColMenu(v => !v)}>
              Columns
            </ToolbarButton>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                  {cfg.cols.map(c => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleCol(c.key)} className="rounded border-slate-300" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <ToolbarButton icon={<FileSpreadsheet size={14} />} href={`/api/v1/reports/${cfg.report}?${qs}`}>CSV</ToolbarButton>
            <ToolbarButton icon={<FileText size={14} />} href={`/api/v1/reports/${cfg.report}?${qs}${qs ? "&" : ""}format=pdf`}>PDF</ToolbarButton>
            <ToolbarButton icon={<Printer size={14} />} onClick={() => window.print()}>Print</ToolbarButton>
          </div>

          <ToolbarButton icon={<Plus size={14} />} tone="primary" onClick={() => setEdit({})}>Add</ToolbarButton>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{err}</span>
          <button onClick={() => setErr("")} className="rounded p-0.5 hover:bg-rose-100" aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm text-white shadow-md">
          <span className="font-medium">{selected.size} selected</span>
          <button onClick={clearSelection} className="text-xs text-slate-300 hover:text-white">Clear</button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={bulkDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 p-3">
                  <button
                    type="button"
                    onClick={toggleAllOnPage}
                    aria-label={allOnPage ? "Deselect all" : "Select all"}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    {allOnPage ? <CheckSquare size={16} /> : someOnPage ? <div className="h-4 w-4 rounded border-2 border-slate-400 bg-slate-200" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="w-16 p-3 font-semibold">Photo</th>
                {visibleCols.map(c => (
                  <th key={c.key} className="whitespace-nowrap p-3 font-semibold">
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={`inline-flex items-center gap-1 uppercase transition ${sort === c.key ? "text-slate-900" : "hover:text-slate-700"}`}
                      >
                        {c.label}
                        <ArrowDownUp size={11} className={sort === c.key ? "opacity-100" : "opacity-40"} />
                        {sort === c.key && <span className="text-[9px] text-slate-400">{order === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    ) : c.label}
                  </th>
                ))}
                <th className="no-print p-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data.items.length && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3"><div className="h-4 w-4 rounded bg-slate-100" /></td>
                    <td className="p-3"><div className="h-10 w-10 rounded bg-slate-100" /></td>
                    {visibleCols.map(c => <td key={c.key} className="p-3"><div className="h-3 w-20 rounded bg-slate-100" /></td>)}
                    <td className="p-3"><div className="ml-auto h-3 w-12 rounded bg-slate-100" /></td>
                  </tr>
                ))
              )}
              {data.items.map(r => (
                <tr key={r.id} className={`group transition ${selected.has(r.id) ? "bg-amber-50/50" : "hover:bg-slate-50/80"}`}>
                  <td className="p-3">
                    <button type="button" onClick={() => toggleRow(r.id)} aria-label="Select row" className="text-slate-400 hover:text-slate-700">
                      {selected.has(r.id) ? <CheckSquare size={16} className="text-slate-900" /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="p-3">
                    {r.has_image ? (
                      <button
                        type="button"
                        onClick={() => openLightbox(r)}
                        className="block overflow-hidden rounded-md ring-1 ring-slate-200 hover:ring-slate-400 transition"
                      >
                        <img
                          loading="lazy"
                          alt=""
                          src={`/api/v1${cfg.path}/${r.id}/image`}
                          className="h-10 w-10 object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                        <ImageOff size={14} />
                      </div>
                    )}
                  </td>
                  {visibleCols.map(c => (
                    <td key={c.key} className="p-3 text-slate-700">
                      {c.render ? c.render(r) : (r[c.key] ?? <span className="text-slate-300">—</span>)}
                    </td>
                  ))}
                  <td className="no-print p-3 text-right">
                    <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                      {r.has_image && (
                        <IconButton label="Preview" onClick={() => openLightbox(r)}><Eye size={15} /></IconButton>
                      )}
                      <IconButton label="Edit" onClick={() => setEdit(r)}><Pencil size={15} /></IconButton>
                      <IconButton label="Delete" tone="rose" onClick={() => setDel(r)}><Trash2 size={15} /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !data.items.length && (
                <tr>
                  <td colSpan={visibleCols.length + 3} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="rounded-full bg-slate-50 p-3"><Search size={20} /></div>
                      <p className="text-sm font-medium text-slate-600">
                        {filterActive ? "No records match your filters" : "No records yet"}
                      </p>
                      <p className="text-xs">
                        {filterActive ? "Try adjusting your search or filters." : "Click Add to create the first record."}
                      </p>
                      {filterActive && (
                        <button onClick={clearFilters} className="mt-2 text-xs font-medium text-slate-700 underline hover:text-slate-900">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <span>
            {data.total === 0 ? "0" : `${(page - 1) * size + 1}–${Math.min(page * size, data.total)}`} of{" "}
            <span className="font-medium text-slate-900">{data.total.toLocaleString()}</span>
          </span>
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
            value={size}
            onChange={e => { setSize(+e.target.value); setPage(1); }}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label="First page" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft size={15} /></IconButton>
          <IconButton label="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={15} /></IconButton>
          <span className="px-3 text-xs text-slate-600">
            Page <span className="font-medium text-slate-900">{page}</span> of {pages}
          </span>
          <IconButton label="Next page" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}><ChevronRight size={15} /></IconButton>
          <IconButton label="Last page" onClick={() => setPage(pages)} disabled={page >= pages}><ChevronsRight size={15} /></IconButton>
        </div>
      </div>

      {/* Modals */}
      {edit && <EditForm cfg={cfg} row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}

      {del && (
        <Modal onClose={() => setDel(null)} label="Confirm delete">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-50 p-2 text-rose-600"><AlertTriangle size={20} /></div>
              <div>
                <h2 className="font-semibold text-slate-900">Delete record?</h2>
                <p className="mt-1 text-sm text-slate-500">This will permanently remove the record. This action cannot be undone.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setDel(null)}>Cancel</button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                onClick={async () => {
                  try { await api.delete(`${cfg.path}/${del.id}`); setDel(null); load(); }
                  catch (e) { setErr(errMsg(e)); setDel(null); }
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {big && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
          onClick={() => setBig(null)}
        >
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X size={20} />
          </button>
          {big.list.length > 1 && (
            <>
              <button
                className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Previous"
                onClick={e => { e.stopPropagation(); setBig(b => b && { ...b, index: (b.index - 1 + b.list.length) % b.list.length }); }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Next"
                onClick={e => { e.stopPropagation(); setBig(b => b && { ...b, index: (b.index + 1) % b.list.length }); }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <img
            src={big.list[big.index]}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {big.list.length > 1 && (
            <div className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {big.index + 1} / {big.list.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   EDIT FORM
   ========================================================================== */
function EditForm({ cfg, row, onClose, onSaved }: { cfg: Cfg; row: any; onClose: () => void; onSaved: () => void }) {
  const isNew = !row.id;
  const initial = useMemo(
    () => Object.fromEntries(cfg.fields.map(f => [f.key, row[f.key] == null ? (f.type === "number" && f.required ? "0" : "") : String(row[f.key])])),
    [cfg.fields, row]
  );
  const [v, setV] = useState<Record<string, string>>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = file ? URL.createObjectURL(file) : row.has_image && !remove ? `/api/v1${cfg.path}/${row.id}/image` : null;
  const dirty = useMemo(() => file || remove || cfg.fields.some(f => String(row[f.key] ?? "") !== (v[f.key] ?? "")), [cfg.fields, row, v, file, remove]);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => { firstInput.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData();
    cfg.fields.forEach(f => fd.append(f.key, v[f.key] ?? ""));
    if (file) fd.append("image", file);
    if (remove) fd.append("remove_image", "true");
    try {
      isNew ? await api.post(cfg.path, fd) : await api.put(`${cfg.path}/${row.id}`, fd);
      onSaved();
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  const attemptClose = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    onClose();
  };

  return (
    <Modal onClose={attemptClose} label={isNew ? "Add record" : "Edit record"}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{isNew ? "Add record" : "Edit record"}</h2>
            <p className="text-xs text-slate-500">{isNew ? "Create a new inventory entry" : `Editing record #${row.id}`}</p>
          </div>
          <button type="button" onClick={attemptClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cfg.fields.map((f, i) => (
            <label key={f.key} className={`block text-sm ${f.key === "location" || f.key === "item" || f.key === "item_name" ? "sm:col-span-2" : ""}`}>
              <span className="text-xs font-medium text-slate-600">
                {f.label}{f.required && <span className="ml-0.5 text-rose-500">*</span>}
              </span>
              <input
                ref={i === 0 ? firstInput : undefined}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                type={f.type}
                min={f.type === "number" ? 0 : undefined}
                required={f.required}
                value={v[f.key]}
                onChange={e => setV({ ...v, [f.key]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-700">Photo</div>
              <div className="text-[11px] text-slate-400">JPEG, PNG or WebP</div>
            </div>
            <label className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {preview ? "Change" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); setRemove(false); }}
              />
            </label>
          </div>
          {preview && (
            <div className="mt-3 flex items-center gap-3">
              <img alt="Preview" src={preview} className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                onClick={() => { setFile(null); setRemove(true); }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {err && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">{dirty ? "Unsaved changes" : "No changes"}</span>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={attemptClose}>
              Cancel
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" disabled={busy || !dirty}>
              {busy ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : isNew ? "Create" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}