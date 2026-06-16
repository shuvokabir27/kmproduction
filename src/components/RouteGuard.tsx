import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import React from "react";

type Props = {
  children: React.ReactNode;
  allowedRoles?: ("product_admin")[];
  redirectTo?: string;
};

export function RouteGuard({ children, redirectTo = "/login" }: Props) {
  const { user, loading, isProductAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isProductAdmin) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
