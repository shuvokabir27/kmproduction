import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, createContext, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isClient: boolean;
  isProductAdmin: boolean;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isClient: false,
  isProductAdmin: false,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isProductAdmin, setIsProductAdmin] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async (session: Session | null) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setIsAdmin(false);
        setIsClient(false);
        setIsProductAdmin(false);
        setLoading(false);
        return;
      }

      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id),
      ]);

      if (!isMounted) return;

      setProfile(profileRes.data ?? null);
      setIsAdmin(roleRes.data?.some((r) => r.role === "admin") ?? false);
      setIsClient(roleRes.data?.some((r) => r.role === "client") ?? false);
      setIsProductAdmin(roleRes.data?.some((r) => r.role === "product_admin") ?? false);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateAuth(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateAuth(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isClient, isProductAdmin, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
