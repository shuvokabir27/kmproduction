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
  X,
  LogOut,
  ScrollText,
  Megaphone,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const adminTabs = [
  { icon: LayoutDashboard, label: "হোম", path: "/admin" },
  { icon: Calendar, label: "হাজিরা", path: "/admin/attendance" },
  { icon: CreditCard, label: "পেমেন্ট", path: "/admin/payments" },
  { icon: Film, label: "শুটিং", path: "/admin/shootings" },
  { icon: MoreHorizontal, label: "আরো", path: "__more__" },
];

const moreItems = [
  { icon: Users, label: "সদস্য", path: "/admin/members" },
  { icon: FileText, label: "স্ক্রিপ্ট", path: "/admin/scripts" },
  { icon: Tv, label: "চ্যানেল", path: "/admin/channels" },
  { icon: Megaphone, label: "নোটিশ", path: "/admin/notices" },
  { icon: Home, label: "পাবলিক সাইট", path: "/" },
];

const memberTabs = [
  { icon: Home, label: "হোম", path: "/" },
  { icon: LayoutDashboard, label: "ড্যাশবোর্ড", path: "/dashboard" },
  { icon: ScrollText, label: "স্ক্রিপ্ট", path: "/scripts" },
  { icon: MoreHorizontal, label: "আরো", path: "__more__" },
];

const memberMoreItems = [
  { icon: LogOut, label: "লগআউট", path: "__logout__" },
];

export function MobileBottomNav() {
  const { isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const tabs = isAdmin ? adminTabs : memberTabs;
  const currentMoreItems = isAdmin ? moreItems : memberMoreItems;

  const isActive = (path: string) => {
    if (path === "__more__") {
      return moreOpen || currentMoreItems.some(
        (m) =>
          m.path === location.pathname ||
          (m.path !== "/" && m.path !== "__logout__" && location.pathname.startsWith(m.path))
      );
    }
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60]"
            onClick={() => setMoreOpen(false)}
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-20 left-3 right-3 z-[61] pb-safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card/95 backdrop-blur-xl border border-border/30 rounded-2xl shadow-2xl shadow-black/30 p-3 space-y-1">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-border/20">
                  <span className="text-xs font-semibold text-foreground">আরো অপশন</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                {currentMoreItems.map((item, index) => {
                  const isLogout = item.path === "__logout__";
                  const active = !isLogout && (item.path === location.pathname || (item.path !== "/" && location.pathname.startsWith(item.path)));
                  return (
                    <motion.button
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={async () => {
                        if (isLogout) {
                          await signOut();
                          navigate("/login");
                        } else {
                          navigate(item.path);
                        }
                        setMoreOpen(false);
                      }}
                      whileTap={{ scale: 0.97, rotateX: 3 }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                        isLogout
                          ? "hover:bg-destructive/10 active:bg-destructive/20 border border-transparent"
                          : active
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-secondary/50 active:bg-secondary border border-transparent"
                      }`}
                      style={{ perspective: "600px", transformStyle: "preserve-3d" }}
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        isLogout ? "bg-destructive/10" : active ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        <item.icon className={`h-4.5 w-4.5 ${isLogout ? "text-destructive" : active ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-sm font-medium ${isLogout ? "text-destructive" : active ? "text-primary" : "text-foreground"}`}>
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border/20" />

        <div className="relative flex items-end justify-around px-1 pb-safe-bottom">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const isMore = tab.path === "__more__";
            const isPressed = pressedTab === tab.path;
            return (
              <motion.button
                key={tab.path}
                onTouchStart={() => setPressedTab(tab.path)}
                onTouchEnd={() => setPressedTab(null)}
                onTouchCancel={() => setPressedTab(null)}
                onClick={() => {
                  if (isMore) {
                    setMoreOpen(!moreOpen);
                  } else {
                    setMoreOpen(false);
                    navigate(tab.path);
                  }
                }}
                animate={{
                  scale: isPressed ? 0.85 : 1,
                  rotateX: isPressed ? 15 : 0,
                  y: isPressed ? 2 : 0,
                }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="relative flex flex-col items-center pt-2 pb-1.5 px-3 min-w-[56px]"
                style={{ perspective: "400px", transformStyle: "preserve-3d" }}
              >
                {active && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-8 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{ boxShadow: "0 0 8px hsl(var(--primary) / 0.5)" }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: isPressed ? 1.15 : 1,
                    y: active ? -1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <tab.icon
                    className={`h-5 w-5 transition-colors duration-150 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </motion.div>
                <span
                  className={`text-[10px] mt-0.5 font-medium transition-colors duration-150 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>

                {/* 3D press shadow effect */}
                {isPressed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.15, scale: 1.5 }}
                    className="absolute inset-0 rounded-xl bg-primary"
                    style={{ filter: "blur(8px)" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
