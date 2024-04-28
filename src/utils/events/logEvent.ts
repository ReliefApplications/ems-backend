/* eslint-disable @typescript-eslint/naming-convention */
import { Channel, Form, Record, Resource, Role } from '@models';
import { Event, EventType, EventConfig, RecordEvent } from './event.model';
import config from 'config';
import { EVENT_FORM, EVENT_RESOURCE } from './eventForm';
import { getNextId } from '@utils/form';

/** Create the log form if it does not exist */
export const createEventForm = async () => {
  // First, check if the log form exists
  const oldForm = await Form.findById(EVENT_FORM._id);
  if (oldForm) {
    return oldForm;
  }

  console.log('Creating event form...');

  // define default permission lists
  const globalRoles = (
    await Role.find({ application: null }).select('_id')
  ).map((r) => r._id);

  const formPermissions = {
    canSee: globalRoles,
    canUpdate: globalRoles,
    canDelete: globalRoles,
  };

  const resourcePermissions = {
    ...formPermissions,
    canSeeRecords: [],
    canCreateRecords: [],
    canUpdateRecords: [],
    canDeleteRecords: [],
  };

  // create resource
  const resource = new Resource({
    ...EVENT_RESOURCE,
    permissions: resourcePermissions,
  });
  await resource.save();
  console.log('Resource created');

  // Create the channel, with a special name
  const channel = new Channel({
    title: 'System Events',
    form: EVENT_FORM._id,
  });
  await channel.save();
  console.log('Channel created');

  // create form
  const form = new Form({
    ...EVENT_FORM,
    permissions: formPermissions,
    resource: resource._id,
    channels: [channel._id],
  });
  await form.save();
  console.log('Form created');
  return form;
};

/**
 * Log an event
 *
 * @param event Event to log
 */
export const logEvent = async (event: Event) => {
  const c = config.get('events') as EventConfig;
  console.log('config', c);
  console.log('event', event);
  if (c.provider !== 'oort') {
    return;
  }

  // Create the form if it does not exist
  const eventForm = await createEventForm();

  // Check if the event should be logged
  if (
    (event.type === EventType.LOGIN && !c.login) ||
    (event.type === EventType.LOGOUT && !c.logout) ||
    (event.type === EventType.DOWNLOAD_FILE && !c.downloadFile) ||
    (event.type === EventType.NAVIGATE && !c.navigate)
  ) {
    return;
  }

  let extraData: {
    record_id?: string;
    form_name?: string;
    file_name?: string;
    page_name?: string;
  } = {};

  switch (event.type) {
    case EventType.ADD_RECORD:
    case EventType.UPDATE_RECORD:
    case EventType.DELETE_RECORD: {
      const recordEvent: RecordEvent = event;
      const formsToLog: string[] =
        c[
          event.type === EventType.ADD_RECORD
            ? 'addRecord'
            : event.type === EventType.UPDATE_RECORD
            ? 'updateRecord'
            : 'deleteRecord'
        ] ?? [];

      if (!formsToLog.includes(recordEvent.form)) {
        return;
      }

      extraData = {
        record_id: recordEvent.record,
        form_name: recordEvent.form,
      };
      break;
    }
    case EventType.DOWNLOAD_FILE: {
      const downloadEvent = event;
      extraData = {
        file_name: downloadEvent.file,
        form_name: downloadEvent.form,
      };
      break;
    }
  }

  // Get next ID
  const { incrementalId, incID } = await getNextId(eventForm);

  // Create the event record
  const eventRec = new Record({
    incrementalId,
    incID,
    form: eventForm._id,
    lastUpdateForm: eventForm._id,
    resource: eventForm.resource,
    data: {
      type: event.type,
      datetime: event.datetime,
      user: [event.user],
      ...extraData,
    },
    _form: {
      _id: eventForm._id,
      name: eventForm.name,
    },
    archived: false,
  });

  await eventRec.save();
};
