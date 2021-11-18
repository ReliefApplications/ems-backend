import { authType } from '../const/enumTypes';
import { ApiConfiguration, Form, Notification, PullJob, Record, User } from '../models';
import pubsub from './pubsub';
import cron from 'node-cron';
import fetch from 'node-fetch';
import * as CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { getToken } from '../utils/proxy';
import { getNextId } from '../utils/form';
dotenv.config();
const taskMap = {};
const DEFAULT_FIELDS = ['createdBy'];

/* Global function called on server start to initialize all the pullJobs.
*/
const pullJobScheduler = async () => {

  const pullJobs = await PullJob.find({ status: 'active' }).populate({
    path: 'apiConfiguration',
    model: 'ApiConfiguration',
  });

  for (const pullJob of pullJobs) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    scheduleJob(pullJob);
  }
};

export default pullJobScheduler;

/* Schedule or re-schedule a pullJob.
*/
export const scheduleJob = (pullJob: PullJob) => {
  const task = taskMap[pullJob.id];
  if (task) {
    task.stop();
  }
  taskMap[pullJob.id] = cron.schedule(pullJob.schedule, async () => {
    console.log('📥 Starting a pull from job ' + pullJob.name);
    const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
    if (apiConfiguration.authType === authType.serviceToService) {

      // Decrypt settings
      const settings: { authTargetUrl: string, apiClientID: string, safeSecret: string, scope: string }
        = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));

      // Get auth token and start pull Logic
      const token: string = await getToken(apiConfiguration);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      fetchRecordsServiceToService(pullJob, settings, token);
    }
  });
  console.log('📅 Scheduled job ' + pullJob.name);
};

/* Unschedule an existing pullJob from its id.
*/
export const unscheduleJob = (pullJob: { id?: string, name?: string }): void => {
  const task = taskMap[pullJob.id];
  if (task) {
    task.stop();
    console.log(`📆 Unscheduled job ${pullJob.name ? pullJob.name : pullJob.id}`);
  }
};

/* FetchRecords using the hardcoded workflow for service-to-service API type (EIOS).
*/
const fetchRecordsServiceToService = (pullJob: PullJob, settings: {
  authTargetUrl: string,
  apiClientID: string,
  safeSecret: string,
  scope: string,
}, token: string): void => {
  const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
  // === HARD CODED ENDPOINTS ===
  const boardsUrl = 'GetBoards?tags=signal+app';
  const articlesUrl = 'GetPinnedArticles';
  // === HARD CODED ENDPOINTS ===
  const headers: any = {
    'Authorization': 'Bearer ' + token,
  };
  fetch(apiConfiguration.endpoint + boardsUrl, {
    method: 'get',
    headers,
  })
    .then(res => res.json())
    .then(json => {
      if (json && json.result) {
        const boardIds = json.result.map(x => x.id);
        fetch(`${apiConfiguration.endpoint}${articlesUrl}?boardIds=${boardIds}`, {
          method: 'get',
          headers,
        })
          .then(res => res.json())
          .then(json2 => {
            if (json2 && json2.result) {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              insertRecords(json2.result, pullJob);
            }
          });
      }
    });
};

/* Use the fetched data to insert records into the dB if needed.
*/
export const insertRecords = async (data: any[], pullJob: PullJob): Promise<void> => {
  const form = await Form.findById(pullJob.convertTo);
  if (form) {
    const records = [];
    const unicityConditions = pullJob.uniqueIdentifiers;
    // Map unicity conditions to check if we already have some corresponding records in the DB 
    const mappedUnicityConditions = unicityConditions.map(x => Object.keys(pullJob.mapping).find(key => pullJob.mapping[key] === x));
    // Initialize the array of linked fields in the case we have an array unique identifier with linked fields
    const linkedFieldsArray = new Array<Array<string>>(unicityConditions.length);
    const filters = [];
    for (let elementIndex = 0; elementIndex < data.length; elementIndex++) {
      const element = data[elementIndex];
      const filter = {};
      for (let unicityIndex = 0; unicityIndex < unicityConditions.length; unicityIndex++) {
        const identifier = unicityConditions[unicityIndex];
        const mappedIdentifier = mappedUnicityConditions[unicityIndex];
        // Check if it's an automatically generated element which already have some part of the identifiers set up
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const value = element[`__${identifier}`] === undefined ? accessFieldIncludingNested(element, identifier) : element[`__${identifier}`];
        // Prevent adding new records with identifier null, or type object or array with any at least one null value in it.
        if (!value || (typeof value === 'object' && (Array.isArray(value) && value.some(x => x === null || x === undefined) || !Array.isArray(value)))) {
          element.__notValid = true;
          // If a uniqueIdentifier value is an array, duplicate the element and add filter for the first one since the other will be handled in subsequent steps
        } else if (Array.isArray(value)) {
          // Get related fields from the mapping to duplicate use different values for these ones instead of concatenate everything
          let linkedFields = linkedFieldsArray[unicityIndex];
          if (!linkedFields) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            linkedFields = getLinkedFields(identifier, pullJob.mapping, element);
            linkedFieldsArray[unicityIndex] = linkedFields;
          }
          const linkedValues = new Array(linkedFields.length);
          for (let linkedIndex = 0; linkedIndex < linkedFields.length; linkedIndex++) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            linkedValues[linkedIndex] = accessFieldIncludingNested(element, linkedFields[linkedIndex]);
          }
          for (let valueIndex = 0; valueIndex < value.length; valueIndex++) {
            // Push new element if not the first one while setting identifier field and linked fields
            if (valueIndex === 0) {
              element[`__${identifier}`] = value[valueIndex];
              Object.assign(filter, { $or: [{ [`data.${mappedIdentifier}`]: value[valueIndex] }, { [`data.${mappedIdentifier}`]: value[valueIndex].toString() }] });
              for (let linkedIndex = 0; linkedIndex < linkedFields.length; linkedIndex++) {
                element[`__${linkedFields[linkedIndex]}`] = linkedValues[linkedIndex][0];
              }
            } else {
              const newElement = Object.assign({}, element);
              newElement[`__${identifier}`] = value[valueIndex];
              for (let linkedIndex = 0; linkedIndex < linkedFields.length; linkedIndex++) {
                newElement[`__${linkedFields[linkedIndex]}`] = linkedValues[linkedIndex][valueIndex];
              }
              data.splice(elementIndex + 1, 0, newElement);
            }
          }
        } else {
          element[`__${identifier}`] = value;
          Object.assign(filter, { $or: [{ [`data.${mappedIdentifier}`]: value }, { [`data.${mappedIdentifier}`]: value.toString() }] });
        }
      }
      filters.push(filter);
    }
    // Find records already existing if any
    const selectedFields = mappedUnicityConditions.map(x => `data.${x}`);
    const duplicateRecords = await Record.find({ form: pullJob.convertTo, $or: filters }).select(selectedFields);
    for (const element of data) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const mappedElement = mapData(pullJob.mapping, element, form.fields, unicityConditions.concat(linkedFieldsArray.flat()));
      // Adapt identifiers after mapping so if arrays are involved, it will correspond to each element of the array
      for (let unicityIndex = 0; unicityIndex < unicityConditions.length; unicityIndex++) {
        const identifier = unicityConditions[unicityIndex];
        const mappedIdentifier = mappedUnicityConditions[unicityIndex];
        mappedElement[mappedIdentifier] = element[`__${identifier}`];
        // Adapt also linkedFields if any
        const linkedFields = linkedFieldsArray[unicityIndex];
        if (linkedFields) {
          for (const linkedField of linkedFields) {
            const mappedField = Object.keys(pullJob.mapping).find(key => pullJob.mapping[key] === linkedField);
            mappedElement[mappedField] = element[`__${linkedField}`];
          }
        }
      }
      // Check if element is already stored in the DB and if it has unique identifiers correctly set up
      const isDuplicate = element.__notValid ? true : duplicateRecords.some(record => {
        for (let unicityIndex = 0; unicityIndex < unicityConditions.length; unicityIndex++) {
          const identifier = unicityConditions[unicityIndex];
          const mappedIdentifier = mappedUnicityConditions[unicityIndex];
          const recordValue = record.data[mappedIdentifier] || '';
          const elementValue = element[`__${identifier}`] || '';
          if (recordValue.toString() !== elementValue.toString()) {
            return false;
          }
        }
        return true;
      });
      // If everything is fine, push it in the array for saving
      if (!isDuplicate) {
        let record = new Record({
          incrementalId: await getNextId(String(pullJob.convertTo)),
          form: pullJob.convertTo,
          createdAt: new Date(),
          modifiedAt: new Date(),
          data: mappedElement,
          resource: form.resource ? form.resource : null,
        });
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        record = await setSpecialFields(record);
        records.push(record);
      }
    }
    Record.insertMany(records, {}, async () => {
      if (pullJob.channel && records.length > 0) {
        const notification = new Notification({
          action: `${records.length} ${form.name} created from ${pullJob.name}`,
          content: '',
          createdAt: new Date(),
          channel: pullJob.channel.toString(),
          seenBy: [],
        });
        await notification.save();
        const publisher = await pubsub();
        publisher.publish(pullJob.channel.toString(), { notification });
      }
    });
  }
};

/* Map the data retrieved so it match with the target Form.
*/
export const mapData = (mapping: any, data: any, fields: any, skippedIdentifiers?: string[]): any => {
  const out = {};
  if (mapping) {
    for (const key of Object.keys(mapping)) {
      const identifier = mapping[key];
      if (identifier.startsWith('$$')) {
        // Put the raw string passed if it begins with $$
        out[key] = identifier.substring(2);
      } else {
        // Skip identifiers overwrited in the next step (LinkedFields and UnicityConditions)
        if (!skippedIdentifiers.includes(identifier)) {
          // Access field
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          let value = accessFieldIncludingNested(data, identifier);
          if (Array.isArray(value) && fields.find(x => x.name === key).type === 'text') {
            value = value.toString();
          }
          out[key] = value;
        }
      }
    }
    return out;
  } else {
    return data;
  }
};

/* Access property of passed object including nested properties and map properties on array if needed.
*/
const accessFieldIncludingNested = (data: any, identifier: string): any => {
  if (identifier.includes('.')) {
    // Loop to access nested elements if we have .
    const fields: any[] = identifier.split('.');
    const firstField = fields.shift();
    let value = data[firstField];
    for (const field of fields) {
      if (value) {
        if (Array.isArray(value) && isNaN(field)) {
          value = value.flatMap(x => x ? x[field] : null);
        } else {
          value = value[field];
        }
      } else {
        return null;
      }
    }
    return value;
  } else {
    // Map to corresponding property
    return data[identifier];
  }
};

/* Get fields linked with the passed array identifiers because using a mapping on the same array
*/
const getLinkedFields = (identifier: string, mapping: any, data: any): string[] => {
  if (identifier.includes('.')) {
    const fields: any[] = identifier.split('.');
    let identifierArrayKey = fields.shift();
    let value = data[identifierArrayKey];
    if (!Array.isArray(value)) {
      for (const field of fields) {
        identifierArrayKey += '.' + field;
        if (value) {
          if (Array.isArray(value) && isNaN(field)) {
            value = false;
          } else {
            value = value[field];
          }
        }
      }
    }
    const linkedFields = [];
    for (const key of Object.keys(mapping)) {
      const externalKey = mapping[key];
      if (externalKey !== identifier && externalKey.includes(identifierArrayKey)) {
        linkedFields.push(externalKey);
      }
    }
    return linkedFields;
  } else {
    return [];
  }
};

/* If some specialFields are used in the mapping, set them at the right place in the record model.
*/
const setSpecialFields = async (record: Record): Promise<Record> => {
  const keys = Object.keys(record.data);
  for (const key of keys) {
    if (DEFAULT_FIELDS.includes(key)) {
      switch (key) {
        case 'createdBy': {
          const username = record.data[key];
          const user = await User.findOne({ username }, 'id');
          if (user && user?.id) {
            record.createdBy.user = mongoose.Types.ObjectId(user.id);
            delete record.data[key];
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  }
  return record;
};
