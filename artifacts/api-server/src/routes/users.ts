import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { requireAuth } from "../lib/auth";
import { ADMIN_EMAIL } from "../lib/adminSeed";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const { role, search } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (role) filter.role = role;
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt })));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select("-password");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const requester = (req as any).user as { userId: string; role: string };
  const target = await User.findById(req.params.id);
  if (!target || target.isDeleted) { res.status(404).json({ error: "User not found" }); return; }
  // The single admin account is immutable via the API.
  if (target.email === ADMIN_EMAIL) { res.status(403).json({ error: "The admin account cannot be modified" }); return; }

  const { name, email, role, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (email !== undefined) {
    const normalized = String(email).toLowerCase();
    if (normalized === ADMIN_EMAIL) { res.status(400).json({ error: "Reserved email" }); return; }
    update.email = normalized;
  }
  if (role !== undefined) {
    // Only the admin may change roles, and "admin" can never be granted.
    if (requester.role !== "admin") { res.status(403).json({ error: "Only the admin can change roles" }); return; }
    if (role === "admin") { res.status(400).json({ error: "There can only be one admin" }); return; }
    if (!["bulk_seller", "reseller", "small_seller"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
    update.role = role;
  }
  if (isActive !== undefined) {
    if (requester.role !== "admin") { res.status(403).json({ error: "Only the admin can activate/deactivate users" }); return; }
    update.isActive = Boolean(isActive);
  }

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const requester = (req as any).user as { userId: string; role: string };
  if (requester.role !== "admin") { res.status(403).json({ error: "Only the admin can delete users" }); return; }
  const target = await User.findById(req.params.id);
  if (target && target.email === ADMIN_EMAIL) { res.status(403).json({ error: "The admin account cannot be deleted" }); return; }
  await User.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date(), isActive: false });
  res.sendStatus(204);
});

export default router;
