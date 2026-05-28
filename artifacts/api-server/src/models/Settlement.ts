import mongoose, { Schema, Document } from "mongoose";

export interface ISettlement extends Document {
  reportId: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  amount: number;
  type: "refund" | "replacement";
  status: "pending" | "approved" | "rejected" | "completed";
  notes?: string;
  createdAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: "Report", required: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["refund", "replacement"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },
    notes: String,
  },
  { timestamps: true }
);

export const Settlement = mongoose.model<ISettlement>("Settlement", SettlementSchema);
