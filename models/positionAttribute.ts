import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const positionAttributeSchema = new Schema({
    name: String,
});

export interface PositionAttribute extends Document {
    kind: 'PositionAttribute';
    name?: string;
}

positionAttributeSchema.plugin(accessibleRecordsPlugin);
export const PositionAttribute = mongoose.model<PositionAttribute, AccessibleRecordModel<PositionAttribute>>('PositionAttribute', positionAttributeSchema);