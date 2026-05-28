import { Router, type IRouter } from "express";
import { InventoryRecord } from "../models/InventoryRecord";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatRecord(r: any) {
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((new Date(r.expiryDate).getTime() - now.getTime()) / 86400000));
  return {
    id: r._id, email: r.email,
    batchId: r.batchId?._id ?? r.batchId,
    batchName: r.batchId?.name ?? null,
    ownerId: r.ownerId?._id ?? r.ownerId,
    ownerName: r.ownerId?.name ?? null,
    currentHolderId: r.currentHolderId?._id ?? r.currentHolderId,
    currentHolderName: r.currentHolderId?.name ?? null,
    status: r.status, durationDays: r.durationDays,
    startDate: r.startDate, expiryDate: r.expiryDate, daysLeft,
    isDuplicate: r.isDuplicate, isSold: r.isSold, isReported: r.isReported,
    createdAt: r.createdAt,
  };
}

router.get("/inventory", requireAuth, async (req, res): Promise<void> => {
  const { search, batchId, status, minDaysLeft, holderId, page = "1", limit = "50" } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = { currentHolderId: holderId ?? userId, isDeleted: { $ne: true } };
  if (batchId) filter.batchId = batchId;
  if (status) filter.status = status;
  if (search) filter.emailNormalized = new RegExp(search.toLowerCase(), "i");
  if (minDaysLeft) {
    const minDate = new Date(Date.now() + Number(minDaysLeft) * 86400000);
    filter.expiryDate = { $gte: minDate };
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [records, total] = await Promise.all([
    InventoryRecord.find(filter).populate("batchId", "name").populate("ownerId", "name").populate("currentHolderId", "name").sort({ expiryDate: 1 }).skip(skip).limit(Number(limit)),
    InventoryRecord.countDocuments(filter),
  ]);
  res.json({ records: records.map(formatRecord), total, page: Number(page), limit: Number(limit) });
});

router.get("/inventory/expiring", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const twoDaysFromNow = new Date(Date.now() + 2 * 86400000);
  const records = await InventoryRecord.find({
    currentHolderId: userId,
    expiryDate: { $lte: twoDaysFromNow },
    status: { $nin: ["wiped", "replaced", "refunded"] },
    isDeleted: { $ne: true },
  }).populate("batchId", "name").populate("ownerId", "name").populate("currentHolderId", "name").sort({ expiryDate: 1 });
  res.json(records.map(formatRecord));
});

router.get("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  const r = await InventoryRecord.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate("batchId", "name").populate("ownerId", "name").populate("currentHolderId", "name");
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRecord(r));
});

router.patch("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  const r = await InventoryRecord.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("batchId", "name").populate("ownerId", "name").populate("currentHolderId", "name");
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRecord(r));
});

router.delete("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  await InventoryRecord.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
  res.sendStatus(204);
});

export default router;
