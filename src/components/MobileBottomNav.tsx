import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Film,
  CreditCard,
  FileText,
  Calendar,
  Home,
  Tv,
  MoreHorizontal,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const adminTabs = [
  { icon: LayoutDashboard, label: "হোম", path: "/admin" },
  { icon: Film, label: "শুটিং", path: "/admin/shootings" },
  { icon: FileText, label: "স্ক্রিপ্ট", path: "/admin/scripts" },
  { icon: CreditCard, label: "পেমেন্ট", path: "/admin/payments" },
  { icon: MoreHorizontal, label: "আরো", path: "__more__" },
];

const moreItems = [
  { icon: Users, label: "সদস্য", path: "/admin/members" },
  { icon: Calendar, label: "হাজিরা", path: "/admin/attendance" },
  { icon: Tv, label: "চ্যানেল", path: "/admin/channels" },
  { icon: Home, label: "পাবলিক সাইট", path: "/" },
];

const memberTabs = [
  { icon: Home, label: "হোম", path: "/" },
  { icon: LayoutDashboard, label: "ড্যাশবোর্ড", path: "/dashboard" },
];

export function MobileBottomNav() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = isAdmin ? adminTabs : memberTabs;

  const isActive = (path: string) => {
    if (path === "__more__") {
      return moreItems.some(
        (m) =>
          m.path === location.pathname ||
          (m.path !== "/" && location.pathname.startsWith(m.path))
      );
    }
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 left-2 right-2 z-[61] pb-safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border/30 rounded-2xl shadow-2xl shadow-primary/10 p-2 grid grid-cols-4 gap-1">
              {moreItems.map((item) => {
                const active = item.path === location.pathname || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMoreOpen(false);
                    }}
                    className={`flex flex-col items-center py-3 px-1 rounded-xl transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-secondary/50 active:bg-secondary"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-[10px] mt-1 font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border/20" />

        <div className="relative flex items-end justify-around px-1 pb-safe-bottom">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const isMore = tab.path === "__more__";
            return (
              <button
                key={tab.path}
                onClick={() => {
                  if (isMore) {
                    setMoreOpen(!moreOpen);
                  } else {
                    setMoreOpen(false);
                    navigate(tab.path);
                  }
                }}
                className="relative flex flex-col items-center pt-2 pb-1.5 px-3 min-w-[56px] active:scale-95 transition-transform"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-8 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <tab.icon
                  className={`h-5 w-5 transition-colors duration-150 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 font-medium transition-colors duration-150 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
