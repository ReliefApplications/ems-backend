import mongoose, { Schema, Document } from 'mongoose';

const formVersionSchema = new Schema({
    createdAt: Date,
    structure: mongoose.Schema.Types.Mixed
});

export interface FormVersion extends Document {
    createdAt?: Date;
    structure?: any;
}

export default mongoose.model<FormVersion>('FormVersion', formVersionSchema);