export type ChangeType = {
  type: string;
  field: string;
  displayName: string;
  old?: any;
  new?: any;
};

export type RecordHistoryType = {
  created: Date;
  createdBy: string;
  changes: ChangeType[];
}[];

export type RecordHistoryMetaType = {
  form: string;
  record: string;
  field: string;
  fromDate: string;
  toDate: string;
  exportDate: string;
};
