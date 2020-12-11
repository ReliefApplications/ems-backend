import mongoose, { Schema, Document } from 'mongoose';

const versionSchema = new Schema({
    createdAt: Date,
    data: mongoose.Schema.Types.Mixed
});

export interface Version extends Document {
    createdAt?: Date;
    data?: any;
}

export const Version = mongoose.model<Version>('Version', versionSchema);