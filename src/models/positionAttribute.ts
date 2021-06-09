import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const positionAttributeSchema = new Schema({
    value: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PositionAttributeCategory'
    }
});

export interface PositionAttribute extends Document {
    kind: 'PositionAttribute';
    value?: string;
    category?: any;
    usersCount?: number;
}

positionAttributeSchema.plugin(accessibleRecordsPlugin);
export const PositionAttribute = mongoose.model<PositionAttribute, AccessibleRecordModel<PositionAttribute>>('PositionAttribute', positionAttributeSchema);