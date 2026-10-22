import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Boxes, FileText, LayoutDashboard, LogOut, Network, Eye, EyeOff, Package, Trash2, Moon, Sun } from "lucide-react";
import { api, errMsg } from "./api";
import Dashboard from "./pages/Dashboard";
import Inventory, { CONFIGS } from "./pages/Inventory";
import Reports from "./pages/Reports";
import austinLogo from "./image/austin.png";

type U = { username: string };

function Login({ onLogin }: { onLogin: (u: U) => void }) {
  const [f, setF] = useState({ username: "", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/login", f);
      onLogin(data);
      nav("/");
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#faf6ef] via-[#fdfaf3] to-[#f2ead9] p-4 dark:from-[#2a1a0d] dark:via-[#1a0f06] dark:to-[#2a1a0d]">
      {/* Animated background logo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src={austinLogo}
          alt=""
          aria-hidden="true"
          className="login-logo-bg w-[min(90vw,900px)] max-w-none select-none opacity-20"
        />
      </div>

      {/* Decorative floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-orb absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#c9a13b]/30 blur-3xl" />
        <div className="login-orb-slow absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#b8862b]/20 blur-3xl" />
      </div>

      {/* Login card */}
      <form
        onSubmit={submit}
        className="login-card relative z-10 w-full max-w-sm space-y-4 rounded-2xl border border-[#e8d9a8] bg-[#fdfaf3]/90 p-6 shadow-2xl backdrop-blur-md"
      >
        <div className="flex flex-col items-center gap-2">
          <img
            src={austinLogo}
            alt="Austin Park Hotel"
            className="login-logo-in h-24 w-auto"
          />
          <h1 className="text-xl font-semibold tracking-tight text-[#5a3218] dark:text-[#c9a13b]">
            Hotel IT Inventory
          </h1>
          <p className="text-sm text-[#8a6a4a]">Administrator sign in</p>
        </div>

        <label className="block text-sm font-medium text-[#5a3218]">
          Username
          <input
            className="mt-1 w-full rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-2 text-sm text-[#5a3218] placeholder:text-[#a08a6a] focus:border-[#c9a13b] focus:outline-none focus:ring-2 focus:ring-[#c9a13b]/30"
            required
            autoFocus
            value={f.username}
            onChange={(e) => setF({ ...f, username: e.target.value })}
          />
        </label>

        <label className="block text-sm font-medium text-[#5a3218]">
          Password
          <div className="relative mt-1">
            <input
              className="w-full rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-3 py-2 pr-9 text-sm text-[#5a3218] placeholder:text-[#a08a6a] focus:border-[#c9a13b] focus:outline-none focus:ring-2 focus:ring-[#c9a13b]/30"
              required
              type={show ? "text" : "password"}
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
            <button
              type="button"
              aria-label="Toggle password"
              className="absolute right-2 top-2 text-[#a08a6a] hover:text-[#5a3218]"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {err && (
          <p role="alert" className="text-sm text-[#a0522d]">
            {err}
          </p>
        )}

        <button
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#5a3218] px-3 py-2 text-sm font-semibold text-[#faf6ef] shadow-sm transition hover:bg-[#7a4a1e] disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-[#a08a6a]">
          © {new Date().getFullYear()} Austin Park Hotel
        </p>
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
    <div className="flex min-h-screen bg-[#f2ead9] text-[#3d2410]">
      <aside className="w-56 shrink-0 bg-[#3d2410] p-3 text-[#e8d9a8]">
        <div className="mb-4 flex items-center gap-2 px-2 text-sm font-semibold text-[#faf6ef]">
          <img src={austinLogo} alt="" className="h-6 w-auto rounded bg-white/95 p-0.5" />
          Hotel IT Assets
        </div>
        <nav className="space-y-1">
          {NAV.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded px-2 py-2 text-sm transition ${
                  isActive
                    ? "bg-[#5a3218] text-[#faf6ef] font-semibold"
                    : "hover:bg-[#5a3218]/60 hover:text-[#faf6ef]"
                }`
              }
            >
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[#e8d9a8] bg-[#fdfaf3] px-4 py-2 text-sm">
          <nav aria-label="Breadcrumb" className="mr-auto text-[#8a6a4a]">
            Home / <span className="font-medium text-[#5a3218]">{page}</span>
          </nav>
          <button
            className="rounded-md border border-[#e8d9a8] bg-[#faf6ef] p-1.5 text-[#7a4a1e] transition hover:bg-[#f5eee2]"
            aria-label="Toggle theme"
            onClick={toggle}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <span className="text-[#5a3218] font-medium">{user.username}</span>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8d9a8] bg-[#faf6ef] px-2.5 py-1.5 text-xs font-medium text-[#7a4a1e] transition hover:bg-[#f5eee2]"
            onClick={onLogout}
          >
            <LogOut size={14} />Logout
          </button>
        </header>
        <main className="min-w-0 flex-1 p-4"><Outlet /></main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<U | null | undefined>(undefined);
  useEffect(() => { api.get("/auth/me").then(r => setUser(r.data)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <p className="p-6 text-[#8a6a4a] bg-[#f2ead9] min-h-screen">Loading…</p>;
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