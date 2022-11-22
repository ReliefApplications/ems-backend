import { Schema, Document } from 'mongoose';

/** Mongoose distribution list schema declaration */
export const distributionListSchema = new Schema(
  {
    name: String,
    emails: [String],
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** distribution list documents interface declaration */
export interface DistributionList extends Document {
  kind: 'DistributionList';
  name?: string;
  emails?: string[];
  createdAt?: Date;
  modifiedAt?: Date;
}
