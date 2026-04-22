import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { usePresenceTracker } from "@/hooks/usePresence";
import { playMessageSound } from "@/lib/sounds";
import { supabase } from "@/integrations/supabase/client";
import { ChatPopup } from "@/components/chat/ChatPopup";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Globe } from "lucide-react";
import { OnlineUsersBar } from "@/components/OnlineUsersBar";
import { LiveClockBar } from "@/components/LiveClockBar";
import { WeatherWidget } from "@/components/WeatherWidget";
import { NewsTickerBar } from "@/components/NewsTickerBar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isOnChat = location.pathname === "/chat";
  const { data: unreadCount } = useUnreadMessages();
  const prevUnreadRef = useRef<number | undefined>(undefined);
  usePresenceTracker();
  usePushNotifications();

  // Update tab title with unread count
  useEffect(() => {
    const base = "KM Production House";
    if (unreadCount && unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? "99+" : unreadCount}) ${base}`;
    } else {
      document.title = base;
    }
  }, [unreadCount]);

  // Play sound when unread count increases (user not on chat page)
  useEffect(() => {
    if (!isOnChat && prevUnreadRef.current !== undefined && unreadCount !== undefined && unreadCount > prevUnreadRef.current) {
      playMessageSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, isOnChat]);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background noise-bg">
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
              <Link
                to="/"
                title="পাবলিক সাইট দেখুন"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">সাইট দেখুন</span>
              </Link>
              <WeatherWidget />
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

          {/* Live clock + dates bar */}
          <LiveClockBar />

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>

        {/* Chat Popup Widget */}
        {user && <ChatPopup unreadCount={unreadCount ?? 0} />}

        {/* Mobile bottom navigation */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
