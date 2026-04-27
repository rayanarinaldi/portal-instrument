import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  History,
  Users,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo-dongjin.png";

const ROLE_LABELS: Record<string, string> = {
  admin_it: "Admin IT",
  section_chief: "Section Chief",
  pic: "PIC",
  foreman: "Foreman",
  teknisi: "Teknisi",
};

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout, canManageUsers } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "All Records", href: "/records", icon: ClipboardList },
    { name: "New Record", href: "/new", icon: PlusCircle },
    { name: "History Card", href: "/history-card", icon: History },
    { name: "Report", href: "/reports", icon: FileText },
    ...(canManageUsers()
      ? [{ name: "Manage Users", href: "/users", icon: Users }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur md:hidden print-hide">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Dongjin" className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow" />
          <div>
            <div className="text-sm font-bold leading-none">Dongjin</div>
            <div className="text-xs text-muted-foreground">Calibration System</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-xl border px-2.5 py-2 transition hover:bg-muted"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex min-h-screen">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden print-hide"
          />
        )}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white transition-transform duration-200 md:static md:z-auto md:w-72 md:translate-x-0 print-hide",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="border-b border-white/10 px-5 py-6">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Dongjin"
                className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5 shadow-md"
              />

              <div>
                <h1 className="text-xl font-black leading-none tracking-tight">Dongjin</h1>
                <p className="mt-1 text-xs font-medium text-blue-100">Instrument Calibration</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-100">
                <ShieldCheck className="h-4 w-4" />
                Internal System
              </div>
              <div className="mt-1 text-xs text-blue-100/80">PT. Dongjin Indonesia</div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5 space-y-1.5">
            {navigation.map((item) => {
              const isActive =
                location === item.href || (item.href !== "/" && location.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-white text-slate-950 shadow-lg shadow-blue-950/20"
                      : "text-blue-100 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <item.icon
                    className={[
                      "h-5 w-5 shrink-0 transition-transform",
                      isActive ? "text-blue-700" : "text-blue-200 group-hover:scale-105",
                    ].join(" ")}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-left transition hover:bg-white/15">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-800 text-sm font-bold shadow-sm">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{user?.name}</div>
                      <div className="truncate text-xs text-blue-100">
                        {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
                      </div>
                    </div>

                    <ChevronDown className="h-4 w-4 shrink-0 text-blue-100" />
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" side="top" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 print-hide">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Calibration Management System
                </div>
                <div className="text-xs text-slate-500">
                  Monitoring, records, reports & user access
                </div>
              </div>

              <div className="hidden rounded-full border bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 md:block">
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}