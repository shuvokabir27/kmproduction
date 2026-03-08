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
  Newspaper,
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
  { title: "ড্যাশবোর্ড", url: "/admin", icon: LayoutDashboard, color: "text-violet-400", bg: "bg-violet-500/10" },
  { title: "সদস্য", url: "/admin/members", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "শুটিং", url: "/admin/shootings", icon: Film, color: "text-rose-400", bg: "bg-rose-500/10" },
  { title: "স্ক্রিপ্ট", url: "/admin/scripts", icon: FileText, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  { title: "হাজিরা", url: "/admin/attendance", icon: Calendar, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { title: "পেমেন্ট", url: "/admin/payments", icon: CreditCard, color: "text-amber-400", bg: "bg-amber-500/10" },
  { title: "বোনাস", url: "/admin/bonuses", icon: Gift, color: "text-green-400", bg: "bg-green-500/10" },
  { title: "নোটিশ", url: "/admin/notices", icon: Megaphone, color: "text-orange-400", bg: "bg-orange-500/10" },
  { title: "নিউজ", url: "/admin/news", icon: Newspaper, color: "text-red-400", bg: "bg-red-500/10" },
  { title: "চ্যাট", url: "/chat", icon: MessageCircle, color: "text-sky-400", bg: "bg-sky-500/10" },
];

const publicSiteItems = [
  { title: "পাবলিক প্রোফাইল", url: "/admin/public-profiles", icon: Globe, color: "text-teal-400", bg: "bg-teal-500/10" },
  { title: "জনপ্রিয় কাজ", url: "/admin/popular-videos", icon: Play, color: "text-pink-400", bg: "bg-pink-500/10" },
  { title: "সেবা / প্যাকেজ", url: "/admin/services", icon: Sparkles, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { title: "ছবি গ্যালারী", url: "/admin/gallery", icon: ImageIcon, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { title: "চ্যানেল", url: "/admin/channels", icon: Tv, color: "text-lime-400", bg: "bg-lime-500/10" },
  { title: "যোগাযোগ সেটিংস", url: "/admin/contact-settings", icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10" },
];

const memberItems = [
  { title: "আমার ড্যাশবোর্ড", url: "/dashboard", icon: LayoutDashboard, color: "text-violet-400", bg: "bg-violet-500/10" },
  { title: "চ্যাট", url: "/chat", icon: MessageCircle, color: "text-sky-400", bg: "bg-sky-500/10" },
  { title: "সেটিংস", url: "/settings", icon: Settings, color: "text-amber-400", bg: "bg-amber-500/10" },
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
              activeClassName="bg-secondary font-medium"
            >
              <div className={`h-6 w-6 rounded-md ${item.bg} flex items-center justify-center mr-2 shrink-0`}>
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              {!collapsed && <span className={item.color}>{item.title}</span>}
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
                        <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center mr-2 shrink-0">
                          <Home className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
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
