import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListBatches, useCreateBatch, useDeleteBatch,
  useExtractEmails, useUploadBatchRecords,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";
import { Plus, Trash2, Upload, Archive, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface ExtractResult {
  emails: { email: string; isValid: boolean; isDuplicateInPaste: boolean; isDuplicateInInventory: boolean; isPreviouslySold: boolean }[];
  total: number; valid: number; duplicatesInPaste: number; duplicatesInInventory: number; invalid: number;
}

export default function BatchesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState<string | null>(null);
  const [newBatch, setNewBatch] = useState({ name: "", notes: "" });
  const [rawText, setRawText] = useState("");
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [uploadForm, setUploadForm] = useState({ durationDays: 30, startDate: new Date().toISOString().slice(0, 10), skipDuplicates: true });

  const { data: batches = [], isLoading, refetch } = useListBatches({} as any, { query: { staleTime: 30000 } } as any);
  const createMutation = useCreateBatch({ mutation: { onSuccess: () => { refetch(); setShowCreate(false); setNewBatch({ name: "", notes: "" }); }, onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Failed to create", variant: "destructive" }); } } });
  const deleteMutation = useDeleteBatch({ mutation: { onSuccess: () => refetch() } });
  const extractMutation = useExtractEmails({ mutation: { onSuccess: (data: any) => setExtractResult(data), onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Extraction failed", variant: "destructive" }); } } });
  const uploadMutation = useUploadBatchRecords({ mutation: { onSuccess: (data: any) => { toast({ title: "Upload complete", description: `Added ${data.added}, skipped ${data.skipped}` }); setShowUpload(null); setRawText(""); setExtractResult(null); refetch(); }, onError(err: any) { toast({ title: "Error", description: err?.data?.error ?? "Upload failed", variant: "destructive" }); } } });

  const handleExtract = () => {
    if (!rawText.trim()) return;
    extractMutation.mutate({ data: { rawText, batchId: showUpload } as any });
  };

  const handleUpload = () => {
    if (!extractResult || !showUpload) return;
    const emails = extractResult.emails.filter(e => !e.isDuplicateInInventory || !uploadForm.skipDuplicates).map(e => e.email);
    uploadMutation.mutate({ id: showUpload, data: { emails, durationDays: uploadForm.durationDays, startDate: uploadForm.startDate, skipDuplicates: uploadForm.skipDuplicates } as any });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your email inventory batches</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Batch</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (batches as any[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No batches yet. Create your first batch to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(batches as any[]).map((batch: any) => (
            <Card key={batch.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/batches/${batch.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{batch.name}</span>
                      {batch.isSourced && <Badge variant="secondary">Sourced</Badge>}
                    </div>
                    {batch.notes && <p className="text-sm text-muted-foreground mt-0.5 truncate">{batch.notes}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Total: <strong className="text-foreground">{batch.totalRecords}</strong></span>
                      <span>Available: <strong className="text-green-600 dark:text-green-400">{batch.availableRecords}</strong></span>
                      <span>Sold: <strong className="text-purple-600 dark:text-purple-400">{batch.soldRecords}</strong></span>
                      <span>{formatDate(batch.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setShowUpload(batch.id); }} className="hidden sm:flex">
                      <Upload className="h-3.5 w-3.5 mr-1.5" />Upload
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); if (confirm("Delete this batch?")) deleteMutation.mutate({ id: batch.id }); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Batch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={newBatch.name} onChange={e => setNewBatch(f => ({ ...f, name: e.target.value }))} placeholder="e.g. October Batch" /></div>
            <div className="space-y-2"><Label>Notes (optional)</Label><Textarea value={newBatch.notes} onChange={e => setNewBatch(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ data: newBatch as any })} disabled={!newBatch.name || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={!!showUpload} onOpenChange={v => { if (!v) { setShowUpload(null); setExtractResult(null); setRawText(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Emails</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paste emails or text (emails will be extracted)</Label>
              <Textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={6} placeholder="Paste any text containing email addresses…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={uploadForm.durationDays} onChange={e => setUploadForm(f => ({ ...f, durationDays: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={uploadForm.startDate} onChange={e => setUploadForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="skip-dups" checked={uploadForm.skipDuplicates} onChange={e => setUploadForm(f => ({ ...f, skipDuplicates: e.target.checked }))} className="rounded" />
              <Label htmlFor="skip-dups">Skip duplicates already in inventory</Label>
            </div>
            <Button variant="outline" className="w-full" onClick={handleExtract} disabled={!rawText.trim() || extractMutation.isPending}>
              {extractMutation.isPending ? "Extracting…" : "Extract & Preview"}
            </Button>

            {extractResult && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center"><div className="font-bold text-lg text-green-600">{extractResult.valid}</div><div className="text-muted-foreground">Valid</div></div>
                  <div className="text-center"><div className="font-bold text-lg text-orange-600">{extractResult.duplicatesInInventory}</div><div className="text-muted-foreground">In Inventory</div></div>
                  <div className="text-center"><div className="font-bold text-lg text-yellow-600">{extractResult.duplicatesInPaste}</div><div className="text-muted-foreground">Dup in Paste</div></div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {extractResult.emails.slice(0, 100).map(e => (
                    <div key={e.email} className="flex items-center gap-2 text-xs">
                      {e.isDuplicateInInventory ? <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" /> : <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />}
                      <span className={cn("truncate", e.isDuplicateInInventory && "text-muted-foreground line-through")}>{e.email}</span>
                      {e.isDuplicateInPaste && <Badge variant="outline" className="text-xs py-0 px-1">dup</Badge>}
                    </div>
                  ))}
                  {extractResult.emails.length > 100 && <p className="text-xs text-muted-foreground">+{extractResult.emails.length - 100} more</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUpload(null); setExtractResult(null); setRawText(""); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!extractResult || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading…" : `Upload ${extractResult ? (uploadForm.skipDuplicates ? extractResult.emails.filter(e => !e.isDuplicateInInventory).length : extractResult.valid) : 0} Emails`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
