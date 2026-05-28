import { Router, type IRouter } from "express";
import { Report } from "../models/Report";
import { Sale } from "../models/Sale";
import { InventoryRecord } from "../models/InventoryRecord";
import { Notification } from "../models/Notification";
import { requireAuth } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

function formatReport(r: any) {
  return {
    id: r._id, saleId: r.saleId,
    reportedById: r.reportedById,
    reporterType: r.reporterType,
    reporterName: null,
    status: r.status, action: r.action ?? null, notes: r.notes ?? null,
    items: (r.items ?? []).map((i: any) => ({
      id: i._id, inventoryRecordId: i.inventoryRecordId,
      email: i.email, daysLeft: i.daysLeft, refundAmount: i.refundAmount,
      status: i.status, replacementEmail: i.replacementEmail ?? null,
    })),
    refundTotal: r.refundTotal,
    createdAt: r.createdAt,
  };
}

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const { status, reportedBy, saleId, page = "1", limit = "50" } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = {};

  const mySales = await Sale.find({ sellerId: userId }).select("_id");
  filter.saleId = { $in: mySales.map(s => s._id) };
  if (status) filter.status = status;
  if (saleId) filter.saleId = saleId;

  const skip = (Number(page) - 1) * Number(limit);
  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Report.countDocuments(filter),
  ]);
  res.json({ reports: reports.map(formatReport), total, page: Number(page), limit: Number(limit) });
});

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const { saleId, inventoryRecordIds, notes } = req.body;
  const { userId } = (req as any).user;

  const sale = await Sale.findById(saleId);
  if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }

  const now = new Date();
  const items = inventoryRecordIds.map((rid: string) => {
    const saleItem = sale.items.find(i => i.inventoryRecordId.toString() === rid);
    const daysLeft = saleItem?.daysLeft ?? 0;
    const refundAmount = parseFloat(((sale.price / sale.items.length) / sale.durationDays * daysLeft).toFixed(2));
    return {
      _id: new mongoose.Types.ObjectId(),
      inventoryRecordId: rid, email: saleItem?.email ?? "",
      daysLeft, refundAmount, status: "pending",
    };
  });

  const refundTotal = items.reduce((sum: number, i: any) => sum + i.refundAmount, 0);
  const report = await Report.create({ saleId, reportedById: userId, reporterType: "platform_user", status: "pending", notes, items, refundTotal });

  await InventoryRecord.updateMany({ _id: { $in: inventoryRecordIds } }, { $set: { isReported: true, status: "reported" } });

  await Notification.create({ userId: sale.sellerId, type: "sale_reported", message: `${items.length} item(s) from sale have been reported.`, data: { reportId: report._id } });

  res.status(201).json(formatReport(report));
});

router.get("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatReport(report));
});

router.patch("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const { status, action, notes } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  if (status) report.status = status;
  if (action) report.action = action;
  if (notes) report.notes = notes;
  await report.save();
  res.json(formatReport(report));
});

router.post("/reports/:id/replace", requireAuth, async (req, res): Promise<void> => {
  const { reportItemId, replacementEmail } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  const item = report.items.find(i => i._id.toString() === reportItemId);
  if (!item) { res.status(404).json({ error: "Report item not found" }); return; }
  item.replacementEmail = replacementEmail;
  item.status = "replaced";
  report.status = "replace";
  await report.save();
  res.json(formatReport(report));
});

router.post("/reports/:id/bulk-replace", requireAuth, async (req, res): Promise<void> => {
  const { rawText } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404).json({ error: "Not found" }); return; }

  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const raw = (rawText.match(re) || []) as string[];
  const seen = new Set<string>();
  const dupSet = new Set<string>();
  for (const e of raw) {
    const norm = e.toLowerCase();
    if (seen.has(norm)) dupSet.add(norm);
    seen.add(norm);
  }
  const unique = [...seen];

  const pendingItems = report.items.filter(i => i.status === "pending");
  const details: { email: string; status: string; reportItemId: string | null }[] = [];
  let matched = 0, unmatched = 0, invalid = 0, duplicates = 0;

  for (const email of unique) {
    if (dupSet.has(email)) { duplicates++; details.push({ email, status: "duplicate", reportItemId: null }); continue; }
    const pendingItem = pendingItems.find(i => i.status === "pending");
    if (pendingItem) {
      pendingItem.replacementEmail = email;
      pendingItem.status = "replaced";
      matched++;
      details.push({ email, status: "matched", reportItemId: pendingItem._id.toString() });
    } else {
      unmatched++;
      details.push({ email, status: "unmatched", reportItemId: null });
    }
  }

  const allReplaced = report.items.every(i => i.status !== "pending");
  if (allReplaced) report.status = "resolved";
  await report.save();

  res.json({ matched, unmatched, invalid, duplicates, total: unique.length, details });
});

export default router;
