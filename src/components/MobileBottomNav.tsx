import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
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
  Wallet,
  Calculator,
  Mic,
  ClipboardList,
  ListTodo,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

const permissionIconMap: Record<string, { icon: any; color: string; bg: string }> = {
  shooting_expenses: { icon: Receipt, color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  shootings: { icon: Film, color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  attendance: { icon: Calendar, color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
};

const adminTabs = [
  { icon: LayoutDashboard, label: "হোম", path: "/admin", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
  { icon: Calendar, label: "হাজিরা", path: "/admin/attendance", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
  { icon: CreditCard, label: "পেমেন্ট", path: "/admin/payments", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
  { icon: Film, label: "শুটিং", path: "/admin/shootings", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
  { icon: MoreHorizontal, label: "আরো", path: "__more__", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
];

const moreItems = [
  { icon: null, label: "— টিম ও কাজ —", path: "__divider__", color: "", bg: "" },
  { icon: Users, label: "সদস্য", path: "/admin/members", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: FileText, label: "স্ক্রিপ্ট", path: "/admin/scripts", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Mic, label: "ভয়েস নোট", path: "/admin/voice-notes", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: ListTodo, label: "টাস্ক", path: "/tasks", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Receipt, label: "শুটিং খরচ", path: "/admin/shooting-expenses", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Briefcase, label: "বাইরের কাজ", path: "/admin/freelance", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Megaphone, label: "নোটিশ", path: "/admin/notices", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: MessageCircle, label: "চ্যাট", path: "/chat", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: ShieldCheck, label: "রোল ম্যানেজমেন্ট", path: "/admin/role-management", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: ShieldCheck, label: "ফিচার টগল", path: "/admin/feature-toggles", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Smartphone, label: "অ্যাপ ভার্সন", path: "/admin/app-versions", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: null, label: "— একাউন্ট ও পেমেন্ট —", path: "__divider_acc__", color: "", bg: "" },
  { icon: Wallet, label: "বেতন আপডেট", path: "/admin/salary-updates", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Gift, label: "বোনাস", path: "/admin/bonuses", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Calculator, label: "একাউন্ট চেকিং", path: "/admin/account-checking", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: null, label: "— পাবলিক সাইট —", path: "__divider2__", color: "", bg: "" },
  { icon: Home, label: "সাইট দেখুন", path: "/", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Globe, label: "পাবলিক প্রোফাইল", path: "/admin/public-profiles", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Film, label: "অভিনেতা পোর্টফোলিও", path: "/admin/actor-editor", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Newspaper, label: "নিউজ", path: "/admin/news", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Sparkles, label: "সেবা / প্যাকেজ", path: "/admin/services", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: ClipboardList, label: "বুকিং", path: "/admin/bookings", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Tv, label: "চ্যানেল", path: "/admin/channels", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Play, label: "জনপ্রিয় কাজ", path: "/admin/popular-videos", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: ImageIcon, label: "ছবি গ্যালারী", path: "/admin/gallery", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: Phone, label: "যোগাযোগ সেটিংস", path: "/admin/contact-settings", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: null, label: "— অন্যান্য —", path: "__divider3__", color: "", bg: "" },
  { icon: Settings, label: "সেটিংস", path: "/admin/settings", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" },
  { icon: LogOut, label: "লগআউট", path: "__logout__", color: "text-destructive", bg: "bg-destructive/10" },
];

const memberTabsBase = [
  { icon: LayoutDashboard, label: "ড্যাশবোর্ড", path: "/dashboard", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
  { icon: MessageCircle, label: "চ্যাট", path: "/chat", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
  { icon: ScrollText, label: "স্ক্রিপ্ট", path: "/scripts", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" },
];

export function MobileBottomNav() {
  const { isAdmin, signOut } = useAuth();
  const { permissions } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  const memberMoreItems = useMemo(() => {
    const items: { icon: any; label: string; path: string; color: string; bg: string }[] = [];
    if (permissions.length > 0) {
      items.push({ icon: null, label: "— পারমিশন মেনু —", path: "__divider_perm__", color: "", bg: "" });
      permissions.forEach((p) => {
        const mapped = permissionIconMap[p];
        if (mapped) {
          items.push({
            icon: mapped.icon,
            label: p === "shooting_expenses" ? "শুটিং খরচ" : p === "shootings" ? "শুটিং" : "হাজিরা",
            path: p === "shooting_expenses" ? "/admin/shooting-expenses" : p === "shootings" ? "/admin/shootings" : "/admin/attendance",
            color: mapped.color,
            bg: mapped.bg,
          });
        }
      });
    }
    items.push({ icon: Home, label: "সাইট দেখুন", path: "/", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" });
    items.push({ icon: Settings, label: "সেটিংস", path: "/settings", color: "text-[#E2136E]", bg: "bg-[#E2136E]/10" });
    items.push({ icon: LogOut, label: "লগআউট", path: "__logout__", color: "text-destructive", bg: "bg-destructive/10" });
    return items;
  }, [permissions]);

  const memberTabs = useMemo(() => {
    const permTabs = permissions.map((p) => {
      const mapped = permissionIconMap[p];
      if (!mapped) return null;
      return {
        icon: mapped.icon,
        label: p === "shooting_expenses" ? "শুটিং খরচ" : p === "shootings" ? "শুটিং" : "হাজিরা",
        path: p === "shooting_expenses" ? "/admin/shooting-expenses" : p === "shootings" ? "/admin/shootings" : "/admin/attendance",
        color: mapped.color,
        bg: mapped.bg,
      };
    }).filter(Boolean) as { icon: any; label: string; path: string; color: string; bg: string }[];
    return [...memberTabsBase, ...permTabs, { icon: MoreHorizontal, label: "আরো", path: "__more__", color: "text-[#E2136E]", bg: "bg-[#E2136E]/15" }];
  }, [permissions]);

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
              <div className="relative max-h-[calc(100vh-100px)] overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-white via-white/95 to-[#E2136E]/5 p-2 shadow-2xl shadow-primary/10 backdrop-blur-xl">
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

                <div className="relative z-10 max-h-[calc(100vh-170px)] overflow-y-auto overscroll-contain pr-1 pb-24">
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
                                      ? "border-[#E2136E]/20 bg-[#E2136E]/10"
                                      : "border-transparent hover:bg-[#E2136E]/10"
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe-bottom">
        <div className="absolute inset-x-0 bottom-0 top-3 bg-card/95 backdrop-blur-xl border-t border-border/20" />

        <div className="relative flex items-end justify-around px-1 pt-3">
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
                  scale: isPressed ? 0.9 : 1,
                }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="relative flex min-w-[60px] flex-1 flex-col items-center pb-1.5"
              >
                {/* Curved cutout behind active icon */}
                {active && (
                  <motion.div
                    layoutId="mobile-tab-cutout"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 h-14 w-20 pointer-events-none"
                  >
                    <svg viewBox="0 0 80 56" className="h-full w-full" preserveAspectRatio="none">
                      <path
                        d="M0,15 Q0,15 8,15 Q20,15 22,5 Q26,-2 40,-2 Q54,-2 58,5 Q60,15 72,15 Q80,15 80,15 L80,56 L0,56 Z"
                        fill="hsl(var(--card))"
                        opacity="0.95"
                      />
                    </svg>
                  </motion.div>
                )}

                {/* Icon container — lifts when active */}
                <motion.div
                  animate={{
                    y: active ? -18 : 0,
                    scale: isPressed ? 1.15 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={`relative z-10 flex items-center justify-center rounded-full transition-colors ${
                    active
                      ? `h-12 w-12 ${tab.bg} shadow-lg ring-2 ring-card`
                      : tab.path === "/admin/payments"
                        ? "h-9 w-9 bg-gradient-to-br from-[#E2136E]/25 to-[#E2136E]/60/10 ring-2 ring-[#E2136E]/40 shadow-md shadow-[#E2136E]/20"
                        : "h-9 w-9"
                  }`}
                  style={
                    active
                      ? { boxShadow: `0 6px 16px -4px hsl(var(--foreground) / 0.25)` }
                      : undefined
                  }
                >
                  <tab.icon
                    className={`transition-all duration-200 ${tab.color} ${
                      active ? "h-6 w-6" : "h-[22px] w-[22px]"
                    }`}
                  />
                </motion.div>

                {/* Label — hidden when active (icon takes its place) */}
                <motion.span
                  animate={{
                    opacity: active ? 0 : 1,
                    height: active ? 0 : "auto",
                  }}
                  transition={{ duration: 0.2 }}
                  className={`mt-0.5 text-[11px] font-semibold ${tab.color} overflow-hidden`}
                >
                  {tab.label}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
