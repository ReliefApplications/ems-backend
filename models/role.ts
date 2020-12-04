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
    }
});

roleSchema.index({title: 1, application: 1}, {unique: true});

export interface IRole extends Document {
    title: string;
    application: any;
    permissions: any;
}

export const Role = mongoose.model<IRole>('Role', roleSchema);