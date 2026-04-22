import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { RouteGuard } from "@/components/RouteGuard";
import PublicHome from "./pages/PublicHome";
import PublicProfile from "./pages/PublicProfile";
import Login from "./pages/Login";
import MemberDashboard from "./pages/MemberDashboard";
import MemberScripts from "./pages/MemberScripts";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMembers from "./pages/AdminMembers";
import AdminAttendance from "./pages/AdminAttendance";
import AdminPayments from "./pages/AdminPayments";
import AdminShootings from "./pages/AdminShootings";
import AdminShootingExpenses from "./pages/AdminShootingExpenses";
import AdminChannels from "./pages/AdminChannels";
import AdminScripts from "./pages/AdminScripts";
import AdminScriptEdit from "./pages/AdminScriptEdit";
import AdminNotices from "./pages/AdminNotices";
import AdminBonuses from "./pages/AdminBonuses";
import AdminAdvances from "./pages/AdminAdvances";
import AdminPublicProfiles from "./pages/AdminPublicProfiles";
import AdminPopularVideos from "./pages/AdminPopularVideos";
import Chat from "./pages/Chat";
import AdminContactSettings from "./pages/AdminContactSettings";
import AdminGallery from "./pages/AdminGallery";
import Services from "./pages/Services";
import AdminServices from "./pages/AdminServices";
import ResetPassword from "./pages/ResetPassword";
import AllNotifications from "./pages/AllNotifications";
import MemberSettings from "./pages/MemberSettings";
import AdminNews from "./pages/AdminNews";
import AdminSettings from "./pages/AdminSettings";
import News from "./pages/News";
import PublisherProfile from "./pages/PublisherProfile";
import AdminBookings from "./pages/AdminBookings";
import AdminFreelance from "./pages/AdminFreelance";
import FreelanceClientView from "./pages/FreelanceClientView";
import ScriptDrawing from "./pages/ScriptDrawing";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProjects from "./pages/ClientProjects";
import ClientPaymentHistory from "./pages/ClientPaymentHistory";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import AdminProducts from "./pages/AdminProducts";
import TalerGurLanding from "./pages/TalerGurLanding";
import TasksPage from "./pages/TasksPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicHome />} />
            <Route path="/member/:memberId" element={<PublicProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services" element={<Services />} />
            <Route path="/products" element={<TalerGurLanding />} />
            <Route path="/taler-gur" element={<TalerGurLanding />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:category/:postNumber" element={<News />} />
            <Route path="/news/:shortId" element={<News />} />
            <Route path="/publisher/:publisherId" element={<PublisherProfile />} />
            <Route path="/project/:token" element={<FreelanceClientView />} />

            {/* Member routes — admin & member only, NOT client */}
            <Route path="/dashboard" element={<RouteGuard allowedRoles={["admin", "member"]}><MemberDashboard /></RouteGuard>} />
            <Route path="/scripts" element={<RouteGuard allowedRoles={["admin", "member"]}><MemberScripts /></RouteGuard>} />
            <Route path="/notifications" element={<RouteGuard allowedRoles={["admin", "member"]}><AllNotifications /></RouteGuard>} />
            <Route path="/settings" element={<RouteGuard allowedRoles={["admin", "member"]}><MemberSettings /></RouteGuard>} />
            <Route path="/chat" element={<RouteGuard allowedRoles={["admin", "member"]}><Chat /></RouteGuard>} />
            <Route path="/tasks" element={<RouteGuard allowedRoles={["admin", "member"]}><TasksPage /></RouteGuard>} />

            {/* Admin routes */}
            <Route path="/admin" element={<RouteGuard allowedRoles={["admin"]}><AdminDashboard /></RouteGuard>} />
            <Route path="/admin/members" element={<RouteGuard allowedRoles={["admin"]}><AdminMembers /></RouteGuard>} />
            <Route path="/admin/attendance" element={<RouteGuard allowedRoles={["admin"]}><AdminAttendance /></RouteGuard>} />
            <Route path="/admin/payments" element={<RouteGuard allowedRoles={["admin"]}><AdminPayments /></RouteGuard>} />
            <Route path="/admin/shootings" element={<RouteGuard allowedRoles={["admin"]}><AdminShootings /></RouteGuard>} />
            <Route path="/admin/shooting-expenses" element={<RouteGuard allowedRoles={["admin"]}><AdminShootingExpenses /></RouteGuard>} />
            <Route path="/admin/channels" element={<RouteGuard allowedRoles={["admin"]}><AdminChannels /></RouteGuard>} />
            <Route path="/admin/scripts" element={<RouteGuard allowedRoles={["admin"]}><AdminScripts /></RouteGuard>} />
            <Route path="/admin/scripts/:id" element={<RouteGuard allowedRoles={["admin"]}><AdminScriptEdit /></RouteGuard>} />
            <Route path="/admin/scripts/:id/draw" element={<RouteGuard allowedRoles={["admin"]}><ScriptDrawing /></RouteGuard>} />
            <Route path="/admin/bonuses" element={<RouteGuard allowedRoles={["admin"]}><AdminBonuses /></RouteGuard>} />
            <Route path="/admin/notices" element={<RouteGuard allowedRoles={["admin"]}><AdminNotices /></RouteGuard>} />
            <Route path="/admin/public-profiles" element={<RouteGuard allowedRoles={["admin"]}><AdminPublicProfiles /></RouteGuard>} />
            <Route path="/admin/popular-videos" element={<RouteGuard allowedRoles={["admin"]}><AdminPopularVideos /></RouteGuard>} />
            <Route path="/admin/contact-settings" element={<RouteGuard allowedRoles={["admin"]}><AdminContactSettings /></RouteGuard>} />
            <Route path="/admin/gallery" element={<RouteGuard allowedRoles={["admin"]}><AdminGallery /></RouteGuard>} />
            <Route path="/admin/services" element={<RouteGuard allowedRoles={["admin"]}><AdminServices /></RouteGuard>} />
            <Route path="/admin/settings" element={<RouteGuard allowedRoles={["admin"]}><AdminSettings /></RouteGuard>} />
            <Route path="/admin/bookings" element={<RouteGuard allowedRoles={["admin"]}><AdminBookings /></RouteGuard>} />
            <Route path="/admin/freelance" element={<RouteGuard allowedRoles={["admin"]}><AdminFreelance /></RouteGuard>} />
            <Route path="/admin/news" element={<RouteGuard allowedRoles={["admin"]}><AdminNews /></RouteGuard>} />
            <Route path="/admin/products" element={<RouteGuard allowedRoles={["product_admin"]}><AdminProducts /></RouteGuard>} />
            <Route path="/products/admin" element={<RouteGuard allowedRoles={["product_admin"]}><AdminProducts /></RouteGuard>} />

            {/* Client route — client only */}
            <Route path="/client" element={<RouteGuard allowedRoles={["client"]}><ClientDashboard /></RouteGuard>} />
            <Route path="/client/projects" element={<RouteGuard allowedRoles={["client"]}><ClientProjects /></RouteGuard>} />
            <Route path="/client/payments" element={<RouteGuard allowedRoles={["client"]}><ClientPaymentHistory /></RouteGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
