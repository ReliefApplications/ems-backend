import mongoose, { Schema, Document } from 'mongoose';

const channelSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    global: Boolean
});

channelSchema.index({title: 1, global: 1}, {unique: true});

export interface Channel extends Document {
    title?: string;
    global?: boolean;
}

export const Channel = mongoose.model<Channel>('Channel', channelSchema);