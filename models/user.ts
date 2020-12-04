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

export interface IUser extends Document {
    username?: string;
    name?: string;
    roles?: any[];
    oid?: string;
}

userSchema.index({oid: 1}, {unique: true});

export const User = mongoose.model<IUser>('User', userSchema);