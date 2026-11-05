import { Version } from './version.model';

export type Change = {
  type: 'add' | 'remove' | 'modify';
  displayType: string;
  field: string;
  displayName: string;
  /** Target language of a translated field (its translateTo), if any */
  lang?: string;
  old?: any;
  new?: any;
};

export type RecordHistory = {
  createdAt: Date;
  createdBy: string;
  changes: Change[];
  version?: Version;
}[];

export type RecordHistoryMeta = {
  form: string;
  record: string;
  fields: string;
  fromDate: string;
  toDate: string;
  exportDate: string;
};
