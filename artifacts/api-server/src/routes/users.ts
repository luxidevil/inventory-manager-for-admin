import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const { role, search } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt })));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const { name, email, role, isActive } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { name, email, role, isActive }, { new: true }).select("-password");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  await User.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

export default router;
