import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useListNotifications } from "@workspace/api-client-react";
import {
  LayoutDashboard, Package, Archive, ShoppingCart, AlertTriangle,
  Users, Bell, LogOut, Menu, X, ChevronRight, Contact, RefreshCcw,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/batches", label: "Batches", icon: Archive },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/sales", label: "Sales", icon: ShoppingCart },
  { path: "/reports", label: "Reports", icon: AlertTriangle },
  { path: "/contacts", label: "Contacts", icon: Contact },
  { path: "/settlements", label: "Settlements", icon: RefreshCcw },
  { path: "/users", label: "Users", icon: Users, adminOnly: true },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifications = [] } = useListNotifications({ unreadOnly: "true" } as any, { query: { refetchInterval: 30000 } } as any);
  const unreadCount = (notifications as any[]).length;

  const visibleNav = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === "admin");

  const NavLink = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = item.path === "/" ? location === "/" : location.startsWith(item.path);
    return (
      <button
        onClick={() => { setLocation(item.path); setSidebarOpen(false); }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {active && <ChevronRight className="h-3 w-3 opacity-60" />}
      </button>
    );
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary rounded-md p-1.5">
            <Package className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground">Bulk Inventory</div>
            <div className="text-xs text-sidebar-foreground/60 capitalize">{user?.role?.replace(/_/g, " ")}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => <NavLink key={item.path} item={item} />)}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => { setLocation("/notifications"); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors mb-1"
        >
          <Bell className="h-4 w-4" />
          <span className="flex-1 text-left">Notifications</span>
          {unreadCount > 0 && <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{unreadCount}</Badge>}
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:text-white hover:bg-red-500/20" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Bulk Inventory</span>
          </div>
          <button onClick={() => setLocation("/notifications")} className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center leading-none">{unreadCount}</span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
