import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const clientSchema = new Schema({
    name: String,
    description: String,
    createdAt: Date,
    modifiedAt: Date,
    origins: [String]
});

clientSchema.index({name: 1}, {unique: true});

export interface Client extends Document {
    kind: 'Client';
    name?: string;
    createdAt: Date;
    modifiedAt: Date;
    description?: string;
    origins?: string[]
}
clientSchema.plugin(accessibleRecordsPlugin);
export const Client = mongoose.model<Client, AccessibleRecordModel<Client>>('Client', clientSchema);
