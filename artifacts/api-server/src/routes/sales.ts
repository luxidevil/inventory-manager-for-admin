import { Router, type IRouter } from "express";
import { Sale } from "../models/Sale";
import { Contact } from "../models/Contact";
import { InventoryRecord } from "../models/InventoryRecord";
import { Batch } from "../models/Batch";
import { Notification } from "../models/Notification";
import { requireAuth } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

function formatSale(s: any) {
  const contact = s.buyerContactId;
  return {
    id: s._id,
    sellerId: s.sellerId?._id ?? s.sellerId,
    sellerName: s.sellerId?.name ?? null,
    buyerType: s.buyerType,
    buyerId: s.buyerId?._id ?? s.buyerId ?? null,
    buyerName: s.buyerId?.name ?? contact?.name ?? null,
    buyerContactId: contact?._id ?? contact ?? null,
    buyerEmail: contact?.email ?? null,
    buyerIsLinked: contact?.isLinked ?? false,
    buyerInviteToken: contact?.inviteToken ?? null,
    price: s.price,
    durationDays: s.durationDays,
    startDate: s.startDate,
    expiryDate: s.expiryDate,
    itemCount: s.items?.length ?? 0,
    status: s.status,
    notes: s.notes ?? null,
    items: (s.items ?? []).map((i: any) => ({
      id: i._id, inventoryRecordId: i.inventoryRecordId,
      email: i.email, daysLeft: i.daysLeft, status: i.status,
    })),
    createdAt: s.createdAt,
  };
}

// Purchases where the logged-in user is the linked contact buyer
router.get("/sales/my-purchases", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  // Find contacts linked to this user
  const linkedContacts = await Contact.find({ linkedUserId: new mongoose.Types.ObjectId(userId) }).select("_id");
  const contactIds = linkedContacts.map(c => c._id);
  if (contactIds.length === 0) { res.json({ sales: [], total: 0 }); return; }
  const [sales, total] = await Promise.all([
    Sale.find({ buyerContactId: { $in: contactIds } })
      .populate("sellerId", "name")
      .populate("buyerContactId", "name email isLinked")
      .sort({ createdAt: -1 })
      .limit(50),
    Sale.countDocuments({ buyerContactId: { $in: contactIds } }),
  ]);
  res.json({ sales: sales.map(formatSale), total });
});

router.get("/sales", requireAuth, async (req, res): Promise<void> => {
  const { buyerId, sellerId, page = "1", limit = "50" } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = {};
  if (sellerId) filter.sellerId = sellerId;
  else filter.sellerId = userId;
  if (buyerId) filter.buyerId = buyerId;
  const skip = (Number(page) - 1) * Number(limit);
  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("sellerId", "name")
      .populate("buyerId", "name")
      .populate("buyerContactId", "name email isLinked inviteToken")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Sale.countDocuments(filter),
  ]);
  res.json({ sales: sales.map(formatSale), total, page: Number(page), limit: Number(limit) });
});

router.post("/sales", requireAuth, async (req, res): Promise<void> => {
  const { buyerType, buyerId, buyerContactId, price, durationDays, startDate, inventoryRecordIds, notes } = req.body;
  const { userId } = (req as any).user;

  const start = new Date(startDate);
  const expiry = new Date(start.getTime() + durationDays * 86400000);
  const now = new Date();

  const records = await InventoryRecord.find({ _id: { $in: inventoryRecordIds }, status: "available" });
  if (records.length === 0) { res.status(400).json({ error: "No valid available inventory records found" }); return; }

  const items = records.map(r => ({
    _id: new mongoose.Types.ObjectId(),
    inventoryRecordId: r._id,
    email: r.email,
    daysLeft: Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86400000)),
    status: "active",
  }));

  // Determine buyer fields — support both old (buyerId for everything) and new (buyerContactId explicit)
  const resolvedBuyerId = buyerType === "platform_user" ? (buyerId || undefined) : undefined;
  const resolvedContactId = buyerType === "external_contact"
    ? (buyerContactId || buyerId || undefined)
    : undefined;

  const sale = await Sale.create({
    sellerId: userId,
    buyerType,
    buyerId: resolvedBuyerId,
    buyerContactId: resolvedContactId,
    price, durationDays,
    startDate: start, expiryDate: expiry,
    status: "active", notes, items,
  });

  await InventoryRecord.updateMany(
    { _id: { $in: inventoryRecordIds } },
    { $set: { status: "sold", isSold: true, currentHolderId: resolvedBuyerId ?? userId } }
  );

  const batchIds = [...new Set(records.map(r => r.batchId.toString()))];
  for (const bId of batchIds) {
    const cnt = records.filter(r => r.batchId.toString() === bId).length;
    await Batch.findByIdAndUpdate(bId, { $inc: { availableRecords: -cnt, soldRecords: cnt } });
  }

  if (buyerType === "platform_user" && resolvedBuyerId) {
    await Notification.create({ userId: resolvedBuyerId, type: "new_sale", message: `You have received ${records.length} inventory records from a new sale.` });
  }

  const populated = await Sale.findById(sale._id)
    .populate("sellerId", "name")
    .populate("buyerId", "name")
    .populate("buyerContactId", "name email isLinked inviteToken");
  res.status(201).json(formatSale(populated));
});

router.get("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const sale = await Sale.findById(req.params.id)
    .populate("sellerId", "name")
    .populate("buyerId", "name")
    .populate("buyerContactId", "name email isLinked inviteToken");
  if (!sale) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatSale(sale));
});

router.post("/sales/:id/renew", requireAuth, async (req, res): Promise<void> => {
  const { durationDays, price, notes } = req.body;
  const sale = await Sale.findById(req.params.id);
  if (!sale) { res.status(404).json({ error: "Not found" }); return; }
  const newExpiry = new Date(sale.startDate.getTime() + durationDays * 86400000);
  sale.durationDays = durationDays;
  sale.price = price;
  sale.expiryDate = newExpiry;
  sale.status = "active";
  if (notes) sale.notes = notes;
  await sale.save();
  const now = new Date();
  for (const item of sale.items) {
    item.daysLeft = Math.max(0, Math.ceil((newExpiry.getTime() - now.getTime()) / 86400000));
  }
  await sale.save();
  const populated = await Sale.findById(sale._id)
    .populate("sellerId", "name")
    .populate("buyerId", "name")
    .populate("buyerContactId", "name email isLinked inviteToken");
  res.json(formatSale(populated));
});

export default router;
