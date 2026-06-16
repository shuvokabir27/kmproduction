import { ReactNode, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, Weight, Play, Layers, Sparkles,
  Truck, Megaphone, FileText, ShoppingCart, Users, BarChart3, UserCog,
  LogOut, Menu, X, ChevronRight, Settings,
} from "lucide-react";
import { useAuth, type StaffRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Item = {
  to: string;
  label: string;
  icon: any;
  roles?: StaffRole[]; // visible to these roles (default: all staff)
};

type Group = {
  label: string;
  items: Item[];
  roles?: StaffRole[];
};

const groups: Group[] = [
  {
    label: "ওভারভিউ",
    items: [
      { to: "/admin", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    ],
  },
  {
    label: "অর্ডার ম্যানেজমেন্ট",
    roles: ["product_admin", "order_manager"],
    items: [
      { to: "/admin/orders", label: "সকল অর্ডার", icon: ShoppingCart },
      { to: "/admin/orders/customers", label: "কাস্টমার", icon: Users },
      { to: "/admin/orders/reports", label: "রিপোর্ট", icon: BarChart3 },
      { to: "/admin/orders/delivery", label: "ডেলিভারি সেটিংস", icon: Truck },
    ],
  },
  {
    label: "সাইট কাস্টমাইজেশন",
    roles: ["product_admin", "site_manager"],
    items: [
      { to: "/admin/site/products", label: "প্রডাক্ট", icon: Package },
      { to: "/admin/site/categories", label: "ক্যাটাগরি", icon: FolderTree },
      { to: "/admin/site/pricing", label: "প্রাইসিং", icon: Weight },
      { to: "/admin/site/videos", label: "ভিডিও", icon: Play },
      { to: "/admin/site/home-sections", label: "হোম সেকশন", icon: Layers },
      { to: "/admin/site/offers", label: "অফার", icon: Sparkles },
      { to: "/admin/site/free-delivery", label: "ফ্রি ডেলিভারি", icon: Truck },
      { to: "/admin/site/scrolling", label: "স্ক্রলিং টেক্সট", icon: Megaphone },
      { to: "/admin/site/footer", label: "ফুটার", icon: FileText },
    ],
  },
  {
    label: "ইউজার ম্যানেজমেন্ট",
    roles: ["product_admin"],
    items: [
      { to: "/admin/users", label: "ম্যানেজার অ্যাকাউন্ট", icon: UserCog },
      { to: "/admin/users/customers", label: "শপ কাস্টমার", icon: Users },
    ],
  },
];

export function WPAdminShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { signOut, roles, user, isProductAdmin, isOrderManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.roles || it.roles.some((r) => roles.includes(r))),
    }))
    .filter((g) => (!g.roles || g.roles.some((r) => roles.includes(r))) && g.items.length > 0);

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const Sidebar = (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-slate-200">
        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-bold">KM</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">KM Admin</div>
          <div className="text-[10px] text-slate-500">
            {isProductAdmin ? "Super Admin" : isOrderManager ? "Order Manager" : "Site Manager"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {visibleGroups.map((g) => (
          <div key={g.label} className="px-2 pt-3 pb-1">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active =
                  it.to === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname === it.to || location.pathname.startsWith(it.to + "/");
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-blue-600" />}
                    <Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-500"}`} />
                    <span>{it.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="text-xs text-slate-500 truncate mb-2">{user?.email}</div>
        <button
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 text-sm text-slate-700 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-md border border-slate-200"
        >
          <LogOut className="h-4 w-4" /> লগআউট
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">{Sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-2 rounded hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <div className="min-w-0">
              {title && <h1 className="text-base md:text-lg font-semibold text-slate-900 truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function WPCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-md ${className}`}>{children}</div>
  );
}
