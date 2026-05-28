import mongoose, { Schema, Document } from "mongoose";

export interface IBatch extends Document {
  name: string;
  notes?: string;
  ownerId: mongoose.Types.ObjectId;
  sourcedFromUserId?: mongoose.Types.ObjectId;
  isSourced: boolean;
  totalRecords: number;
  availableRecords: number;
  soldRecords: number;
  createdAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true },
    notes: String,
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sourcedFromUserId: { type: Schema.Types.ObjectId, ref: "User" },
    isSourced: { type: Boolean, default: false },
    totalRecords: { type: Number, default: 0 },
    availableRecords: { type: Number, default: 0 },
    soldRecords: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Batch = mongoose.model<IBatch>("Batch", BatchSchema);
