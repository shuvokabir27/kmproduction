import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Film,
  Settings,
  LogOut,
  Home,
  Tv,
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

const adminItems = [
  { title: "ড্যাশবোর্ড", url: "/admin", icon: LayoutDashboard },
  { title: "সদস্য", url: "/admin/members", icon: Users },
  { title: "শুটিং", url: "/admin/shootings", icon: Film },
  { title: "স্ক্রিপ্ট", url: "/admin/scripts", icon: FileText },
  { title: "হাজিরা", url: "/admin/attendance", icon: Calendar },
  { title: "পেমেন্ট", url: "/admin/payments", icon: CreditCard },
  { title: "চ্যানেল", url: "/admin/channels", icon: Tv },
];

const memberItems = [
  { title: "আমার ড্যাশবোর্ড", url: "/dashboard", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, profile, signOut } = useAuth();
  const location = useLocation();

  const items = isAdmin ? adminItems : memberItems;

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            {isAdmin ? "এডমিন" : "মেনু"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-secondary/80 transition-colors" activeClassName="">
                    <Home className="mr-2 h-4 w-4" />
                    {!collapsed && <span>পাবলিক সাইট</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
          </SidebarGroupContent>
        </SidebarGroup>
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
