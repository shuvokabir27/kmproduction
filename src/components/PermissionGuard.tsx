import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { usePermissions, PermissionKey } from "@/hooks/usePermissions";
import React from "react";

type Props = {
  children: React.ReactNode;
  permission: PermissionKey;
};

export function PermissionGuard({ children, permission }: Props) {
  const { user, loading, isAdmin } = useAuth();
  const { has, isLoading } = usePermissions();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !has(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
