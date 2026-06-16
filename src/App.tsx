import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { CartProvider } from "@/hooks/useCart";
import { CartDrawer } from "@/components/CartDrawer";
import MobileShopNav from "@/components/MobileShopNav";

const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ShopCustomerLogin = lazy(() => import("./pages/ShopCustomerLogin"));
const ShopCustomerAccount = lazy(() => import("./pages/ShopCustomerAccount"));
const AdminDeliverySettings = lazy(() => import("./pages/AdminDeliverySettings"));
const ShopOfferPage = lazy(() => import("./pages/ShopOfferPage"));
const FreeDeliveryPage = lazy(() => import("./pages/FreeDeliveryPage"));
const AllCategories = lazy(() => import("./pages/AllCategories"));
const CategoryProducts = lazy(() => import("./pages/CategoryProducts"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));

// Admin pages (WP-style)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSiteProducts = lazy(() => import("./pages/admin/AdminSiteProducts"));
const AdminSiteCategories = lazy(() => import("./pages/admin/AdminSiteCategories"));
const AdminSitePricing = lazy(() => import("./pages/admin/AdminSitePricing"));
const AdminSiteVideos = lazy(() => import("./pages/admin/AdminSiteVideos"));
const AdminSiteHomeSections = lazy(() => import("./pages/admin/AdminSiteHomeSections"));
const AdminSiteOffers = lazy(() => import("./pages/admin/AdminSiteOffers"));
const AdminSiteFreeDelivery = lazy(() => import("./pages/admin/AdminSiteFreeDelivery"));
const AdminSiteScrolling = lazy(() => import("./pages/admin/AdminSiteScrolling"));
const AdminSiteFooter = lazy(() => import("./pages/admin/AdminSiteFooter"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminShopCustomers = lazy(() => import("./pages/admin/AdminShopCustomers"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "km-shop-query-cache",
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
    persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: "shop-v1" }}
  >
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CartDrawer />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public shop */}
                <Route path="/" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/offer/:id" element={<ShopOfferPage />} />
                <Route path="/o/:slug" element={<ShopOfferPage />} />
                <Route path="/free-delivery" element={<FreeDeliveryPage />} />
                <Route path="/categories" element={<AllCategories />} />
                <Route path="/category/:value" element={<CategoryProducts />} />
                <Route path="/shop/login" element={<ShopCustomerLogin />} />
                <Route path="/shop/account" element={<ShopCustomerAccount />} />
                <Route path="/download" element={<DownloadApp />} />
                <Route path="/app" element={<DownloadApp />} />

                {/* Admin auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Admin routes — product_admin only */}
                <Route path="/admin" element={<RouteGuard><AdminProducts /></RouteGuard>} />
                <Route path="/admin/products" element={<RouteGuard><AdminProducts /></RouteGuard>} />
                <Route path="/products/admin" element={<RouteGuard><AdminProducts /></RouteGuard>} />
                <Route path="/admin/delivery-settings" element={<RouteGuard><AdminDeliverySettings /></RouteGuard>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <MobileShopNav />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
