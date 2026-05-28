import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, cn } from "@/lib/utils";
import { Bell, Check, CheckCheck } from "lucide-react";

const TYPE_COLOR: Record<string, string> = {
  expiry_warning: "bg-orange-100 dark:bg-orange-900/30",
  report_received: "bg-red-100 dark:bg-red-900/30",
  replacement_done: "bg-blue-100 dark:bg-blue-900/30",
  refund_processed: "bg-green-100 dark:bg-green-900/30",
  new_sale: "bg-purple-100 dark:bg-purple-900/30",
  sale_reported: "bg-yellow-100 dark:bg-yellow-900/30",
};

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, refetch } = useListNotifications({} as any, { query: { refetchInterval: 30000 } } as any);
  const markReadMutation = useMarkNotificationRead({ mutation: { onSuccess: () => refetch() } });
  const markAllMutation = useMarkAllNotificationsRead({ mutation: { onSuccess: () => refetch() } });

  const unread = (notifications as any[]).filter(n => !n.isRead).length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unread > 0 && <p className="text-muted-foreground text-sm mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate({})}>
            <CheckCheck className="h-4 w-4 mr-2" />Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (notifications as any[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No notifications.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(notifications as any[]).map((n: any) => (
            <Card key={n.id} className={cn(!n.isRead && "border-primary/30 bg-primary/5")}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn("rounded-full p-2 flex-shrink-0", TYPE_COLOR[n.type] ?? "bg-gray-100 dark:bg-gray-800")}>
                  <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => markReadMutation.mutate({ id: n.id })}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
