import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetReport, useUpdateReport, useReplaceReportItem, useBulkReplaceReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCcw, Package } from "lucide-react";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showBulkReplace, setShowBulkReplace] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [replaceItemId, setReplaceItemId] = useState<string | null>(null);
  const [replaceEmail, setReplaceEmail] = useState("");
  const [actionValue, setActionValue] = useState("");

  const { data: report, isLoading, refetch } = useGetReport(id!, { query: { enabled: !!id } } as any);
  const patchMutation = useUpdateReport({ mutation: { onSuccess: () => refetch(), onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Failed", variant: "destructive" }); } } });
  const replaceMutation = useReplaceReportItem({ mutation: { onSuccess: () => { refetch(); setReplaceItemId(null); setReplaceEmail(""); }, onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Failed", variant: "destructive" }); } } });
  const bulkReplaceMutation = useBulkReplaceReport({ mutation: { onSuccess: (data: any) => { toast({ title: "Bulk replace complete", description: `Matched: ${data.matched}, Unmatched: ${data.unmatched}` }); setShowBulkReplace(false); setBulkText(""); refetch(); }, onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Failed", variant: "destructive" }); } } });

  const r = report as any;

  if (isLoading) return <div className="p-6"><Skeleton className="h-64" /></div>;
  if (!r) return <div className="p-6 text-muted-foreground">Report not found.</div>;

  const ITEM_STATUS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    replaced: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    refunded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    wiped: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    held: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/reports")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">Report #{r.id?.slice(-8)}</h1>
          <p className="text-muted-foreground text-sm">{formatDateTime(r.createdAt)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-muted-foreground">Status</div><div className="font-medium capitalize mt-0.5">{r.status}</div></div>
            <div><div className="text-muted-foreground">Action</div><div className="font-medium capitalize mt-0.5">{r.action ?? "—"}</div></div>
            <div><div className="text-muted-foreground">Items</div><div className="font-medium mt-0.5">{r.items?.length ?? 0}</div></div>
            <div><div className="text-muted-foreground">Refund Total</div><div className="font-semibold text-red-600 dark:text-red-400 mt-0.5">${r.refundTotal?.toFixed(2) ?? "0.00"}</div></div>
          </div>
          {r.notes && <p className="text-sm text-muted-foreground border-t pt-3">{r.notes}</p>}

          {r.status !== "resolved" && (
            <div className="flex items-end gap-3 border-t pt-3 flex-wrap">
              <div className="space-y-1.5">
                <Label>Set Action</Label>
                <Select value={actionValue} onValueChange={setActionValue}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {["hold", "replace", "refund", "wipe"].map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => patchMutation.mutate({ id: r.id, data: { action: actionValue, status: actionValue } as any })} disabled={!actionValue || patchMutation.isPending}>Apply Action</Button>
              <Button onClick={() => patchMutation.mutate({ id: r.id, data: { status: "resolved" } as any })} disabled={patchMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark Resolved
              </Button>
              <Button variant="outline" onClick={() => setShowBulkReplace(true)}>
                <RefreshCcw className="h-4 w-4 mr-1.5" />Bulk Replace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Report Items ({r.items?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(r.items ?? []).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate">{item.email}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{item.daysLeft}d left</span>
                    <span>Refund: ${item.refundAmount?.toFixed(2) ?? "0.00"}</span>
                    {item.replacementEmail && <span className="text-blue-600 dark:text-blue-400">→ {item.replacementEmail}</span>}
                  </div>
                </div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", ITEM_STATUS[item.status] ?? "")}>{item.status}</span>
                {item.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => setReplaceItemId(item.id)}>Replace</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Single Replace Dialog */}
      <Dialog open={!!replaceItemId} onOpenChange={v => { if (!v) { setReplaceItemId(null); setReplaceEmail(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Provide Replacement Email</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Replacement Email</Label>
            <Input type="email" value={replaceEmail} onChange={e => setReplaceEmail(e.target.value)} placeholder="replacement@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceItemId(null)}>Cancel</Button>
            <Button onClick={() => replaceMutation.mutate({ id: r.id, data: { reportItemId: replaceItemId!, replacementEmail: replaceEmail } as any })} disabled={!replaceEmail || replaceMutation.isPending}>
              {replaceMutation.isPending ? "Replacing…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Replace Dialog */}
      <Dialog open={showBulkReplace} onOpenChange={setShowBulkReplace}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bulk Replace Emails</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Paste replacement emails (one per line or any format)</Label>
            <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8} placeholder="Paste replacement emails here…" />
            <p className="text-xs text-muted-foreground">Emails will be extracted and matched to pending report items in order.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReplace(false)}>Cancel</Button>
            <Button onClick={() => bulkReplaceMutation.mutate({ id: r.id, data: { rawText: bulkText } as any })} disabled={!bulkText.trim() || bulkReplaceMutation.isPending}>
              {bulkReplaceMutation.isPending ? "Processing…" : "Apply Replacements"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
