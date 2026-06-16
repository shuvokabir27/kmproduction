import { useAuth, type StaffRole } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import React from "react";

type Props = {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
  redirectTo?: string;
};

export function RouteGuard({ children, allowedRoles, redirectTo = "/login" }: Props) {
  const { user, loading, roles, isStaff, isProductAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length) {
    const ok = roles.some((r) => allowedRoles.includes(r));
    if (!ok) return <Navigate to={getHomeRoute(isProductAdmin, roles)} replace />;
  } else if (!isStaff) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

function getHomeRoute(_isProductAdmin: boolean, roles: StaffRole[]) {
  if (roles.includes("product_admin")) return "/admin";
  if (roles.includes("order_manager")) return "/admin/orders";
  if (roles.includes("site_manager")) return "/admin/site/products";
  return "/login";
}
