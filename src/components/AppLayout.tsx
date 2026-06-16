import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Globe, LogOut } from "lucide-react";
import logoAsset from "@/assets/kuakata-multimedia-logo.png.asset.json";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: "ড্যাশবোর্ড", to: "/admin/products" },
    { label: "ডেলিভারি", to: "/admin/delivery-settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 flex items-center justify-between border-b border-border/30 px-4 bg-card/80 backdrop-blur sticky top-0 z-30">
        <Link to="/admin/products" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="Kuakata Multimedia" className="h-8 w-auto" />
          <span className="font-semibold text-sm">KM Shop Admin</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                path === n.to ? "bg-secondary font-medium" : "hover:bg-secondary/60 text-muted-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">শপ দেখুন</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
    </div>
  );
}
