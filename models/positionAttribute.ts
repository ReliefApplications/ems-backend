import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const positionAttributeSchema = new Schema({
    name: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PositionAttributeCategory'
    }
});

export interface PositionAttribute extends Document {
    kind: 'PositionAttribute';
    name?: string;
}

positionAttributeSchema.index({name: 1, category: 1}, {unique: true});
positionAttributeSchema.plugin(accessibleRecordsPlugin);
export const PositionAttribute = mongoose.model<PositionAttribute, AccessibleRecordModel<PositionAttribute>>('PositionAttribute', positionAttributeSchema);