import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const permissionSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  global: Boolean,
});

permissionSchema.index({ type: 1, global: 1 }, { unique: true });

export interface Permission extends Document {
  kind: 'Permission';
  type?: string;
  global?: boolean;
}

permissionSchema.plugin(accessibleRecordsPlugin);
export const Permission = mongoose.model<Permission, AccessibleRecordModel<Permission>>('Permission', permissionSchema);
