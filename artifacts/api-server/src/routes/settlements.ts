import { Router, type IRouter } from "express";
import { Settlement } from "../models/Settlement";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function fmt(s: any) {
  return { id: s._id, reportId: s.reportId, saleId: s.saleId, sellerId: s.sellerId?._id ?? s.sellerId, sellerName: s.sellerId?.name ?? null, amount: s.amount, type: s.type, status: s.status, notes: s.notes ?? null, createdAt: s.createdAt };
}

router.get("/settlements", requireAuth, async (req, res): Promise<void> => {
  const { reportId, saleId, status } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = { sellerId: userId };
  if (reportId) filter.reportId = reportId;
  if (saleId) filter.saleId = saleId;
  if (status) filter.status = status;
  const settlements = await Settlement.find(filter).populate("sellerId", "name").sort({ createdAt: -1 });
  res.json(settlements.map(fmt));
});

router.post("/settlements", requireAuth, async (req, res): Promise<void> => {
  const { reportId, saleId, type, notes } = req.body;
  const { userId } = (req as any).user;
  const s = await Settlement.create({ reportId, saleId, sellerId: userId, amount: 0, type, status: "pending", notes });
  res.status(201).json(fmt(s));
});

router.get("/settlements/:id", requireAuth, async (req, res): Promise<void> => {
  const s = await Settlement.findById(req.params.id).populate("sellerId", "name");
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(s));
});

export default router;
