import mongoose, { Schema, Document } from "mongoose";

export interface ISaleItem {
  _id: mongoose.Types.ObjectId;
  inventoryRecordId: mongoose.Types.ObjectId;
  email: string;
  daysLeft: number;
  status: string;
}

export interface ISale extends Document {
  sellerId: mongoose.Types.ObjectId;
  buyerType: "platform_user" | "external_contact";
  buyerId?: mongoose.Types.ObjectId;
  buyerContactId?: mongoose.Types.ObjectId;
  price: number;
  durationDays: number;
  startDate: Date;
  expiryDate: Date;
  status: "active" | "completed" | "refunded" | "replaced" | "expired";
  notes?: string;
  items: ISaleItem[];
  createdAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>({
  inventoryRecordId: { type: Schema.Types.ObjectId, ref: "InventoryRecord", required: true },
  email: { type: String, required: true },
  daysLeft: { type: Number, required: true },
  status: { type: String, default: "active" },
});

const SaleSchema = new Schema<ISale>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerType: { type: String, enum: ["platform_user", "external_contact"], required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User" },
    buyerContactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    price: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "completed", "refunded", "replaced", "expired"], default: "active" },
    notes: String,
    items: [SaleItemSchema],
  },
  { timestamps: true }
);

export const Sale = mongoose.model<ISale>("Sale", SaleSchema);
