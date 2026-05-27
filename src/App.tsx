import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { RouteGuard } from "@/components/RouteGuard";
import { PermissionGuard } from "@/components/PermissionGuard";
import { CartProvider } from "@/hooks/useCart";
import { CartDrawer } from "@/components/CartDrawer";
import CustomCursor from "@/components/CustomCursor";

// Eager: landing page (most common first hit) for instant paint
import PublicHome from "./pages/PublicHome";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes — each becomes its own chunk so the initial bundle stays small
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ActorPortfolio = lazy(() => import("./pages/ActorPortfolio"));
const Login = lazy(() => import("./pages/Login"));
const MemberDashboard = lazy(() => import("./pages/MemberDashboard"));
const MemberScripts = lazy(() => import("./pages/MemberScripts"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminMembers = lazy(() => import("./pages/AdminMembers"));
const AdminAttendance = lazy(() => import("./pages/AdminAttendance"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminShootings = lazy(() => import("./pages/AdminShootings"));
const AdminShootingExpenses = lazy(() => import("./pages/AdminShootingExpenses"));
const AdminChannels = lazy(() => import("./pages/AdminChannels"));
const AdminScripts = lazy(() => import("./pages/AdminScripts"));
const AdminScriptEdit = lazy(() => import("./pages/AdminScriptEdit"));
const AdminVoiceNotes = lazy(() => import("./pages/AdminVoiceNotes"));
const AdminNotices = lazy(() => import("./pages/AdminNotices"));
const AdminBonuses = lazy(() => import("./pages/AdminBonuses"));
const AdminAdvances = lazy(() => import("./pages/AdminAdvances"));
const AdminAccountChecking = lazy(() => import("./pages/AdminAccountChecking"));
const AdminSalaryUpdates = lazy(() => import("./pages/AdminSalaryUpdates"));
const AdminPublicProfiles = lazy(() => import("./pages/AdminPublicProfiles"));
const AdminActorEditor = lazy(() => import("./pages/AdminActorEditor"));
const AdminPopularVideos = lazy(() => import("./pages/AdminPopularVideos"));
const Chat = lazy(() => import("./pages/Chat"));
const AdminContactSettings = lazy(() => import("./pages/AdminContactSettings"));
const AdminGallery = lazy(() => import("./pages/AdminGallery"));
const Services = lazy(() => import("./pages/Services"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const AdminServices = lazy(() => import("./pages/AdminServices"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AllNotifications = lazy(() => import("./pages/AllNotifications"));
const MemberSettings = lazy(() => import("./pages/MemberSettings"));
const AdminNews = lazy(() => import("./pages/AdminNews"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const News = lazy(() => import("./pages/News"));
const PublisherProfile = lazy(() => import("./pages/PublisherProfile"));
const AdminBookings = lazy(() => import("./pages/AdminBookings"));
const AdminFreelance = lazy(() => import("./pages/AdminFreelance"));
const FreelanceClientView = lazy(() => import("./pages/FreelanceClientView"));
const ScriptDrawing = lazy(() => import("./pages/ScriptDrawing"));
const AdminDeliverySettings = lazy(() => import("./pages/AdminDeliverySettings"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientProjects = lazy(() => import("./pages/ClientProjects"));
const ClientPaymentHistory = lazy(() => import("./pages/ClientPaymentHistory"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ShopCustomerLogin = lazy(() => import("./pages/ShopCustomerLogin"));
const ShopCustomerAccount = lazy(() => import("./pages/ShopCustomerAccount"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const ShopOfferPage = lazy(() => import("./pages/ShopOfferPage"));
const FreeDeliveryPage = lazy(() => import("./pages/FreeDeliveryPage"));
const AllCategories = lazy(() => import("./pages/AllCategories"));
const CategoryProducts = lazy(() => import("./pages/CategoryProducts"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const AdminAppVersions = lazy(() => import("./pages/AdminAppVersions"));
const AdminRoleManagement = lazy(() => import("./pages/AdminRoleManagement"));
const AdminFeatureToggles = lazy(() => import("./pages/AdminFeatureToggles"));
const PhotoCard = lazy(() => import("./pages/PhotoCard"));
const NewsCard = lazy(() => import("./pages/NewsCard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep in cache for persistence
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "km-query-cache",
  throttleTime: 1000,
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24h
      buster: "v1",
    }}
  >
    <AuthProvider>
      <LanguageProvider>
      <CartProvider>
      <TooltipProvider>
        <Toaster />
        <CustomCursor />
        <Sonner />
        <CartDrawer />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes — host-based: km.* shows Production, main domain shows Shop */}
            <Route
              path="/"
              element={
                typeof window !== "undefined" && /^km\./i.test(window.location.hostname)
                  ? <PublicHome />
                  : <Products />
              }
            />
            <Route path="/media" element={<PublicHome />} />
            <Route path="/shop" element={<Products />} />
            <Route path="/member/:memberId" element={<PublicProfile />} />
            <Route path="/actor/:id" element={<ActorPortfolio />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/offer/:id" element={<ShopOfferPage />} />
            <Route path="/o/:slug" element={<ShopOfferPage />} />
            <Route path="/free-delivery" element={<FreeDeliveryPage />} />
            <Route path="/categories" element={<AllCategories />} />
            <Route path="/category/:value" element={<CategoryProducts />} />
            <Route path="/shop/login" element={<ShopCustomerLogin />} />
            <Route path="/shop/account" element={<ShopCustomerAccount />} />
            
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:category/:postNumber" element={<News />} />
            <Route path="/news/:shortId" element={<News />} />
            <Route path="/publisher/:publisherId" element={<PublisherProfile />} />
            <Route path="/project/:token" element={<FreelanceClientView />} />
            <Route path="/download" element={<DownloadApp />} />
            <Route path="/photo-card" element={<PhotoCard />} />
            <Route path="/news-card" element={<NewsCard />} />
            <Route path="/app" element={<DownloadApp />} />

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
            <Route path="/admin/attendance" element={<PermissionGuard permission="attendance"><AdminAttendance /></PermissionGuard>} />
            <Route path="/admin/payments" element={<RouteGuard allowedRoles={["admin"]}><AdminPayments /></RouteGuard>} />
            <Route path="/admin/shootings" element={<PermissionGuard permission="shootings"><AdminShootings /></PermissionGuard>} />
            <Route path="/admin/shooting-expenses" element={<PermissionGuard permission="shooting_expenses"><AdminShootingExpenses /></PermissionGuard>} />
            <Route path="/admin/role-management" element={<RouteGuard allowedRoles={["admin"]}><AdminRoleManagement /></RouteGuard>} />
            <Route path="/admin/feature-toggles" element={<RouteGuard allowedRoles={["admin"]}><AdminFeatureToggles /></RouteGuard>} />
            <Route path="/admin/channels" element={<RouteGuard allowedRoles={["admin"]}><AdminChannels /></RouteGuard>} />
            <Route path="/admin/scripts" element={<RouteGuard allowedRoles={["admin"]}><AdminScripts /></RouteGuard>} />
            <Route path="/admin/scripts/:id" element={<RouteGuard allowedRoles={["admin"]}><AdminScriptEdit /></RouteGuard>} />
            <Route path="/admin/scripts/:id/draw" element={<RouteGuard allowedRoles={["admin"]}><ScriptDrawing /></RouteGuard>} />
            <Route path="/admin/voice-notes" element={<RouteGuard allowedRoles={["admin"]}><AdminVoiceNotes /></RouteGuard>} />
            <Route path="/admin/bonuses" element={<RouteGuard allowedRoles={["admin"]}><AdminBonuses /></RouteGuard>} />
            <Route path="/admin/advances" element={<RouteGuard allowedRoles={["admin"]}><AdminAdvances /></RouteGuard>} />
            <Route path="/admin/account-checking" element={<RouteGuard allowedRoles={["admin"]}><AdminAccountChecking /></RouteGuard>} />
            <Route path="/admin/salary-updates" element={<RouteGuard allowedRoles={["admin"]}><AdminSalaryUpdates /></RouteGuard>} />
            <Route path="/admin/notices" element={<RouteGuard allowedRoles={["admin"]}><AdminNotices /></RouteGuard>} />
            <Route path="/admin/public-profiles" element={<RouteGuard allowedRoles={["admin"]}><AdminPublicProfiles /></RouteGuard>} />
            <Route path="/admin/actor-editor" element={<RouteGuard allowedRoles={["admin"]}><AdminActorEditor /></RouteGuard>} />
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
            <Route path="/admin/delivery-settings" element={<RouteGuard allowedRoles={["product_admin"]}><AdminDeliverySettings /></RouteGuard>} />
            <Route path="/admin/app-versions" element={<RouteGuard allowedRoles={["admin"]}><AdminAppVersions /></RouteGuard>} />

            {/* Client route — client only */}
            <Route path="/client" element={<RouteGuard allowedRoles={["client"]}><ClientDashboard /></RouteGuard>} />
            <Route path="/client/projects" element={<RouteGuard allowedRoles={["client"]}><ClientProjects /></RouteGuard>} />
            <Route path="/client/payments" element={<RouteGuard allowedRoles={["client"]}><ClientPaymentHistory /></RouteGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </CartProvider>
      </LanguageProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
