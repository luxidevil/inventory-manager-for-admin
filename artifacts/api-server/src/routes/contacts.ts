import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { Contact } from "../models/Contact";
import { Sale } from "../models/Sale";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatContact(c: any) {
  return {
    id: c._id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    notes: c.notes ?? null,
    createdBy: c.createdBy,
    isLinked: c.isLinked ?? false,
    linkedUserId: c.linkedUserId ?? null,
    inviteToken: c.inviteToken ?? null,
    createdAt: c.createdAt,
  };
}

// Public invite preview — no auth required
router.get("/invite/:token", async (req, res): Promise<void> => {
  const contact = await Contact.findOne({ inviteToken: req.params.token }).populate("createdBy", "name");
  if (!contact) { res.status(404).json({ error: "Invite link is invalid or expired" }); return; }
  // Count pending sales for this contact
  const pendingSalesCount = await Sale.countDocuments({ buyerContactId: contact._id });
  res.json({
    contactName: contact.name,
    contactEmail: contact.email ?? null,
    inviterName: (contact.createdBy as any)?.name ?? "A platform member",
    isAlreadyLinked: contact.isLinked,
    pendingSalesCount,
  });
});

router.get("/contacts", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as Record<string, string>;
  const { userId } = (req as any).user;
  const filter: Record<string, unknown> = { createdBy: userId };
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];
  const contacts = await Contact.find(filter).sort({ createdAt: -1 });
  // Enrich with pending sales count
  const ids = contacts.map(c => c._id);
  const saleCounts = await Sale.aggregate([
    { $match: { buyerContactId: { $in: ids } } },
    { $group: { _id: "$buyerContactId", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(saleCounts.map((s: any) => [s._id.toString(), s.count]));
  res.json(contacts.map(c => ({ ...formatContact(c), pendingSalesCount: countMap[c._id.toString()] ?? 0 })));
});

router.post("/contacts", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const contact = await Contact.create({ ...req.body, createdBy: userId });
  res.status(201).json({ ...formatContact(contact), pendingSalesCount: 0 });
});

router.get("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  const pendingSalesCount = await Sale.countDocuments({ buyerContactId: contact._id });
  res.json({ ...formatContact(contact), pendingSalesCount });
});

router.patch("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  const pendingSalesCount = await Sale.countDocuments({ buyerContactId: contact._id });
  res.json({ ...formatContact(contact), pendingSalesCount });
});

router.delete("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  await Contact.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

// Generate or return existing invite token for a contact
router.post("/contacts/:id/generate-invite", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user;
  const contact = await Contact.findOne({ _id: req.params.id, createdBy: userId });
  if (!contact) { res.status(404).json({ error: "Not found" }); return; }
  if (!contact.email) { res.status(400).json({ error: "Contact must have an email address to generate an invite" }); return; }
  if (contact.isLinked) { res.status(400).json({ error: "This contact has already joined the platform" }); return; }
  if (!contact.inviteToken) {
    contact.inviteToken = randomBytes(24).toString("hex");
    await contact.save();
  }
  const pendingSalesCount = await Sale.countDocuments({ buyerContactId: contact._id });
  res.json({ ...formatContact(contact), pendingSalesCount, inviteToken: contact.inviteToken });
});

export default router;
