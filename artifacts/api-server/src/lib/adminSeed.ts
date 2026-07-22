import { User } from "../models/User";
import { logger } from "./logger";

/**
 * The system has exactly ONE admin account: email "admin" / password "admin".
 * This runs after the DB connects and enforces that invariant:
 *  - creates the admin account if missing
 *  - re-activates/undeletes it if tampered with
 *  - demotes any OTHER user holding the admin role
 */
export const ADMIN_EMAIL = "admin";

export async function ensureSingleAdmin(): Promise<void> {
  const admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    await User.create({ name: "Admin", email: ADMIN_EMAIL, password: "admin", role: "admin" });
    logger.info("Seeded the single admin account");
  } else if (admin.role !== "admin" || !admin.isActive || admin.isDeleted) {
    admin.role = "admin";
    admin.isActive = true;
    admin.isDeleted = false;
    admin.deletedAt = undefined;
    await admin.save();
    logger.info("Restored the single admin account");
  }
  const demoted = await User.updateMany(
    { email: { $ne: ADMIN_EMAIL }, role: "admin" },
    { $set: { role: "reseller" } }
  );
  if (demoted.modifiedCount > 0) {
    logger.warn({ count: demoted.modifiedCount }, "Demoted non-admin accounts holding admin role");
  }
}
