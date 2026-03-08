import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Film,
  FileText,
  Settings,
  LogOut,
  Home,
  Tv,
  Megaphone,
  Gift,
  MessageCircle,
  Globe,
  Play,
  Phone,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const teamItems = [
  { title: "ড্যাশবোর্ড", url: "/admin", icon: LayoutDashboard },
  { title: "সদস্য", url: "/admin/members", icon: Users },
  { title: "শুটিং", url: "/admin/shootings", icon: Film },
  { title: "স্ক্রিপ্ট", url: "/admin/scripts", icon: FileText },
  { title: "হাজিরা", url: "/admin/attendance", icon: Calendar },
  { title: "পেমেন্ট", url: "/admin/payments", icon: CreditCard },
  { title: "বোনাস", url: "/admin/bonuses", icon: Gift },
  { title: "নোটিশ", url: "/admin/notices", icon: Megaphone },
  { title: "চ্যাট", url: "/chat", icon: MessageCircle },
];

const publicSiteItems = [
  { title: "পাবলিক প্রোফাইল", url: "/admin/public-profiles", icon: Globe },
  { title: "জনপ্রিয় কাজ", url: "/admin/popular-videos", icon: Play },
  { title: "সেবা / প্যাকেজ", url: "/admin/services", icon: Sparkles },
  { title: "ছবি গ্যালারী", url: "/admin/gallery", icon: ImageIcon },
  { title: "চ্যানেল", url: "/admin/channels", icon: Tv },
  { title: "যোগাযোগ সেটিংস", url: "/admin/contact-settings", icon: Phone },
];

const memberItems = [
  { title: "আমার ড্যাশবোর্ড", url: "/dashboard", icon: LayoutDashboard },
  { title: "চ্যাট", url: "/chat", icon: MessageCircle },
  { title: "সেটিংস", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const renderItems = (items: typeof teamItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className="hover:bg-secondary/80 transition-colors"
              activeClassName="bg-secondary text-primary font-medium"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="KM Production House" className="h-8 w-8 rounded-lg flex-shrink-0 object-contain" />
          {!collapsed && (
            <span className="font-semibold text-foreground text-sm tracking-tight">KM Production</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isAdmin ? (
          <>
            {/* Team Management */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                টিম ম্যানেজমেন্ট
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderItems(teamItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Public Site Management */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                পাবলিক সাইট
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/" className="hover:bg-secondary/80 transition-colors" activeClassName="">
                        <Home className="mr-2 h-4 w-4" />
                        {!collapsed && <span>সাইট দেখুন</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
                {renderItems(publicSiteItems)}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
              মেনু
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {renderItems(memberItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">
            {profile.full_name}
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className="w-full text-muted-foreground hover:text-destructive justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "লগআউট"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
