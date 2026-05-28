import mongoose, { Schema, Document } from "mongoose";

export interface IReportItem {
  _id: mongoose.Types.ObjectId;
  inventoryRecordId: mongoose.Types.ObjectId;
  email: string;
  daysLeft: number;
  refundAmount: number;
  status: "pending" | "replaced" | "refunded" | "wiped" | "held";
  replacementEmail?: string;
}

export interface IReport extends Document {
  saleId: mongoose.Types.ObjectId;
  reportedById: string;
  reporterType: "platform_user" | "external_contact";
  status: "pending" | "hold" | "wipe" | "refund" | "replace" | "resolved";
  action?: "hold" | "wipe" | "refund" | "replace";
  notes?: string;
  items: IReportItem[];
  refundTotal: number;
  createdAt: Date;
}

const ReportItemSchema = new Schema<IReportItem>({
  inventoryRecordId: { type: Schema.Types.ObjectId, ref: "InventoryRecord", required: true },
  email: { type: String, required: true },
  daysLeft: { type: Number, required: true },
  refundAmount: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "replaced", "refunded", "wiped", "held"], default: "pending" },
  replacementEmail: String,
});

const ReportSchema = new Schema<IReport>(
  {
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    reportedById: { type: String, required: true },
    reporterType: { type: String, enum: ["platform_user", "external_contact"], required: true },
    status: {
      type: String,
      enum: ["pending", "hold", "wipe", "refund", "replace", "resolved"],
      default: "pending",
    },
    action: { type: String, enum: ["hold", "wipe", "refund", "replace"] },
    notes: String,
    items: [ReportItemSchema],
    refundTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>("Report", ReportSchema);
