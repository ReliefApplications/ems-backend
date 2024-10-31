import mongoose from 'mongoose';

/** Model for the migration */
const migrationSchema = new mongoose.Schema({
  title: { type: String },
  timestamp: { type: Number },
  description: { type: String },
});

/** Mongo model for the migration table */
export const Migration = mongoose.model('Migration', migrationSchema);
