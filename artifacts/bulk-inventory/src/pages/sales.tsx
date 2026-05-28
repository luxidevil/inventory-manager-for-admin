import { useState } from "react";
import { useLocation } from "wouter";
import { useListSales, useCreateSale, useListInventory, useListUsers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { Plus, ShoppingCart, ChevronRight, AlertTriangle } from "lucide-react";

const SALE_STATUS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  refunded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  replaced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function SalesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useListSales({ page: String(page) } as any, { query: { keepPreviousData: true } } as any);
  const { data: inventoryData } = useListInventory({ status: "available", limit: "200" } as any, { query: { enabled: showCreate } } as any);
  const { data: users = [] } = useListUsers({} as any, { query: { enabled: showCreate } } as any);

  const sales = (data as any)?.sales ?? [];
  const total = (data as any)?.total ?? 0;

  const [form, setForm] = useState({
    buyerType: "platform_user",
    buyerId: "",
    price: "",
    durationDays: "30",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
    selectedRecordIds: [] as string[],
  });

  const createMutation = useCreateSale({
    mutation: {
      onSuccess() { refetch(); setShowCreate(false); setForm({ buyerType: "platform_user", buyerId: "", price: "", durationDays: "30", startDate: new Date().toISOString().slice(0, 10), notes: "", selectedRecordIds: [] }); },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Could not create sale", variant: "destructive" }); },
    },
  });

  const availableRecords = (inventoryData as any)?.records ?? [];

  const toggleRecord = (id: string) => {
    setForm(f => ({
      ...f,
      selectedRecordIds: f.selectedRecordIds.includes(id)
        ? f.selectedRecordIds.filter(r => r !== id)
        : [...f.selectedRecordIds, id],
    }));
  };

  const handleCreate = () => {
    createMutation.mutate({
      data: {
        buyerType: form.buyerType as any,
        buyerId: form.buyerId || undefined,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        startDate: form.startDate,
        inventoryRecordIds: form.selectedRecordIds,
        notes: form.notes || undefined,
      } as any,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} sales total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Sale</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : sales.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No sales yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sales.map((sale: any) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/sales/${sale.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{sale.buyerName ?? "External Buyer"}</span>
                      <Badge variant="outline" className="text-xs">{sale.buyerType === "platform_user" ? "Platform" : "External"}</Badge>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SALE_STATUS[sale.status] ?? "")}>{sale.status}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{sale.itemCount} records</span>
                      <span>${sale.price}</span>
                      <span>{sale.durationDays} days</span>
                      <span>Expires {formatDate(sale.expiryDate)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(sale.createdAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Sale Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buyer Type</Label>
                <Select value={form.buyerType} onValueChange={v => setForm(f => ({ ...f, buyerType: v, buyerId: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_user">Platform User</SelectItem>
                    <SelectItem value="external_contact">External Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.buyerType === "platform_user" && (
                <div className="space-y-2">
                  <Label>Buyer</Label>
                  <Select value={form.buyerId} onValueChange={v => setForm(f => ({ ...f, buyerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
                    <SelectContent>
                      {(users as any[]).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Price ($)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="space-y-2">
              <Label>Select Inventory Records ({form.selectedRecordIds.length} selected)</Label>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {availableRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No available inventory</p>
                ) : availableRecords.map((r: any) => (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b last:border-0">
                    <Checkbox checked={form.selectedRecordIds.includes(r.id)} onCheckedChange={() => toggleRecord(r.id)} />
                    <span className="text-xs font-mono flex-1 truncate">{r.email}</span>
                    <span className="text-xs text-muted-foreground">{r.daysLeft}d</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={form.selectedRecordIds.length === 0 || !form.price || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : `Sell ${form.selectedRecordIds.length} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
