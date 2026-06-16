import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, createContext, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

export type StaffRole = "product_admin" | "order_manager" | "site_manager";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: StaffRole[];
  isProductAdmin: boolean;
  isOrderManager: boolean;
  isSiteManager: boolean;
  isStaff: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  isProductAdmin: false,
  isOrderManager: false,
  isSiteManager: false,
  isStaff: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async (session: Session | null) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!isMounted) return;
      const r = ((data ?? []) as any[])
        .map((x) => x.role as StaffRole)
        .filter((x) => x === "product_admin" || x === "order_manager" || x === "site_manager");
      setRoles(r);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrate(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {}
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
      });
    } catch {}
    setSession(null);
    setUser(null);
    setRoles([]);
  };

  const isProductAdmin = roles.includes("product_admin");
  const isOrderManager = roles.includes("order_manager");
  const isSiteManager = roles.includes("site_manager");
  const isStaff = isProductAdmin || isOrderManager || isSiteManager;

  return (
    <AuthContext.Provider value={{ user, session, roles, isProductAdmin, isOrderManager, isSiteManager, isStaff, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
