import { useState } from "react";
import { useListInventory, useListBatches, useDeleteInventoryRecord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, daysLeftBadge, cn } from "@/lib/utils";
import { Package, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "reported", label: "Reported" },
  { value: "replaced", label: "Replaced" },
  { value: "wiped", label: "Wiped" },
  { value: "refunded", label: "Refunded" },
];

const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  sold: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  reported: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  replaced: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  wiped: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  refunded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  renewed: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const limit = 50;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params: any = { page: String(page), limit: String(limit) };
  if (search) params.search = search;
  if (status !== "all") params.status = status;
  if (batchId !== "all") params.batchId = batchId;

  const { data, isLoading } = useListInventory(params, { query: { keepPreviousData: true } } as any);
  const { data: batches = [] } = useListBatches({} as any);

  const deleteMutation = useDeleteInventoryRecord({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
        toast({ title: "Record removed", description: `${deleteTarget?.email} was removed from your inventory.` });
        setDeleteTarget(null);
      },
      onError() {
        toast({ title: "Error", description: "Could not remove the record.", variant: "destructive" });
        setDeleteTarget(null);
      },
    },
  });

  const records = (data as any)?.records ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{total} records total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={batchId} onValueChange={v => { setBatchId(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Batches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {(batches as any[]).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : records.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No inventory records found.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Batch</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Days Left</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Expires</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                    <td className="py-3 px-4 font-mono text-xs truncate max-w-[200px]">{r.email}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{r.batchName ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-700")}>{r.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", daysLeftBadge(r.daysLeft))}>
                        {r.daysLeft <= 0 ? "Expired" : `${r.daysLeft}d`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground hidden md:table-cell">{formatDate(r.expiryDate)}</td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        aria-label={`Delete ${r.email}`}
                        onClick={() => setDeleteTarget({ id: r.id, email: r.email })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove inventory record?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-medium">{deleteTarget?.email}</span> will be removed from your inventory view. The record is preserved in the database for auditing purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
