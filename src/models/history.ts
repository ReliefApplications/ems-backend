export type Change = {
  type: 'add' | 'remove' | 'modify';
  displayType: string;
  field: string;
  displayName: string;
  old?: any;
  new?: any;
};

export type RecordHistory = {
  created: Date;
  createdBy: string;
  changes: Change[];
}[];

export type RecordHistoryMeta = {
  form: string;
  record: string;
  field: string;
  fromDate: string;
  toDate: string;
  exportDate: string;
};
