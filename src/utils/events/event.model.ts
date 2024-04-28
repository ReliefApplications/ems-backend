/* eslint-disable @typescript-eslint/naming-convention */

/** Event types */
export enum EventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ADD_RECORD = 'ADD_RECORD',
  UPDATE_RECORD = 'UPDATE_RECORD',
  DELETE_RECORD = 'DELETE_RECORD',
  DOWNLOAD_FILE = 'DOWNLOAD_FILE',
  NAVIGATE = 'NAVIGATE',
}

type LoginEvent = {
  type: EventType.LOGIN;
  user: string;
  datetime: Date;
};
type LogoutEvent = {
  type: EventType.LOGOUT;
  user: string;
  datetime: Date;
};
type AddRecordEvent = {
  type: EventType.ADD_RECORD;
  user: string;
  datetime: Date;
  record: string;
  form: string;
};
type UpdateRecordEvent = {
  type: EventType.UPDATE_RECORD;
  user: string;
  datetime: Date;
  record: string;
  form: string;
};
type DeleteRecordEvent = {
  type: EventType.DELETE_RECORD;
  user: string;
  datetime: Date;
  record: string;
  form: string;
};
type DownloadFileEvent = {
  type: EventType.DOWNLOAD_FILE;
  user: string;
  datetime: Date;
  file: string;
  form: string;
};
type NavigateEvent = {
  type: EventType.NAVIGATE;
  user: string;
  datetime: Date;
  page: string;
};

/** Event type */
export type Event =
  | LoginEvent
  | LogoutEvent
  | AddRecordEvent
  | UpdateRecordEvent
  | DeleteRecordEvent
  | DownloadFileEvent
  | NavigateEvent;

export type RecordEvent =
  | AddRecordEvent
  | UpdateRecordEvent
  | DeleteRecordEvent;

/** Type for the config object */
export type EventConfig = {
  provider: 'oort' | 'mixpanel' | null;
  login: boolean;
  logout: boolean;
  downloadFile: boolean;
  navigate: boolean;
  /** name of forms that that would raise a new event when interacting with its records */
  addRecord: string[];
  updateRecord: string[];
  deleteRecord: string[];
};
