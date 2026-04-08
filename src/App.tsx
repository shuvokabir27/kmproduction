import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
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
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<PublicHome />} />
            <Route path="/member/:memberId" element={<PublicProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services" element={<Services />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/scripts" element={<MemberScripts />} />
            <Route path="/notifications" element={<AllNotifications />} />
            <Route path="/settings" element={<MemberSettings />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/attendance" element={<AdminAttendance />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/shootings" element={<AdminShootings />} />
            <Route path="/admin/shooting-expenses" element={<AdminShootingExpenses />} />
            <Route path="/admin/channels" element={<AdminChannels />} />
            <Route path="/admin/scripts" element={<AdminScripts />} />
            <Route path="/admin/scripts/:id" element={<AdminScriptEdit />} />
            <Route path="/admin/bonuses" element={<AdminBonuses />} />
            <Route path="/admin/notices" element={<AdminNotices />} />
            <Route path="/admin/public-profiles" element={<AdminPublicProfiles />} />
            <Route path="/admin/popular-videos" element={<AdminPopularVideos />} />
            <Route path="/admin/contact-settings" element={<AdminContactSettings />} />
            <Route path="/admin/gallery" element={<AdminGallery />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/freelance" element={<AdminFreelance />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:category/:postNumber" element={<News />} />
            <Route path="/news/:shortId" element={<News />} />
            <Route path="/publisher/:publisherId" element={<PublisherProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
