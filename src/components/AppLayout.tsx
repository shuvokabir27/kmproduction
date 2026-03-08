import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { MessageCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnChat = location.pathname === "/chat";
  const { data: unreadCount } = useUnreadMessages();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="h-12 md:h-14 flex items-center justify-between border-b border-border/30 px-3 md:px-4 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>
              <div className="md:hidden flex items-center gap-2">
                <img src="/favicon.png" alt="Logo" className="h-7 w-7 rounded-lg object-contain" />
                <span className="font-semibold text-foreground text-sm">KM Production</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-primary text-xs font-medium">
                    {profile?.full_name?.charAt(0) || "U"}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>

        {/* Floating Chat Button */}
        {user && !isOnChat && (
          <button
            onClick={() => navigate("/chat")}
            className="fixed bottom-24 md:bottom-8 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ring-2 ring-primary/30"
          >
            <MessageCircle className="h-7 w-7" />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-6 min-w-6 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg shadow-red-500/40 animate-bounce">
                {unreadCount! > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Mobile bottom navigation */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
