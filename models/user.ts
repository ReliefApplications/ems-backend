import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { AppAbility } from '../security/defineAbilityFor';
import { PositionAttribute } from './positionAttribute';

const userSchema = new Schema({
    username: String,
    name: String,
    oid: String,
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    positionAttributes: {
        type: [PositionAttribute.schema]
    }
});

export interface User extends Document {
    kind: 'User';
    username?: string;
    name?: string;
    oid?: string;
    roles?: any[];
    positionAttributes?: PositionAttribute[];
    ability?: AppAbility;
}

userSchema.index({oid: 1}, {unique: true, partialFilterExpression: {oid: {$type: "string"}}});
userSchema.index({username: 1}, {unique: true});
userSchema.plugin(accessibleRecordsPlugin);
export const User = mongoose.model<User, AccessibleRecordModel<User>>('User', userSchema);