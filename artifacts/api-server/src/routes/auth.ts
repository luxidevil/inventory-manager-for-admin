import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { signToken, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  const token = signToken({ userId: user._id.toString(), role: user.role });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt } });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: "Name, email, and password required" }); return; }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) { res.status(400).json({ error: "Email already registered" }); return; }
  const user = await User.create({ name, email, password, role: role ?? "reseller" });
  const token = signToken({ userId: user._id.toString(), role: user.role });
  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt } });
});

router.post("/auth/logout", (_req, res): void => { res.json({ ok: true }); });

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const user = await User.findById(userId).select("-password");
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
});

export default router;
