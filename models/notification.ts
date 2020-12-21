import mongoose, { Schema, Document } from 'mongoose';

const notificationSchema = new Schema({
    action: String,
    content: mongoose.Schema.Types.Mixed,
    createdAt: Date,
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
});

export interface Notification extends Document {
    action: string;
    content: any;
    createdAt: Date;
    channel: any;
}

export const Notification = mongoose.model<Notification>('Notification', notificationSchema);