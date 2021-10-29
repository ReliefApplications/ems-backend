import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const positionAttributeCategorySchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  application: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'Application',
  },
});

export interface PositionAttributeCategory extends Document {
  kind: 'PositionAttributeCategory';
  title?: string;
  application?: any;
}

positionAttributeCategorySchema.index({ title: 1, application: 1 }, { unique: true });
positionAttributeCategorySchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PositionAttributeCategory = mongoose.model<PositionAttributeCategory, AccessibleRecordModel<PositionAttributeCategory>>('PositionAttributeCategory', positionAttributeCategorySchema);
