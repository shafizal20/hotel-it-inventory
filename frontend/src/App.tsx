import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Boxes, FileText, LayoutDashboard, LogOut, Network, Eye, EyeOff, Package, Trash2, Moon, Sun } from "lucide-react";
import { api, errMsg } from "./api";
import Dashboard from "./pages/Dashboard";
import Inventory, { CONFIGS } from "./pages/Inventory";
import Reports from "./pages/Reports";

type U = { username: string };

function Login({ onLogin }: { onLogin: (u: U) => void }) {
  const [f, setF] = useState({ username: "", password: "" }), [show, setShow] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), nav = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const { data } = await api.post("/auth/login", f); onLogin(data); nav("/"); }
    catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Hotel IT Inventory</h1>
        <p className="text-sm text-slate-500">Administrator sign in</p>
        <label className="block text-sm">Username<input className="input mt-1" required autoFocus value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></label>
        <label className="block text-sm">Password
          <div className="relative mt-1">
            <input className="input pr-9" required type={show ? "text" : "password"} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
            <button type="button" aria-label="Toggle password" className="absolute right-2 top-2 text-slate-500" onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </label>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button className="btn w-full justify-center" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

const NAV = [
  ["/", "Dashboard", LayoutDashboard], ["/general", "General Inventory", Boxes], ["/deco-room", "Deco Room Inventory", Package],
  ["/ruijie-reyee", "Ruijie/Reyee Networking", Network], ["/write-offs", "IT Write-Off", Trash2], ["/reports", "Reports", FileText],
] as const;

function Layout({ user, onLogout }: { user: U; onLogout: () => void }) {
  const { pathname } = useLocation();
  const page = NAV.find(([to]) => to === pathname)?.[1] ?? "Dashboard";
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const toggle = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle("dark", d); localStorage.theme = d ? "dark" : "light"; };
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-slate-900 p-3 text-slate-200">
        <div className="mb-4 px-2 text-sm font-semibold text-white">Hotel IT Assets</div>
        <nav className="space-y-1">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-2 rounded px-2 py-2 text-sm ${isActive ? "bg-slate-700 text-white" : "hover:bg-slate-800"}`}><Icon size={16} />{label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-white px-4 py-2 text-sm">
          <nav aria-label="Breadcrumb" className="mr-auto text-slate-500">Home / <span className="font-medium text-slate-900">{page}</span></nav>
          <button className="btn-ghost" aria-label="Toggle theme" onClick={toggle}>{dark ? <Sun size={14} /> : <Moon size={14} />}</button>
          <span>{user.username}</span>
          <button className="btn-ghost" onClick={onLogout}><LogOut size={14} />Logout</button>
        </header>
        <main className="min-w-0 flex-1 p-4"><Outlet /></main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<U | null | undefined>(undefined);
  useEffect(() => { api.get("/auth/me").then(r => setUser(r.data)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <p className="p-6 text-slate-500">Loading…</p>;
  const logout = async () => { await api.post("/auth/logout"); setUser(null); };
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
      {user ? (
        <Route element={<Layout user={user} onLogout={logout} />}>
          <Route index element={<Dashboard />} />
          {Object.entries(CONFIGS).map(([k, c]) => <Route key={k} path={k} element={<Inventory key={k} cfg={c} />} />)}
          <Route path="reports" element={<Reports />} />
        </Route>
      ) : <Route path="*" element={<Navigate to="/login" />} />}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
