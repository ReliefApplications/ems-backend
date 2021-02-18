import { AccessibleRecordModel, accessibleRecordsPlugin } from "@casl/mongoose";
import mongoose, { Schema, Document } from 'mongoose';

const positionAttributeCategorySchema = new Schema({
    title: String,
});

export interface PositionAttributeCategory extends Document {
    kind: 'PositionAttributeCategory';
    title?: string;
}

positionAttributeCategorySchema.plugin(accessibleRecordsPlugin);
export const PositionAttributeCategory = mongoose.model<PositionAttributeCategory, AccessibleRecordModel<PositionAttributeCategory>>('PositionAttributeCategory', positionAttributeCategorySchema);
