import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const userSchema = new Schema({
    username: String,
    name: String,
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    oid: String
});

export interface User extends Document {
    kind: 'User';
    username?: string;
    name?: string;
    roles?: any[];
    oid?: string;
}

userSchema.index({oid: 1}, {unique: true});
userSchema.plugin(accessibleRecordsPlugin);
export const User = mongoose.model<User, AccessibleRecordModel<User>>('User', userSchema);