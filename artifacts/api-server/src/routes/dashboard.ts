import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { InventoryRecord } from "../models/InventoryRecord";
import { Sale } from "../models/Sale";
import { Report } from "../models/Report";
import { Settlement } from "../models/Settlement";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 86400000);

  const mySales = await Sale.find({ sellerId: userId }).select("_id");
  const saleIds = mySales.map(s => s._id);

  const [
    totalInventory, availableInventory, soldInventory, expiringSoon,
    activeReports, pendingRefunds, pendingReplacements, salesCount
  ] = await Promise.all([
    InventoryRecord.countDocuments({ currentHolderId: userId }),
    InventoryRecord.countDocuments({ currentHolderId: userId, status: "available" }),
    InventoryRecord.countDocuments({ currentHolderId: userId, status: "sold" }),
    InventoryRecord.countDocuments({ currentHolderId: userId, expiryDate: { $lte: twoDays }, status: { $nin: ["wiped", "replaced", "refunded"] } }),
    Report.countDocuments({ saleId: { $in: saleIds }, status: { $nin: ["resolved"] } }),
    Settlement.countDocuments({ sellerId: userId, type: "refund", status: "pending" }),
    Report.countDocuments({ saleId: { $in: saleIds }, status: "replace" }),
    Sale.countDocuments({ sellerId: userId }),
  ]);

  const revenueAgg = await Sale.aggregate([{ $match: { sellerId: new mongoose.Types.ObjectId(userId) } }, { $group: { _id: null, total: { $sum: "$price" } } }]);
  const totalRevenue = revenueAgg[0]?.total ?? 0;

  res.json({ totalInventory, availableInventory, soldInventory, expiringSoon, activeReports, pendingRefunds, pendingReplacements, totalSales: salesCount, totalRevenue });
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const mySales = await Sale.find({ sellerId: userId }).select("_id");
  const saleIds = mySales.map(s => s._id);

  const [recentSales, recentReports] = await Promise.all([
    Sale.find({ sellerId: userId }).sort({ createdAt: -1 }).limit(5).populate("buyerId", "name"),
    Report.find({ saleId: { $in: saleIds } }).sort({ createdAt: -1 }).limit(5),
  ]);

  const activities = [
    ...recentSales.map((s: any) => ({ id: s._id.toString(), type: "sale", message: `Sale of ${s.items?.length ?? 0} records to ${s.buyerId?.name ?? "external buyer"}`, timestamp: s.createdAt, metadata: {} })),
    ...recentReports.map((r: any) => ({ id: r._id.toString(), type: "report", message: `Report filed for ${r.items?.length ?? 0} items`, timestamp: r.createdAt, metadata: {} })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  res.json(activities);
});

router.get("/dashboard/expiry-summary", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const now = new Date();
  const d1 = new Date(now.getTime() + 86400000);
  const d2 = new Date(now.getTime() + 2 * 86400000);
  const d3 = new Date(now.getTime() + 3 * 86400000);
  const d7 = new Date(now.getTime() + 7 * 86400000);

  const [today, tomorrow, threeDays, sevenDays, expired] = await Promise.all([
    InventoryRecord.countDocuments({ currentHolderId: userId, expiryDate: { $lte: d1 }, status: { $nin: ["wiped", "replaced", "refunded"] } }),
    InventoryRecord.countDocuments({ currentHolderId: userId, expiryDate: { $gt: d1, $lte: d2 }, status: { $nin: ["wiped", "replaced", "refunded"] } }),
    InventoryRecord.countDocuments({ currentHolderId: userId, expiryDate: { $gt: d2, $lte: d3 }, status: { $nin: ["wiped", "replaced", "refunded"] } }),
    InventoryRecord.countDocuments({ currentHolderId: userId, expiryDate: { $gt: d3, $lte: d7 }, status: { $nin: ["wiped", "replaced", "refunded"] } }),
    InventoryRecord.countDocuments({ currentHolderId: userId, expiryDate: { $lt: now }, status: { $nin: ["wiped", "replaced", "refunded"] } }),
  ]);

  res.json({ today, tomorrow, threeDays, sevenDays, expired });
});

export default router;
