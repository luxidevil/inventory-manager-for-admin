import { useState } from "react";
import { useLocation } from "wouter";
import { useListReports, useCreateReport, useListSales } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, cn } from "@/lib/utils";
import { Plus, AlertTriangle, ChevronRight } from "lucide-react";

const REPORT_STATUS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hold: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  replace: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  refund: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  wipe: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(1);

  const params: any = { page: String(page) };
  if (statusFilter !== "all") params.status = statusFilter;
  const { data, isLoading, refetch } = useListReports(params, { query: { keepPreviousData: true } } as any);
  const { data: salesData } = useListSales({ limit: "100" } as any, { query: { enabled: showCreate } } as any);

  const reports = (data as any)?.reports ?? [];
  const total = (data as any)?.total ?? 0;

  const sales = (salesData as any)?.sales ?? [];
  const selectedSale = sales.find((s: any) => s.id === selectedSaleId);

  const createMutation = useCreateReport({
    mutation: {
      onSuccess() { refetch(); setShowCreate(false); setSelectedSaleId(""); setSelectedItems([]); setNotes(""); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Could not create report", variant: "destructive" }); },
    },
  });

  const toggleItem = (id: string) => setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleCreate = () => {
    createMutation.mutate({ data: { saleId: selectedSaleId, inventoryRecordIds: selectedItems, notes: notes || undefined } as any });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} reports total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Report</Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["pending", "hold", "replace", "refund", "wipe", "resolved"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No reports yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/reports/${report.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">Report #{report.id.slice(-8)}</span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", REPORT_STATUS[report.status] ?? "")}>{report.status}</span>
                      {report.action && <Badge variant="outline" className="text-xs capitalize">{report.action}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{report.items?.length ?? 0} items</span>
                      <span>Refund: <strong className="text-foreground">${report.refundTotal?.toFixed(2) ?? "0.00"}</strong></span>
                      <span>{formatDateTime(report.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Report Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>File a Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sale</Label>
              <Select value={selectedSaleId} onValueChange={v => { setSelectedSaleId(v); setSelectedItems([]); }}>
                <SelectTrigger><SelectValue placeholder="Select a sale" /></SelectTrigger>
                <SelectContent>
                  {sales.map((s: any) => <SelectItem key={s.id} value={s.id}>#{s.id.slice(-8)} — {s.buyerName ?? "External"} ({s.itemCount} records)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedSale && (
              <div className="space-y-2">
                <Label>Select Items to Report ({selectedItems.length} selected)</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {selectedSale.items?.map((item: any) => (
                    <label key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b last:border-0">
                      <Checkbox checked={selectedItems.includes(item.inventoryRecordId)} onCheckedChange={() => toggleItem(item.inventoryRecordId)} />
                      <span className="text-xs font-mono flex-1 truncate">{item.email}</span>
                      <span className="text-xs text-muted-foreground">{item.daysLeft}d left</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!selectedSaleId || selectedItems.length === 0 || createMutation.isPending}>
              {createMutation.isPending ? "Filing…" : `File Report (${selectedItems.length} items)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
