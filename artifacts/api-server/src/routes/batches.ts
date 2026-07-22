import { Router, type IRouter } from "express";
import { Batch } from "../models/Batch";
import { InventoryRecord } from "../models/InventoryRecord";
import { User } from "../models/User";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function extractEmails(text: string): string[] {
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  return [...new Set((text.match(re) || []).map(e => e.toLowerCase()))];
}

router.post("/batches/extract-emails", requireAuth, async (req, res): Promise<void> => {
  const { rawText, batchId } = req.body;
  if (!rawText) { res.status(400).json({ error: "rawText required" }); return; }
  const { userId } = (req as any).user;

  const rawEmails = (rawText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []) as string[];
  const seen = new Set<string>();
  const dupInPaste = new Set<string>();
  for (const e of rawEmails) {
    const norm = e.toLowerCase();
    if (seen.has(norm)) dupInPaste.add(norm);
    seen.add(norm);
  }

  const unique = [...seen];
  const existingRecords = await InventoryRecord.find({
    emailNormalized: { $in: unique },
    isDeleted: { $ne: true },
  }).select("emailNormalized isSold");

  const existingMap = new Map<string, { isSold: boolean }>();
  for (const r of existingRecords) existingMap.set(r.emailNormalized, { isSold: r.isSold });

  const items = unique.map(email => ({
    email,
    isValid: true,
    isDuplicateInPaste: dupInPaste.has(email),
    isDuplicateInInventory: existingMap.has(email),
    isPreviouslySold: existingMap.get(email)?.isSold ?? false,
  }));

  res.json({
    emails: items,
    total: rawEmails.length,
    valid: unique.length,
    duplicatesInPaste: dupInPaste.size,
    duplicatesInInventory: items.filter(i => i.isDuplicateInInventory).length,
    invalid: 0,
  });
});

router.get("/batches", requireAuth, async (req, res): Promise<void> => {
  const { search, ownerId } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = { ownerId: ownerId ?? userId, isDeleted: { $ne: true } };
  if (search) filter.name = new RegExp(search, "i");
  const batches = await Batch.find(filter).populate("ownerId", "name").populate("sourcedFromUserId", "name").sort({ createdAt: -1 });
  res.json(batches.map(b => ({
    id: b._id, name: b.name, notes: b.notes,
    ownerId: (b.ownerId as any)._id ?? b.ownerId,
    ownerName: (b.ownerId as any).name ?? null,
    sourcedFromUserId: b.sourcedFromUserId ?? null,
    sourcedFromUserName: b.sourcedFromUserId ? (b.sourcedFromUserId as any).name : null,
    isSourced: b.isSourced, totalRecords: b.totalRecords,
    availableRecords: b.availableRecords, soldRecords: b.soldRecords, createdAt: b.createdAt,
  })));
});

router.post("/batches", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const batch = await Batch.create({ ...req.body, ownerId: userId });
  res.status(201).json({ id: batch._id, name: batch.name, notes: batch.notes, ownerId: batch.ownerId, ownerName: null, sourcedFromUserId: batch.sourcedFromUserId ?? null, sourcedFromUserName: null, isSourced: batch.isSourced, totalRecords: 0, availableRecords: 0, soldRecords: 0, createdAt: batch.createdAt });
});

router.get("/batches/:id", requireAuth, async (req, res): Promise<void> => {
  const batch = await Batch.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate("ownerId", "name").populate("sourcedFromUserId", "name");
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: batch._id, name: batch.name, notes: batch.notes, ownerId: (batch.ownerId as any)._id, ownerName: (batch.ownerId as any).name ?? null, sourcedFromUserId: batch.sourcedFromUserId ?? null, sourcedFromUserName: batch.sourcedFromUserId ? (batch.sourcedFromUserId as any).name : null, isSourced: batch.isSourced, totalRecords: batch.totalRecords, availableRecords: batch.availableRecords, soldRecords: batch.soldRecords, createdAt: batch.createdAt });
});

router.patch("/batches/:id", requireAuth, async (req, res): Promise<void> => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: batch._id, name: batch.name, notes: batch.notes, ownerId: batch.ownerId, ownerName: null, sourcedFromUserId: batch.sourcedFromUserId ?? null, sourcedFromUserName: null, isSourced: batch.isSourced, totalRecords: batch.totalRecords, availableRecords: batch.availableRecords, soldRecords: batch.soldRecords, createdAt: batch.createdAt });
});

router.delete("/batches/:id", requireAuth, async (req, res): Promise<void> => {
  await Batch.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
  res.sendStatus(204);
});

router.post("/batches/:id/upload", requireAuth, async (req, res): Promise<void> => {
  const { emails, durationDays, startDate, skipDuplicates } = req.body;
  const { userId } = (req as any).user;
  const batch = await Batch.findById(req.params.id);
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  const start = new Date(startDate);
  const expiry = new Date(start.getTime() + durationDays * 86400000);
  const now = new Date();

  const existing = await InventoryRecord.find({ emailNormalized: { $in: emails.map((e: string) => e.toLowerCase()) }, isDeleted: { $ne: true } }).select("emailNormalized");
  const existingSet = new Set(existing.map(r => r.emailNormalized));

  let added = 0, skipped = 0, duplicates = 0;
  const toInsert = [];

  for (const email of emails as string[]) {
    const norm = email.toLowerCase();
    // Enforce global uniqueness: never add an email that already exists anywhere
    // in live inventory (any holder, sold or not), nor twice within the same paste.
    if (existingSet.has(norm)) {
      duplicates++;
      skipped++;
      continue;
    }
    existingSet.add(norm);
    toInsert.push({ email, emailNormalized: norm, batchId: batch._id, ownerId: userId, currentHolderId: userId, durationDays, startDate: start, expiryDate: expiry, isDuplicate: false, lineage: [userId] });
    added++;
  }

  if (toInsert.length > 0) {
    let inserted = toInsert.length;
    try {
      await InventoryRecord.insertMany(toInsert, { ordered: false });
    } catch (err: any) {
      // Unique-index backstop caught a concurrent duplicate insert.
      if (err && err.code === 11000) {
        inserted = Array.isArray(err.insertedDocs) ? err.insertedDocs.length : 0;
        const failed = toInsert.length - inserted;
        added -= failed;
        duplicates += failed;
        skipped += failed;
      } else {
        throw err;
      }
    }
    if (inserted > 0) {
      await Batch.findByIdAndUpdate(batch._id, { $inc: { totalRecords: inserted, availableRecords: inserted } });
    }
  }

  res.json({ added, skipped, duplicates });
});

export default router;
