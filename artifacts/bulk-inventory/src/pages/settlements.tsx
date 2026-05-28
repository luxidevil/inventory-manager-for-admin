import { useListSettlements } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, cn } from "@/lib/utils";
import { RefreshCcw } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function SettlementsPage() {
  const { data: settlements = [], isLoading } = useListSettlements({} as any);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settlements</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track refund and replacement settlements</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (settlements as any[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <RefreshCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No settlements yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(settlements as any[]).map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold capitalize">{s.type}</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_BADGE[s.status] ?? "")}>{s.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">${s.amount?.toFixed(2) ?? "0.00"} · {formatDateTime(s.createdAt)}</div>
                  {s.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
