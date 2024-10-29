import mongoose from 'mongoose';

/** Migration type */
export interface MigrationEntry {
  title: string;
  timestamp: number;
  description: string;
}

/** Schema for the migration */
const migrationEntrySchema = new mongoose.Schema<MigrationEntry>(
  {
    title: { type: String },
    timestamp: { type: Number },
    description: { type: String },
  },
  { _id: false }
);

/** Model for the migration storage system */
const migrationSchema = new mongoose.Schema(
  {
    name: String,
    lastRun: String,
    migrations: [migrationEntrySchema],
  },
  {
    timestamps: true,
  }
);

/** Mongo model for the migration table */
export const Migration = mongoose.model('Migration', migrationSchema);
