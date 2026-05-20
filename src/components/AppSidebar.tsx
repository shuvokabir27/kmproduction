import {
  Briefcase,
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
  Receipt,
  ClipboardList,
  ShoppingBag,
  ListTodo,
  Calculator,
  Wallet,
  Smartphone,
  Mic,
  ShieldCheck,
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
import { usePermissions } from "@/hooks/usePermissions";


const teamWorkItems = [
  { title: "ড্যাশবোর্ড", url: "/admin", icon: LayoutDashboard, color: "text-violet-400", bg: "bg-violet-500/10" },
  { title: "সদস্য", url: "/admin/members", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "হাজিরা", url: "/admin/attendance", icon: Calendar, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { title: "শুটিং", url: "/admin/shootings", icon: Film, color: "text-rose-400", bg: "bg-rose-500/10" },
  { title: "শুটিং খরচ", url: "/admin/shooting-expenses", icon: Receipt, color: "text-red-400", bg: "bg-red-500/10" },
  { title: "স্ক্রিপ্ট", url: "/admin/scripts", icon: FileText, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  { title: "ভয়েস নোট", url: "/admin/voice-notes", icon: Mic, color: "text-pink-400", bg: "bg-pink-500/10" },
  { title: "টাস্ক", url: "/tasks", icon: ListTodo, color: "text-purple-400", bg: "bg-purple-500/10" },
  { title: "চ্যাট", url: "/chat", icon: MessageCircle, color: "text-sky-400", bg: "bg-sky-500/10" },
  { title: "নোটিশ", url: "/admin/notices", icon: Megaphone, color: "text-orange-400", bg: "bg-orange-500/10" },
  { title: "বাইরের কাজ", url: "/admin/freelance", icon: Briefcase, color: "text-orange-400", bg: "bg-orange-500/10" },
  { title: "সেটিংস", url: "/admin/settings", icon: Settings, color: "text-amber-400", bg: "bg-amber-500/10" },
  { title: "রোল ম্যানেজমেন্ট", url: "/admin/role-management", icon: ShieldCheck, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { title: "ফিচার টগল", url: "/admin/feature-toggles", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "অ্যাপ ভার্সন", url: "/admin/app-versions", icon: Smartphone, color: "text-green-400", bg: "bg-green-500/10" },
];

const accountItems = [
  { title: "পেমেন্ট", url: "/admin/payments", icon: CreditCard, color: "text-amber-400", bg: "bg-amber-500/10" },
  { title: "বেতন আপডেট", url: "/admin/salary-updates", icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "বোনাস", url: "/admin/bonuses", icon: Gift, color: "text-green-400", bg: "bg-green-500/10" },
  { title: "একাউন্ট চেকিং", url: "/admin/account-checking", icon: Calculator, color: "text-indigo-400", bg: "bg-indigo-500/10" },
];

const publicSiteItems = [
  { title: "পাবলিক প্রোফাইল", url: "/admin/public-profiles", icon: Globe, color: "text-teal-400", bg: "bg-teal-500/10" },
  { title: "অভিনেতা পোর্টফোলিও", url: "/admin/actor-editor", icon: Film, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  { title: "নিউজ", url: "/admin/news", icon: Newspaper, color: "text-red-400", bg: "bg-red-500/10" },
  { title: "জনপ্রিয় কাজ", url: "/admin/popular-videos", icon: Play, color: "text-pink-400", bg: "bg-pink-500/10" },
  { title: "সেবা / প্যাকেজ", url: "/admin/services", icon: Sparkles, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  
  { title: "বুকিং", url: "/admin/bookings", icon: ClipboardList, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "ছবি গ্যালারী", url: "/admin/gallery", icon: ImageIcon, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { title: "চ্যানেল", url: "/admin/channels", icon: Tv, color: "text-lime-400", bg: "bg-lime-500/10" },
  { title: "যোগাযোগ সেটিংস", url: "/admin/contact-settings", icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10" },
];

const memberItems = [
  { title: "আমার ড্যাশবোর্ড", url: "/dashboard", icon: LayoutDashboard, color: "text-violet-400", bg: "bg-violet-500/10" },
  { title: "টাস্ক", url: "/tasks", icon: ListTodo, color: "text-purple-400", bg: "bg-purple-500/10" },
  { title: "চ্যাট", url: "/chat", icon: MessageCircle, color: "text-sky-400", bg: "bg-sky-500/10" },
  { title: "সেটিংস", url: "/settings", icon: Settings, color: "text-amber-400", bg: "bg-amber-500/10" },
];

const permissionMenuMap: Record<string, { title: string; url: string; icon: any; color: string; bg: string }> = {
  shooting_expenses: { title: "শুটিং খরচ", url: "/admin/shooting-expenses", icon: Receipt, color: "text-red-400", bg: "bg-red-500/10" },
  shootings: { title: "শুটিং", url: "/admin/shootings", icon: Film, color: "text-rose-400", bg: "bg-rose-500/10" },
  attendance: { title: "হাজিরা", url: "/admin/attendance", icon: Calendar, color: "text-cyan-400", bg: "bg-cyan-500/10" },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, isProductAdmin, profile, signOut } = useAuth();
  const { permissions } = usePermissions();
  const location = useLocation();


  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const renderItems = (items: typeof teamWorkItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const isPayments = item.url === "/admin/payments";
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end={item.url === "/admin"}
                className={
                  isPayments
                    ? "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-l-2 border-amber-400 hover:from-amber-500/25 hover:via-amber-500/15 transition-colors shadow-sm shadow-amber-500/10"
                    : "hover:bg-secondary/80 transition-colors"
                }
                activeClassName={
                  isPayments
                    ? "from-amber-500/30 via-amber-500/20 font-bold ring-1 ring-amber-400/40"
                    : "bg-secondary font-medium"
                }
              >
                <div className={`h-6 w-6 rounded-md ${item.bg} flex items-center justify-center mr-2 shrink-0`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
                {!collapsed && (
                  <span className={`${item.color} ${isPayments ? "font-bold" : ""}`}>
                    {item.title}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
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
        {isProductAdmin && !isAdmin ? (
          /* Product Admin only sidebar */
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
              প্রডাক্ট ম্যানেজমেন্ট
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {renderItems([
                { title: "প্রডাক্ট", url: "/admin/products", icon: ShoppingBag, color: "text-orange-400", bg: "bg-orange-500/10" },
              ])}
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
            </SidebarGroupContent>
          </SidebarGroup>
        ) : isAdmin ? (
          <>
            {/* Team & Work */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                টিম ও কাজ
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderItems(teamWorkItems)}
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Account & Payment */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                একাউন্ট ও পেমেন্ট
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderItems(accountItems)}
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
              {renderItems([
                ...memberItems,
                ...permissions.map((p) => permissionMenuMap[p]).filter(Boolean),
              ])}
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
