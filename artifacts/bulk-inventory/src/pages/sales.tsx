import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListSales, useCreateSale, useListInventory, useListUsers,
  useListContacts, useCreateContact, useGenerateContactInvite,
  useGetMyPurchases,
} from "@workspace/api-client-react";
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
import {
  Plus, ShoppingCart, ChevronRight, AlertTriangle, UserPlus,
  CheckCircle2, Link2, Copy, Package
} from "lucide-react";

const SALE_STATUS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  refunded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  replaced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function getInviteUrl(token: string) {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/invite/${token}`;
}

export default function SalesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: "", email: "", phone: "" });
  const [form, setForm] = useState({
    buyerType: "platform_user",
    buyerId: "",
    buyerContactId: "",
    price: "",
    durationDays: "30",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
    selectedRecordIds: [] as string[],
  });

  const { data, isLoading, refetch } = useListSales({ page: String(page) } as any, { query: { keepPreviousData: true } } as any);
  const { data: myPurchasesData } = useGetMyPurchases();
  const { data: inventoryData } = useListInventory({ status: "available", limit: "200" } as any, { query: { enabled: showCreate } } as any);
  const { data: users = [] } = useListUsers({} as any, { query: { enabled: showCreate && form.buyerType === "platform_user" } } as any);
  const { data: contacts = [], refetch: refetchContacts } = useListContacts({} as any, { query: { enabled: showCreate && form.buyerType === "external_contact" } } as any);

  const sales = (data as any)?.sales ?? [];
  const total = (data as any)?.total ?? 0;
  const myPurchases = (myPurchasesData as any)?.sales ?? [];
  const myPurchasesTotal = (myPurchasesData as any)?.total ?? 0;

  const resetForm = () => setForm({
    buyerType: "platform_user", buyerId: "", buyerContactId: "",
    price: "", durationDays: "30", startDate: new Date().toISOString().slice(0, 10),
    notes: "", selectedRecordIds: [],
  });

  const createMutation = useCreateSale({
    mutation: {
      onSuccess(data: any) {
        refetch();
        setShowCreate(false);
        resetForm();
        // Offer invite link if external unlinked buyer
        if (data.buyerType === "external_contact" && !data.buyerIsLinked && data.buyerInviteToken) {
          const url = getInviteUrl(data.buyerInviteToken);
          navigator.clipboard?.writeText(url).catch(() => {});
          toast({ title: "Sale created!", description: `Invite link for ${data.buyerName} copied to clipboard.` });
        }
      },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Could not create sale", variant: "destructive" }); },
    },
  });

  const quickAddMutation = useCreateContact({
    mutation: {
      onSuccess(c: any) {
        refetchContacts();
        setForm(f => ({ ...f, buyerContactId: c.id }));
        setShowQuickAdd(false);
        setQuickAddForm({ name: "", email: "", phone: "" });
        toast({ title: "Contact added", description: `${c.name} added as a contact` });
      },
      onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Could not add contact", variant: "destructive" }); },
    },
  });

  const inviteMutation = useGenerateContactInvite({
    mutation: {
      onSuccess(data: any) {
        const url = getInviteUrl(data.inviteToken);
        navigator.clipboard?.writeText(url).catch(() => {});
        toast({ title: "Invite link copied!", description: `Share with ${data.name}` });
      },
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
        buyerId: form.buyerType === "platform_user" ? (form.buyerId || undefined) : undefined,
        buyerContactId: form.buyerType === "external_contact" ? (form.buyerContactId || undefined) : undefined,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        startDate: form.startDate,
        inventoryRecordIds: form.selectedRecordIds,
        notes: form.notes || undefined,
      } as any,
    });
  };

  const selectedContact = (contacts as any[]).find((c: any) => c.id === form.buyerContactId);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} sales total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Sale</Button>
      </div>

      {/* My Purchases panel — only visible when this user has linked purchases */}
      {myPurchasesTotal > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              My Purchases
              <Badge className="ml-1 text-xs">{myPurchasesTotal}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Purchases made in your name before you joined the platform</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {myPurchases.slice(0, 3).map((sale: any) => (
              <div key={sale.id} className="flex items-center gap-3 bg-background rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setLocation(`/sales/${sale.id}`)}>
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{sale.itemCount} records</span>
                  <span className="text-xs text-muted-foreground ml-2">from {sale.sellerName ?? "seller"} · ${sale.price}</span>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", SALE_STATUS[sale.status] ?? "")}>{sale.status}</span>
              </div>
            ))}
            {myPurchasesTotal > 3 && <p className="text-xs text-muted-foreground text-center pt-1">+{myPurchasesTotal - 3} more</p>}
          </CardContent>
        </Card>
      )}

      {/* Sales list */}
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
                      {sale.buyerType === "external_contact" && (
                        sale.buyerIsLinked
                          ? <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Joined</Badge>
                          : <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 gap-1"><AlertTriangle className="h-2.5 w-2.5" />Not joined</Badge>
                      )}
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SALE_STATUS[sale.status] ?? "")}>{sale.status}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{sale.itemCount} records</span>
                      <span>${sale.price}</span>
                      <span>{sale.durationDays} days</span>
                      <span>Expires {formatDate(sale.expiryDate)}</span>
                      {sale.buyerEmail && <span>{sale.buyerEmail}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(sale.createdAt)}</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    {sale.buyerType === "external_contact" && !sale.buyerIsLinked && sale.buyerContactId && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-blue-500"
                        title="Copy invite link"
                        onClick={e => {
                          e.stopPropagation();
                          if (sale.buyerInviteToken) {
                            navigator.clipboard?.writeText(getInviteUrl(sale.buyerInviteToken)).catch(() => {});
                            toast({ title: "Invite link copied!" });
                          } else {
                            inviteMutation.mutate({ id: sale.buyerContactId });
                          }
                        }}
                      >
                        {sale.buyerInviteToken ? <Copy className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Sale Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">Sell to a platform user or an external contact. External contacts can join later to claim their records.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buyer Type</Label>
                <Select value={form.buyerType} onValueChange={v => setForm(f => ({ ...f, buyerType: v, buyerId: "", buyerContactId: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_user">Platform User</SelectItem>
                    <SelectItem value="external_contact">External Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.buyerType === "platform_user" ? (
                <div className="space-y-2">
                  <Label>Buyer</Label>
                  <Select value={form.buyerId} onValueChange={v => setForm(f => ({ ...f, buyerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
                    <SelectContent>
                      {(users as any[]).map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>External Contact</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={() => setShowQuickAdd(true)}
                    >
                      <UserPlus className="h-3 w-3" />Quick Add
                    </button>
                  </div>
                  <Select value={form.buyerContactId} onValueChange={v => setForm(f => ({ ...f, buyerContactId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select or quick-add contact" /></SelectTrigger>
                    <SelectContent>
                      {(contacts as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            {c.isLinked
                              ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                              : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                            {c.name}{c.email ? ` (${c.email})` : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedContact && !selectedContact.isLinked && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Not yet on platform — an invite link will be generated after the sale.
                    </p>
                  )}
                  {selectedContact?.isLinked && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {selectedContact.name} is on the platform and will see this immediately.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Price ($)</Label><Input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" min="1" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} /></div>
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
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={
                form.selectedRecordIds.length === 0 || !form.price || createMutation.isPending ||
                (form.buyerType === "platform_user" && !form.buyerId) ||
                (form.buyerType === "external_contact" && !form.buyerContactId)
              }
            >
              {createMutation.isPending ? "Creating…" : `Sell ${form.selectedRecordIds.length} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Contact Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Quick Add Contact
            </DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Add a buyer who isn't on the platform. They can join later to claim their records.
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={quickAddForm.name} onChange={e => setQuickAddForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" /></div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-muted-foreground text-xs">(for invite link)</span></Label>
              <Input type="email" value={quickAddForm.email} onChange={e => setQuickAddForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" />
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={quickAddForm.phone} onChange={e => setQuickAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0000" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
            <Button
              onClick={() => quickAddMutation.mutate({ data: quickAddForm as any })}
              disabled={!quickAddForm.name || quickAddMutation.isPending}
            >
              {quickAddMutation.isPending ? "Adding…" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
