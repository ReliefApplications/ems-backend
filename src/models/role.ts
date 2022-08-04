import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { Group } from './group';
import { PositionAttributeCategory } from './positionAttributeCategory';

/** Model for RoleRule object  */
export interface RoleRule {
  logic: 'and' | 'or';
  rules: (
    | {
        group?: Group;
        attribute?: {
          category: PositionAttributeCategory;
          operator: string;
          value: string;
        };
      }
    | RoleRule
  )[];
}

/** Mongoose role schema definition */
const roleSchema = new Schema({
  title: String,
  description: String,
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
  },
  permissions: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Permission',
  },
  channels: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Channel',
  },
  rules: [
    {
      logic: String,
      _id: false,
      rules: [
        {
          _id: false,
          group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            _id: false,
          },
          attribute: {
            category: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'PositionAttribute',
            },
            _id: false,
            value: String,
            operator: String,
          },
        },
      ],
    },
  ],
});

roleSchema.index({ title: 1, application: 1 }, { unique: true });

/** Role documents interface definition */
export interface Role extends Document {
  kind: 'Role';
  title: string;
  description: string;
  application: any;
  permissions: any[];
  channels: any[];
  rules: RoleRule[];
}

roleSchema.plugin(accessibleRecordsPlugin);

/** Mongoose role model*/
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Role = mongoose.model<Role, AccessibleRecordModel<Role>>(
  'Role',
  roleSchema
);
