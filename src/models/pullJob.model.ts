import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { status } from '@const/enumTypes';
import { ApiConfiguration } from './apiConfiguration.model';
import * as cron from 'cron-validator';

/** Mongoose pull job schema declaration */
const pullJobSchema = new Schema({
  name: String,
  status: {
    type: String,
    enum: Object.values(status),
  },
  apiConfiguration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiConfiguration',
  },
  url: String,
  path: String,
  schedule: {
    type: String,
    validate: {
      validator: function (value) {
        return value ? cron.isValidCron(value) : false;
      },
    },
  },
  convertTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
  },
  mapping: mongoose.Schema.Types.Mixed,
  uniqueIdentifiers: [String],
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
  },
});

pullJobSchema.index({ name: 1 }, { unique: true });

/** Pull job documents interface declaration */
export interface PullJob extends Document {
  kind: 'PullJob';
  name: string;
  status: string;
  apiConfiguration: ApiConfiguration;
  url: string;
  path: string;
  schedule: string;
  convertTo: string;
  mapping: any;
  uniqueIdentifiers: string[];
  channel: string;
}
pullJobSchema.plugin(accessibleRecordsPlugin);

/** Mongoose pull job model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PullJob = mongoose.model<PullJob, AccessibleRecordModel<PullJob>>(
  'PullJob',
  pullJobSchema
);
