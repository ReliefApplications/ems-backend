import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose position attribute schema declaration */
const positionAttributeSchema = new Schema({
  value: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PositionAttributeCategory',
  },
});

/** Position attribute documents interface declaration */
export interface PositionAttribute extends Document {
  kind: 'PositionAttribute';
  value?: string;
  category?: any;
  usersCount?: number;
}

positionAttributeSchema.plugin(accessibleRecordsPlugin);

/** Mongoose position attribute model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PositionAttribute = mongoose.model<
  PositionAttribute,
  AccessibleRecordModel<PositionAttribute>
>('PositionAttribute', positionAttributeSchema);
