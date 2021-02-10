import mongoose, { Schema, Document } from 'mongoose';

const roleGroupSchema = new Schema({
    name: String,
});

export interface RoleGroup extends Document {
    name: string;
}

export const RoleGroup = mongoose.model<RoleGroup>('AppRoleGroup', roleGroupSchema);