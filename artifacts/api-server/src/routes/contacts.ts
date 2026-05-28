import { Router, type IRouter } from "express";
import { Contact } from "../models/Contact";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/contacts", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = { createdBy: userId };
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];
  const contacts = await Contact.find(filter).sort({ createdAt: -1 });
  res.json(contacts.map(c => ({ id: c._id, name: c.name, email: c.email, phone: c.phone, notes: c.notes, createdBy: c.createdBy, createdAt: c.createdAt })));
});

router.post("/contacts", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const contact = await Contact.create({ ...req.body, createdBy: userId });
  res.status(201).json({ id: contact._id, name: contact.name, email: contact.email, phone: contact.phone, notes: contact.notes, createdBy: contact.createdBy, createdAt: contact.createdAt });
});

router.get("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: contact._id, name: contact.name, email: contact.email, phone: contact.phone, notes: contact.notes, createdBy: contact.createdBy, createdAt: contact.createdAt });
});

router.patch("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: contact._id, name: contact.name, email: contact.email, phone: contact.phone, notes: contact.notes, createdBy: contact.createdBy, createdAt: contact.createdAt });
});

router.delete("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  await Contact.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

export default router;
