import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, History, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { path: "/client", label: "ড্যাশবোর্ড", icon: Sparkles, activeColor: "text-primary", activeBg: "bg-primary/25", inactiveBg: "bg-primary/10" },
    { path: "/client/payments", label: "পেমেন্ট হিস্ট্রি", icon: History, activeColor: "text-emerald-400", activeBg: "bg-emerald-500/25", inactiveBg: "bg-emerald-500/10" },
    { path: "/client/projects", label: "প্রজেক্ট সমূহ", icon: FileText, activeColor: "text-violet-400", activeBg: "bg-violet-500/25", inactiveBg: "bg-violet-500/10" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border/20" />
      <div className="relative flex items-center justify-around px-2 py-2 pb-safe-bottom">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl active:scale-90 transition-transform", isActive && "scale-105")}
            >
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isActive ? tab.activeBg : tab.inactiveBg)}>
                <Icon className={cn("h-4 w-4", isActive ? tab.activeColor : "text-muted-foreground")} />
              </div>
              <span className={cn("text-[10px] font-semibold", isActive ? tab.activeColor : "text-muted-foreground")}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
