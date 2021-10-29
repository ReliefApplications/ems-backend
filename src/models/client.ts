import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { AppAbility } from '../security/defineAbilityFor';
import { PositionAttribute } from './positionAttribute';

const clientSchema = new Schema({
  name: String,
  azureRoles: [String],
  clientId: String,
  oid: String,
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  }],
  positionAttributes: {
    type: [PositionAttribute.schema],
  },
});

export interface Client extends Document {
  kind: 'Client';
  name?: string;
  azureRoles?: string[],
  clientId?: string,
  oid?: string;
  roles?: any[];
  positionAttributes?: PositionAttribute[];
  ability?: AppAbility;
}

clientSchema.index({ oid: 1 }, { unique: true, partialFilterExpression: { oid: { $type: 'string' } } });
clientSchema.index({ clientId: 1 }, { unique: true });
clientSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Client = mongoose.model<Client, AccessibleRecordModel<Client>>('Client', clientSchema);
