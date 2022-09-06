import { Version } from './version.model';

export type Change = {
  type: 'add' | 'remove' | 'modify';
  displayType: string;
  field: string;
  displayName: string;
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
  field: string;
  fromDate: string;
  toDate: string;
  exportDate: string;
};
