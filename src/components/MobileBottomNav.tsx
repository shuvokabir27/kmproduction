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
} from "lucide-react";
import { motion } from "framer-motion";

const adminTabs = [
  { icon: LayoutDashboard, label: "হোম", path: "/admin" },
  { icon: Users, label: "সদস্য", path: "/admin/members" },
  { icon: Film, label: "শুটিং", path: "/admin/shootings" },
  { icon: FileText, label: "স্ক্রিপ্ট", path: "/admin/scripts" },
  { icon: CreditCard, label: "পেমেন্ট", path: "/admin/payments" },
];

const memberTabs = [
  { icon: Home, label: "হোম", path: "/" },
  { icon: LayoutDashboard, label: "ড্যাশবোর্ড", path: "/dashboard" },
];

export function MobileBottomNav() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = isAdmin ? adminTabs : memberTabs;

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-xl border-t border-border/30" />
      
      <div className="relative flex items-end justify-around px-1 pb-safe-bottom">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center pt-2 pb-1.5 px-3 min-w-[56px] group"
            >
              {active && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <tab.icon
                className={`h-5 w-5 transition-colors duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 font-medium transition-colors duration-200 ${
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
  );
}
