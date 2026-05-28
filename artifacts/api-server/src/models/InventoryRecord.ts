import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryRecord extends Document {
  email: string;
  emailNormalized: string;
  batchId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  currentHolderId: mongoose.Types.ObjectId;
  status: "available" | "sold" | "reported" | "replaced" | "wiped" | "renewed" | "refunded";
  durationDays: number;
  startDate: Date;
  expiryDate: Date;
  isDuplicate: boolean;
  isSold: boolean;
  isReported: boolean;
  lineage: mongoose.Types.ObjectId[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

const InventoryRecordSchema = new Schema<IInventoryRecord>(
  {
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true, lowercase: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentHolderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["available", "sold", "reported", "replaced", "wiped", "renewed", "refunded"],
      default: "available",
    },
    durationDays: { type: Number, required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isDuplicate: { type: Boolean, default: false },
    isSold: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    lineage: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

InventoryRecordSchema.index({ emailNormalized: 1, currentHolderId: 1 });
InventoryRecordSchema.index({ batchId: 1 });
InventoryRecordSchema.index({ expiryDate: 1 });

export const InventoryRecord = mongoose.model<IInventoryRecord>("InventoryRecord", InventoryRecordSchema);
