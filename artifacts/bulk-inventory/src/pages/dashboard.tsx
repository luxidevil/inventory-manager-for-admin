import { useGetDashboardStats, useGetRecentActivity, useGetExpirySummary, useGetMyPurchases } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Package, ShoppingCart, AlertTriangle, Clock, TrendingUp,
  RefreshCcw, Bell, Archive, Link2
} from "lucide-react";

function StatCard({ title, value, icon: Icon, color, subtitle }: { title: string; value: number | string; icon: any; color: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`rounded-lg p-2.5 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { refetchInterval: 30000 } } as any);
  const { data: activity = [], isLoading: activityLoading } = useGetRecentActivity({ query: { refetchInterval: 30000 } } as any);
  const { data: expiry, isLoading: expiryLoading } = useGetExpirySummary({ query: { refetchInterval: 30000 } } as any);
  const { data: myPurchasesData } = useGetMyPurchases();
  const myPurchases = (myPurchasesData as any)?.sales ?? [];
  const myPurchasesTotal = (myPurchasesData as any)?.total ?? 0;

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const s = stats as any;
  const e = expiry as any;
  const SALE_STATUS: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    refunded: "bg-yellow-100 text-yellow-700",
    replaced: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Overview of your inventory and activity</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Inventory" value={s?.totalInventory ?? 0} icon={Package} color="bg-blue-500" />
        <StatCard title="Available" value={s?.availableInventory ?? 0} icon={Archive} color="bg-green-500" />
        <StatCard title="Sold" value={s?.soldInventory ?? 0} icon={ShoppingCart} color="bg-purple-500" />
        <StatCard title="Expiring Soon" value={s?.expiringSoon ?? 0} icon={Clock} color="bg-orange-500" subtitle="Within 2 days" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Active Reports" value={s?.activeReports ?? 0} icon={AlertTriangle} color="bg-red-500" />
        <StatCard title="Pending Refunds" value={s?.pendingRefunds ?? 0} icon={RefreshCcw} color="bg-yellow-500" />
        <StatCard title="Pending Replacements" value={s?.pendingReplacements ?? 0} icon={Bell} color="bg-pink-500" />
        <StatCard title="Total Revenue" value={`$${(s?.totalRevenue ?? 0).toFixed(2)}`} icon={TrendingUp} color="bg-emerald-500" subtitle={`${s?.totalSales ?? 0} sales`} />
      </div>

      {/* My Purchases banner — shown when this account was pre-added as a buyer */}
      {myPurchasesTotal > 0 && (
        <Card className="border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setLocation("/sales")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-primary p-2.5 flex-shrink-0">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">You have linked purchases</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {myPurchasesTotal} sale{myPurchasesTotal !== 1 ? "s" : ""} were recorded in your name before you joined.
                {myPurchases[0] && ` Latest: ${myPurchases[0].itemCount} records from ${myPurchases[0].sellerName ?? "a seller"}.`}
              </p>
            </div>
            <Badge variant="secondary" className="flex-shrink-0 text-xs">{myPurchasesTotal} sale{myPurchasesTotal !== 1 ? "s" : ""}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Expiry breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Expiry Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiryLoading ? <Skeleton className="h-32" /> : (
              <div className="space-y-2">
                {[
                  { label: "Expired", value: e?.expired ?? 0, color: "bg-red-500" },
                  { label: "Today", value: e?.today ?? 0, color: "bg-red-400" },
                  { label: "Tomorrow", value: e?.tomorrow ?? 0, color: "bg-orange-500" },
                  { label: "Within 3 days", value: e?.threeDays ?? 0, color: "bg-yellow-500" },
                  { label: "Within 7 days", value: e?.sevenDays ?? 0, color: "bg-green-500" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${row.color}`} />
                    <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                    <span className="text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? <Skeleton className="h-32" /> : (
              <div className="space-y-3">
                {(activity as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (activity as any[]).map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-1 ${item.type === "sale" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                      {item.type === "sale" ? <ShoppingCart className="h-3 w-3 text-purple-600 dark:text-purple-400" /> : <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
