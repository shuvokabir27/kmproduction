import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();

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
            {/* Desktop: sidebar trigger; Mobile: app title */}
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
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
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

          {/* Main content — extra bottom padding on mobile for nav bar */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
