import mongoose, { Schema, Document } from 'mongoose';
import { Channel } from './channel';
import { Permission } from './permission';
import { RoleGroup } from './roleGroup';

const roleSchema = new Schema({
    title: String,
    roleGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoleGroup'
    },
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    },
    channels: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Channel'
    }
});

roleSchema.index({title: 1, appGroup: 1}, {unique: true});

export interface Role extends Document {
    title: string;
    roleGroup: RoleGroup;
    permissions: Permission[];
    channels: Channel[];
}

export const Role = mongoose.model<Role>('Role', roleSchema);