import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttribute } from './positionAttribute.model';

/** Mongoose client schema declaration */
const clientSchema = new Schema({
  name: String,
  azureRoles: [String],
  clientId: String,
  oid: String,
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
  ],
  groups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },
  ],
  positionAttributes: {
    type: [PositionAttribute.schema],
  },
});

/** Client documents interface declaration */
export interface Client extends Document {
  kind: 'Client';
  name?: string;
  azureRoles?: string[];
  clientId?: string;
  oid?: string;
  groups?: any[];
  roles?: any[];
  positionAttributes?: PositionAttribute[];
  ability?: AppAbility;
}

clientSchema.index(
  { oid: 1 },
  { unique: true, partialFilterExpression: { oid: { $type: 'string' } } }
);
clientSchema.index({ clientId: 1 }, { unique: true });
clientSchema.plugin(accessibleRecordsPlugin);

/** Mongoose client model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Client = mongoose.model<Client, AccessibleRecordModel<Client>>(
  'Client',
  clientSchema
);
