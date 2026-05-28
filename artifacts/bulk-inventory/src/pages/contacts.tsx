import { useState } from "react";
import { useListContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Contact as ContactIcon, Mail, Phone } from "lucide-react";

type ContactForm = { name: string; email: string; phone: string; notes: string };
const empty: ContactForm = { name: "", email: "", phone: "", notes: "" };

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

  const openEdit = (c: any) => {
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" });
    setEditId(c.id);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage external buyers and contacts</p>
        </div>
        <Button onClick={() => { setForm(empty); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
      </div>

      <Input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (contacts as any[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ContactIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No contacts found.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(contacts as any[]).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-2.5 flex-shrink-0">
                  <ContactIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{c.name}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{c.notes}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete contact?")) deleteMutation.mutate({ id: c.id }); }}>
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
          <DialogHeader><DialogTitle>{editId ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
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
