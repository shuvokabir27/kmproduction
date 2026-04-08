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
  Gift,
  MessageCircle,
  Play,
  Phone,
  Image as ImageIcon,
  Sparkles,
  Newspaper,
  Globe,
  Briefcase,
  Receipt,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const adminTabs = [
  { icon: LayoutDashboard, label: "হোম", path: "/admin", color: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: Calendar, label: "হাজিরা", path: "/admin/attendance", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { icon: CreditCard, label: "পেমেন্ট", path: "/admin/payments", color: "text-amber-400", bg: "bg-amber-500/15" },
  { icon: Film, label: "শুটিং", path: "/admin/shootings", color: "text-rose-400", bg: "bg-rose-500/15" },
  { icon: MoreHorizontal, label: "আরো", path: "__more__", color: "text-sky-400", bg: "bg-sky-500/15" },
];

const moreItems = [
  { icon: null, label: "— টিম ম্যানেজমেন্ট —", path: "__divider__", color: "", bg: "" },
  { icon: Users, label: "সদস্য", path: "/admin/members", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Briefcase, label: "বাইরের কাজ", path: "/admin/freelance", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: FileText, label: "স্ক্রিপ্ট", path: "/admin/scripts", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  { icon: Gift, label: "বোনাস", path: "/admin/bonuses", color: "text-green-400", bg: "bg-green-500/10" },
  { icon: Receipt, label: "শুটিং খরচ", path: "/admin/shooting-expenses", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Megaphone, label: "নোটিশ", path: "/admin/notices", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: MessageCircle, label: "চ্যাট", path: "/chat", color: "text-sky-400", bg: "bg-sky-500/10" },
  { icon: null, label: "— পাবলিক সাইট —", path: "__divider2__", color: "", bg: "" },
  { icon: Home, label: "সাইট দেখুন", path: "/", color: "text-teal-400", bg: "bg-teal-500/10" },
  { icon: Newspaper, label: "নিউজ", path: "/admin/news", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Sparkles, label: "সেবা / প্যাকেজ", path: "/admin/services", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Tv, label: "চ্যানেল", path: "/admin/channels", color: "text-lime-400", bg: "bg-lime-500/10" },
  { icon: Play, label: "জনপ্রিয় কাজ", path: "/admin/popular-videos", color: "text-pink-400", bg: "bg-pink-500/10" },
  { icon: ImageIcon, label: "ছবি গ্যালারী", path: "/admin/gallery", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { icon: Phone, label: "যোগাযোগ সেটিংস", path: "/admin/contact-settings", color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Globe, label: "পাবলিক প্রোফাইল", path: "/admin/public-profiles", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: null, label: "— অন্যান্য —", path: "__divider3__", color: "", bg: "" },
  { icon: Settings, label: "সেটিংস", path: "/admin/settings", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: LogOut, label: "লগআউট", path: "__logout__", color: "text-destructive", bg: "bg-destructive/10" },
];

const memberTabs = [
  { icon: LayoutDashboard, label: "ড্যাশবোর্ড", path: "/dashboard", color: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: MessageCircle, label: "চ্যাট", path: "/chat", color: "text-sky-400", bg: "bg-sky-500/15" },
  { icon: ScrollText, label: "স্ক্রিপ্ট", path: "/scripts", color: "text-fuchsia-400", bg: "bg-fuchsia-500/15" },
  { icon: MoreHorizontal, label: "আরো", path: "__more__", color: "text-amber-400", bg: "bg-amber-500/15" },
];

const memberMoreItems = [
  { icon: Home, label: "সাইট দেখুন", path: "/", color: "text-teal-400", bg: "bg-teal-500/10" },
  { icon: Settings, label: "সেটিংস", path: "/settings", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: LogOut, label: "লগআউট", path: "__logout__", color: "text-destructive", bg: "bg-destructive/10" },
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
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] overflow-y-auto px-3 py-4 pb-24"
            onClick={() => setMoreOpen(false)}
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-[61] mx-auto w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative max-h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card/95 to-secondary/30 p-2 shadow-2xl shadow-primary/10 backdrop-blur-xl">
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/15 blur-2xl" />
                <div className="absolute top-1/2 right-0 h-24 w-24 rounded-full bg-secondary/70 blur-2xl" />

                <div className="relative z-10 mb-2 flex items-center justify-between border-b border-border/20 px-2 pb-2">
                  <span className="text-xs font-bold tracking-wide text-foreground">✨ আরো অপশন</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border/30 bg-secondary/80 transition-transform active:scale-90"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>

                <div className="relative z-10 max-h-[calc(100vh-200px)] overflow-y-auto overscroll-contain pr-1">
                  {(() => {
                    const groups: { label?: string; items: typeof currentMoreItems }[] = [];
                    let currentGroup: typeof currentMoreItems = [];
                    let currentLabel: string | undefined;

                    currentMoreItems.forEach((item) => {
                      if (item.path.startsWith("__divider")) {
                        if (currentGroup.length > 0) groups.push({ label: currentLabel, items: currentGroup });
                        currentLabel = item.label.replace(/—/g, "").trim();
                        currentGroup = [];
                      } else {
                        currentGroup.push(item);
                      }
                    });

                    if (currentGroup.length > 0) groups.push({ label: currentLabel, items: currentGroup });

                    return groups.map((group, gi) => (
                      <div key={gi} className="relative z-10 mb-1">
                        {group.label && (
                          <div className="px-2 pb-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {group.label}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-1.5">
                          {group.items.map((item, index) => {
                            const isLogout = item.path === "__logout__";
                            const active =
                              !isLogout &&
                              (item.path === location.pathname ||
                                (item.path !== "/" && location.pathname.startsWith(item.path)));

                            return (
                              <motion.button
                                key={item.path}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 25 }}
                                onClick={async () => {
                                  if (isLogout) {
                                    await signOut();
                                    navigate("/login");
                                  } else {
                                    navigate(item.path);
                                  }
                                  setMoreOpen(false);
                                }}
                                whileTap={{ scale: 0.92 }}
                                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-all ${
                                  isLogout
                                    ? "border-destructive/20 bg-destructive/5"
                                    : active
                                      ? "border-border/40 bg-secondary/60"
                                      : "border-transparent hover:bg-secondary/30"
                                }`}
                              >
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    isLogout ? "bg-destructive/10" : item.bg
                                  }`}
                                >
                                  {item.icon && <item.icon className={`h-4 w-4 ${item.color}`} />}
                                </div>
                                <span className={`text-center text-[10px] font-semibold leading-tight ${item.color}`}>
                                  {item.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  y: isPressed ? 2 : 0,
                }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="relative flex min-w-[60px] flex-col items-center px-2 pb-1.5 pt-2"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute left-1/2 top-0 h-[3px] w-10 -translate-x-1/2 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{
                      background: "var(--tw-gradient-stops, currentColor)",
                      backgroundColor: "currentColor",
                    }}
                  >
                    <div className={`h-full w-full rounded-full ${tab.bg}`} style={{ opacity: 1, background: "inherit" }} />
                  </motion.div>
                )}
                <motion.div
                  animate={{
                    scale: isPressed ? 1.2 : active ? 1.1 : 1,
                    y: active ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? tab.bg : ""}`}
                >
                  <tab.icon className={`h-[22px] w-[22px] transition-colors duration-150 ${tab.color}`} />
                </motion.div>
                <span className={`mt-0.5 text-[11px] font-semibold transition-colors duration-150 ${tab.color}`}>
                  {tab.label}
                </span>

                {isPressed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.12, scale: 1.5 }}
                    className={`absolute inset-0 rounded-xl ${tab.bg}`}
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
