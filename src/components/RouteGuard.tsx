import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import React from "react";

type Props = {
  children: React.ReactNode;
  allowedRoles: ("admin" | "member" | "client" | "product_admin")[];
  redirectTo?: string;
};

export function RouteGuard({ children, allowedRoles, redirectTo }: Props) {
  const { user, loading, isAdmin, isClient, isProductAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Check roles - a user can have multiple roles
  const userRoles: string[] = [];
  if (isAdmin) userRoles.push("admin");
  if (isClient) userRoles.push("client");
  if (isProductAdmin) userRoles.push("product_admin");
  if (!isAdmin && !isClient && !isProductAdmin) userRoles.push("member");

  const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    const fallback = redirectTo || (isProductAdmin ? "/admin/products" : isClient ? "/client" : isAdmin ? "/admin" : "/dashboard");
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
