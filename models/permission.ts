import mongoose, { Schema, Document } from 'mongoose';

const permissionSchema = new Schema({
    type: {
        type: String,
        required: true
    },
    global: Boolean
});

permissionSchema.index({type: 1, global: 1}, {unique: true});

export interface IPermission extends Document {
    type?: string;
    global?: boolean;
}

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);