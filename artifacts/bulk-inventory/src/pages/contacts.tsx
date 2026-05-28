import { useState } from "react";
import { useListContacts, useCreateContact, useUpdateContact, useDeleteContact, useGenerateContactInvite } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Contact as ContactIcon, Mail, Phone, Link2, CheckCircle2, ShoppingCart, Copy } from "lucide-react";

type ContactForm = { name: string; email: string; phone: string; notes: string };
const empty: ContactForm = { name: "", email: "", phone: "", notes: "" };

function getInviteUrl(token: string) {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/invite/${token}`;
}

export default function ContactsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(empty);

  const { data: contacts = [], isLoading, refetch } = useListContacts({ search: search || undefined } as any);
  const createMutation = useCreateContact({ mutation: { onSuccess: () => { refetch(); setShowCreate(false); setForm(empty); } } });
  const patchMutation = useUpdateContact({ mutation: { onSuccess: () => { refetch(); setEditId(null); } } });
  const deleteMutation = useDeleteContact({ mutation: { onSuccess: () => refetch() } });
  const inviteMutation = useGenerateContactInvite({
    mutation: {
      onSuccess(data: any) {
        refetch();
        const url = getInviteUrl(data.inviteToken);
        navigator.clipboard?.writeText(url).catch(() => {});
        toast({ title: "Invite link copied!", description: `Copied to clipboard — share it with ${data.name}` });
      },
      onError(err: any) {
        toast({ title: "Error", description: err?.data?.error ?? "Could not generate invite", variant: "destructive" });
      },
    },
  });

  const openEdit = (c: any) => {
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" });
    setEditId(c.id);
  };

  const copyInvite = (c: any) => {
    if (c.inviteToken) {
      const url = getInviteUrl(c.inviteToken);
      navigator.clipboard?.writeText(url).catch(() => {});
      toast({ title: "Invite link copied!", description: `Share with ${c.name}` });
    } else {
      inviteMutation.mutate({ id: c.id });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage external buyers — they can join later and claim their records
          </p>
        </div>
        <Button onClick={() => { setForm(empty); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Contact
        </Button>
      </div>

      <Input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (contacts as any[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ContactIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No contacts yet. Add a buyer to start selling to them.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(contacts as any[]).map((c: any) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`rounded-full p-2.5 flex-shrink-0 ${c.isLinked ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                  {c.isLinked
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    : <ContactIcon className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{c.name}</span>
                    {c.isLinked ? (
                      <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Joined
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Pending
                      </Badge>
                    )}
                    {c.pendingSalesCount > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <ShoppingCart className="h-2.5 w-2.5" />
                        {c.pendingSalesCount} sale{c.pendingSalesCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{c.notes}</p>}
                  {!c.isLinked && c.inviteToken && (
                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                      <Link2 className="h-3 w-3" />Invite link ready — click to copy
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!c.isLinked && c.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title={c.inviteToken ? "Copy invite link" : "Generate invite link"}
                      onClick={() => copyInvite(c)}
                      disabled={inviteMutation.isPending}
                    >
                      {c.inviteToken ? <Copy className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => { if (confirm("Delete contact?")) deleteMutation.mutate({ id: c.id }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={v => { if (!v) { setShowCreate(false); setEditId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Contact" : "Add Contact"}</DialogTitle>
            {!editId && (
              <p className="text-sm text-muted-foreground pt-1">
                Add someone who isn't on the platform yet. They can join later and see everything recorded in their name.
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" /></div>
            <div className="space-y-2">
              <Label>Email <span className="text-muted-foreground text-xs">(needed for invite link)</span></Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" />
            </div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0000" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (editId) patchMutation.mutate({ id: editId, data: form as any });
                else createMutation.mutate({ data: form as any });
              }}
              disabled={!form.name || createMutation.isPending || patchMutation.isPending}
            >
              {editId ? "Save" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
