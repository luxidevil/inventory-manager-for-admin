import { Router, type IRouter } from "express";
import { Notification } from "../models/Notification";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function fmt(n: any) {
  return { id: n._id, userId: n.userId, type: n.type, message: n.message, data: n.data ?? {}, isRead: n.isRead, createdAt: n.createdAt };
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { unreadOnly } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = { userId };
  if (unreadOnly === "true") filter.isRead = false;
  const notes = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(notes.map(fmt));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const n = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!n) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(n));
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  res.json({ ok: true });
});

export default router;
