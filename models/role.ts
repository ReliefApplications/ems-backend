import mongoose, { Schema, Document } from 'mongoose';

const roleSchema = new Schema({
    title: String,
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    },
    permissions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Permission'
    },
    notifications: [String],
});

roleSchema.index({title: 1, application: 1}, {unique: true});

export interface Role extends Document {
    title: string;
    application: any;
    permissions: any;
    notifications: string[];
}

export const Role = mongoose.model<Role>('Role', roleSchema);