import mongoose, { Schema, Document } from 'mongoose';

const versionSchema = new Schema({
    createdAt: Date,
    structure: mongoose.Schema.Types.Mixed
});

export interface Version extends Document {
    createdAt?: Date;
    structure?: any;
}

export const Version = mongoose.model<Version>('Version', versionSchema);