import mongoose, { Schema, Document } from 'mongoose';

const dashboardSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed
});

export interface Dashboard extends Document {
    name?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    structure?: any;
}

export default mongoose.model<Dashboard>('Dashboard', dashboardSchema);
