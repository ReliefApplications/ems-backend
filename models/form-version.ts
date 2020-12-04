import mongoose, { Schema, Document } from 'mongoose';

const formVersionSchema = new Schema({
    createdAt: Date,
    structure: mongoose.Schema.Types.Mixed
});

export interface IFormVersion extends Document {
    createdAt?: Date;
    structure?: any;
}

export const FormVersion = mongoose.model<IFormVersion>('FormVersion', formVersionSchema);