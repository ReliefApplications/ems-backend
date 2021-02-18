import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const userSchema = new Schema({
    username: String,
    name: String,
    oid: String,
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    positionAttributes: {
        type : [mongoose.Schema.Types.ObjectId],
        ref: 'PositionAttribute'
    }
});

export interface User extends Document {
    kind: 'User';
    username?: string;
    name?: string;
    oid?: string;
    roles?: any[];
    positionAttributes: any;
}

userSchema.index({oid: 1}, {unique: true});
userSchema.plugin(accessibleRecordsPlugin);
export const User = mongoose.model<User, AccessibleRecordModel<User>>('User', userSchema);