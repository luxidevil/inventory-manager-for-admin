import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  inviteToken?: string;
  linkedUserId?: mongoose.Types.ObjectId;
  isLinked: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteToken: { type: String, sparse: true, index: true },
    linkedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    isLinked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);
