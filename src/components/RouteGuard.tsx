import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import React from "react";

type Props = {
  children: React.ReactNode;
  allowedRoles: ("admin" | "member" | "client")[];
  redirectTo?: string;
};

export function RouteGuard({ children, allowedRoles, redirectTo }: Props) {
  const { user, loading, isAdmin, isClient } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const userRole: "admin" | "member" | "client" = isAdmin ? "admin" : isClient ? "client" : "member";

  if (!allowedRoles.includes(userRole)) {
    const fallback = redirectTo || (isClient ? "/client" : isAdmin ? "/admin" : "/dashboard");
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
