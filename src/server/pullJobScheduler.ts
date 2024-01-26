import { authType } from '@const/enumTypes';
import {
  BASE_PLACEHOLDER_REGEX,
  extractStringFromBrackets,
} from '../const/placeholders';
import {
  ApiConfiguration,
  Form,
  Notification,
  PullJob,
  Record as RecordModel,
  User,
  Role,
} from '@models';
import pubsub from './pubsub';
import { CronJob } from 'cron';
// import * as CryptoJS from 'crypto-js';
import mongoose from 'mongoose';
import { getToken } from '@utils/proxy';
import { getNextId, transformRecord } from '@utils/form';
import { logger } from '../services/logger.service';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import axios from 'axios';
import { ownershipMappingJSON } from './EIOSOwnernshipMapping';

/** A map with the task ids as keys and the scheduled tasks as values */
const taskMap: Record<string, CronJob> = {};

/** Record's default fields */
const DEFAULT_FIELDS = ['createdBy'];

/**
 * Dynamically building the list of Signal Apps names for EIOS
 */
const EIOS_APP_NAMES: string[] = [
  ...new Set( // Remove duplicate values
    Object.values(ownershipMappingJSON).reduce((prev, curr) => {
      prev.push(...curr); // Push all the Apps names into an array
      return prev;
    }, [])
  ),
];

/**
 * Global function called on server start to initialize all the pullJobs.
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

/**
 * Schedule or re-schedule a pullJob.
 *
 * @param pullJob pull job to schedule
 */
export const scheduleJob = (pullJob: PullJob) => {
  try {
    const task = taskMap[pullJob.id];
    if (task) {
      task.stop();
    }
    const schedule = get(pullJob, 'schedule', '');
    if (cronValidator.isValidCron(schedule)) {
      taskMap[pullJob.id] = new CronJob(
        pullJob.schedule,
        async () => {
          logger.info('📥 Starting a pull from job ' + pullJob.name);
          const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
          try {
            if (apiConfiguration.authType === authType.serviceToService) {
              // Decrypt settings
              // const settings: {
              //   authTargetUrl: string;
              //   apiClientID: string;
              //   safeSecret: string;
              //   scope: string;
              // } = JSON.parse(
              //   CryptoJS.AES.decrypt(
              //     apiConfiguration.settings,
              //     config.get('encryption.key')
              //   ).toString(CryptoJS.enc.Utf8)
              // );

              // Get auth token and start pull Logic
              const token: string = await getToken(apiConfiguration);
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              fetchRecordsServiceToService(pullJob, token);
            }
            if (apiConfiguration.authType === authType.public) {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              fetchRecordsPublic(pullJob);
            }
            if (apiConfiguration.authType === authType.authorizationCode) {
              throw new Error(
                'Unsupported Api configuration with Authorization Code authentication.'
              );
            }
          } catch (err) {
            logger.error(err.message, { stack: err.stack });
          }
        },
        null,
        true
      );
      logger.info('📅 Scheduled job ' + pullJob.name);
    } else {
      throw new Error(`[${pullJob.name}] Invalid schedule: ${schedule}`);
    }
  } catch (err) {
    logger.error(err.message);
  }
};

/**
 * Unschedule an existing pullJob from its id.
 *
 * @param pullJob pull job to unschedule
 */
export const unscheduleJob = (pullJob: PullJob): void => {
  const task = taskMap[pullJob.id];
  if (task) {
    task.stop();
    logger.info(
      `📆 Unscheduled job ${pullJob.name ? pullJob.name : pullJob.id}`
    );
  }
};

/**
 * Fetch records using the hardcoded workflow for service-to-service API type (EIOS).
 *
 * @param pullJob pull job configuration to use
 * @param token authentication token
 */
const fetchRecordsServiceToService = (
  pullJob: PullJob,
  token: string
): void => {
  const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
  // Hard coded for EIOS due to specific behavior
  const EIOS_ORIGIN = 'https://portal.who.int/eios/';
  // === HARD CODED ENDPOINTS ===
  const headers: any = {
    Authorization: 'Bearer ' + token,
  };
  // Hardcoded specific behavior for EIOS
  if (apiConfiguration.endpoint.startsWith(EIOS_ORIGIN)) {
    // === HARD CODED ENDPOINTS ===
    const boardsUrl = 'GetBoards?tags=signal+app';
    const articlesUrl = 'GetPinnedArticles';
    axios({
      url: apiConfiguration.endpoint + boardsUrl,
      method: 'get',
      headers,
    })
      .then(({ data }) => {
        if (data && data.result) {
          const boardIds = data.result.map((x) => x.id);
          axios({
            url: `${apiConfiguration.endpoint}${articlesUrl}?boardIds=${boardIds}`,
            method: 'get',
            headers,
          })
            .then(({ data: data2 }) => {
              if (data2 && data2.result) {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                insertRecords(data2.result, pullJob, true, false);
              }
            })
            .catch((err) => {
              logger.error(
                `Job ${pullJob.name} : Failed to get pinned articles : ${err}`
              );
            });
        }
      })
      .catch((err) => {
        logger.error(
          `Job ${pullJob.name} : Failed to get signal app boards : ${err}`
        );
      });
  } else {
    // Generic case
    axios({
      url: apiConfiguration.endpoint + pullJob.url,
      method: 'get',
      headers,
    })
      .then(({ data }) => {
        const records = pullJob.path ? get(data, pullJob.path) : data;
        if (records) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          insertRecords(records, pullJob, false, false);
        }
      })
      .catch((err) => {
        logger.error(`Job ${pullJob.name} : Failed to fetch data : ${err}`);
      });
  }
};

/**
 * Fetch records using the generic workflow for public endpoints.
 *
 * @param pullJob pull job to use
 */
const fetchRecordsPublic = (pullJob: PullJob): void => {
  const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
  logger.info(`Execute pull job operation: ${pullJob.name}`);
  axios({
    url: apiConfiguration.endpoint + pullJob.url,
    method: 'get',
  })
    .then(({ data }) => {
      const records = pullJob.path ? get(data, pullJob.path) : data;
      if (records) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        insertRecords(records, pullJob, false, false);
      }
    })
    .catch((err) => {
      logger.error(`Job ${pullJob.name} : Failed to fetch data : ${err}`);
    });
};

/**
 * Access property of passed object including nested properties and map properties on array if needed.
 *
 * @param data object to get property in
 * @param identifier path
 * @returns property
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
          value = value.flatMap((x) => (x ? x[field] : null));
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

/**
 * Get Mongo Filters to get user role for a specific application
 *
 * @param appName Name of the application
 * @returns List of Mongo filters
 */
const getUserRoleFiltersFromApp = (appName: string): any => {
  return [
    {
      $lookup: {
        from: 'applications',
        localField: 'application',
        foreignField: '_id',
        as: '_application',
      },
    },
    {
      $match: {
        $and: [
          { title: 'User' },
          { _application: { $elemMatch: { name: appName } } },
        ],
      },
    },
  ];
};

/**
 *  Use the fetched data to insert records into the dB if needed.
 *
 * @param data array of data fetched from API
 * @param pullJob pull job configuration
 * @param isEIOS is EIOS pulljob or not
 * @param fromRoute tells if the insertion is done from pull-job or route
 */
export const insertRecords = async (
  data: any[],
  pullJob: PullJob,
  isEIOS = false,
  fromRoute?: boolean
): Promise<string> => {
  const form = await Form.findById(pullJob.convertTo);
  if (form) {
    const records = [];
    const unicityConditions = pullJob.uniqueIdentifiers;
    // Map unicity conditions to check if we already have some corresponding records in the DB
    const mappedUnicityConditions = unicityConditions.map((x) =>
      Object.keys(pullJob.mapping).find((key) => pullJob.mapping[key] === x)
    );
    // Initialize the array of linked fields in the case we have an array unique identifier with linked fields
    const linkedFieldsArray = new Array<Array<string>>(
      unicityConditions.length
    );
    const filters = [];
    for (let elementIndex = 0; elementIndex < data.length; elementIndex++) {
      const element = data[elementIndex];
      const filter = {};
      for (
        let unicityIndex = 0;
        unicityIndex < unicityConditions.length;
        unicityIndex++
      ) {
        const identifier = unicityConditions[unicityIndex];
        const mappedIdentifier = mappedUnicityConditions[unicityIndex];
        // Check if it's an automatically generated element which already have some part of the identifiers set up
        const value =
          element[`__${identifier}`] === undefined
            ? accessFieldIncludingNested(element, identifier)
            : element[`__${identifier}`];
        // Prevent adding new records with identifier null, or type object or array with any at least one null value in it.
        if (
          !value ||
          (typeof value === 'object' &&
            ((Array.isArray(value) &&
              value.some((x) => x === null || x === undefined)) ||
              !Array.isArray(value)))
        ) {
          element.__notValid = true;
          // If a uniqueIdentifier value is an array, duplicate the element and add filter for the first one since the other will be handled in subsequent steps
        } else if (Array.isArray(value)) {
          // Get related fields from the mapping to duplicate use different values for these ones instead of concatenate everything
          let linkedFields = linkedFieldsArray[unicityIndex];
          if (!linkedFields) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            linkedFields = getLinkedFields(
              identifier,
              pullJob.mapping,
              element
            );
            linkedFieldsArray[unicityIndex] = linkedFields;
          }
          const linkedValues = new Array(linkedFields.length);
          for (
            let linkedIndex = 0;
            linkedIndex < linkedFields.length;
            linkedIndex++
          ) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            linkedValues[linkedIndex] = accessFieldIncludingNested(
              element,
              linkedFields[linkedIndex]
            );
          }
          for (let valueIndex = 0; valueIndex < value.length; valueIndex++) {
            // Push new element if not the first one while setting identifier field and linked fields
            if (valueIndex === 0) {
              element[`__${identifier}`] = value[valueIndex];
              Object.assign(filter, {
                $or: [
                  { [`data.${mappedIdentifier}`]: value[valueIndex] },
                  {
                    [`data.${mappedIdentifier}`]: value[valueIndex].toString(),
                  },
                ],
              });
              for (
                let linkedIndex = 0;
                linkedIndex < linkedFields.length;
                linkedIndex++
              ) {
                element[`__${linkedFields[linkedIndex]}`] =
                  linkedValues[linkedIndex][0];
              }
            } else {
              const newElement = Object.assign({}, element);
              newElement[`__${identifier}`] = value[valueIndex];
              for (
                let linkedIndex = 0;
                linkedIndex < linkedFields.length;
                linkedIndex++
              ) {
                newElement[`__${linkedFields[linkedIndex]}`] =
                  linkedValues[linkedIndex][valueIndex];
              }
              data.splice(elementIndex + 1, 0, newElement);
            }
          }
        } else {
          element[`__${identifier}`] = value;
          Object.assign(filter, {
            $or: [
              { [`data.${mappedIdentifier}`]: value },
              { [`data.${mappedIdentifier}`]: value.toString() },
            ],
          });
        }
      }
      filters.push(filter);
    }
    // Find records already existing if any
    const selectedFields = mappedUnicityConditions.map((x) => `data.${x}`);
    const duplicateRecords = await RecordModel.find({
      form: pullJob.convertTo,
      $or: filters,
    }).select(selectedFields);

    // If EIOS pullJob, build a mapping JSON to assign ownership (role ids)
    const ownershipMappingWithIds: any = {};
    if (isEIOS) {
      // Create a dictionary of user roles ids
      const appRolesWithIds = {};
      const promisesStack = [];
      EIOS_APP_NAMES.forEach((appName) => {
        promisesStack.push(
          Role.aggregate(getUserRoleFiltersFromApp(appName)).then(
            (appUserRole) => {
              if (appUserRole[0]) {
                appRolesWithIds[appName] = appUserRole[0]._id;
              }
            }
          )
        );
      });
      await Promise.allSettled(promisesStack);

      for (const [key, value] of Object.entries(ownershipMappingJSON)) {
        ownershipMappingWithIds[key] = [];
        if (value.length > 0) {
          value.forEach((elt) => {
            if (appRolesWithIds[elt]) {
              ownershipMappingWithIds[key].push(appRolesWithIds[elt]);
            }
          });
        }
      }
    }

    for (const element of data) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const mappedElement = mapData(
        pullJob.mapping,
        element,
        unicityConditions.concat(linkedFieldsArray.flat())
      );
      // Adapt identifiers after mapping so if arrays are involved, it will correspond to each element of the array
      for (
        let unicityIndex = 0;
        unicityIndex < unicityConditions.length;
        unicityIndex++
      ) {
        const identifier = unicityConditions[unicityIndex];
        const mappedIdentifier = mappedUnicityConditions[unicityIndex];
        mappedElement[mappedIdentifier] = element[`__${identifier}`];
        // Adapt also linkedFields if any
        const linkedFields = linkedFieldsArray[unicityIndex];
        if (linkedFields) {
          // Storing already assigned fields in the case we have different fields mapped to the same path
          const alreadyAssignedFields = [];
          for (const linkedField of linkedFields) {
            const mappedField = Object.keys(pullJob.mapping).find(
              (key) =>
                pullJob.mapping[key] === linkedField &&
                !alreadyAssignedFields.includes(key)
            );
            alreadyAssignedFields.push(mappedField);
            mappedElement[mappedField] = element[`__${linkedField}`];
          }
        }
      }
      // Check if element is already stored in the DB and if it has unique identifiers correctly set up
      const isDuplicate = element.__notValid
        ? true
        : duplicateRecords.some((record) => {
            for (
              let unicityIndex = 0;
              unicityIndex < unicityConditions.length;
              unicityIndex++
            ) {
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

      if (isEIOS) {
        // Assign correct ownership value based on mapping JSON and board name
        let boardName = mappedElement.article_board_name;
        if (!ownershipMappingWithIds[boardName]) {
          boardName = 'default';
        }
        mappedElement.ownership =
          ownershipMappingWithIds[boardName]?.map(String);
      }
      // If everything is fine, push it in the array for saving
      if (!isDuplicate) {
        transformRecord(mappedElement, form.fields);
        let record = new RecordModel({
          incrementalId: await getNextId(
            String(form.resource ? form.resource : pullJob.convertTo)
          ),
          form: pullJob.convertTo,
          data: mappedElement,
          resource: form.resource ? form.resource : null,
          _form: {
            _id: form._id,
            name: form.name,
          },
        }) as RecordModel;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        record = await setSpecialFields(record);
        records.push(record);
      }
    }
    let insertReportMessage = '';
    try {
      const insertedRecords = await RecordModel.insertMany(records);
      if (fromRoute) {
        insertReportMessage = `${insertedRecords.length} new records of form "${form.name}" created from records insertion route`;
      } else {
        insertReportMessage = `${insertedRecords.length} new records of form "${form.name}" created from pulljob "${pullJob.name}"`;
      }
      logger.info(insertReportMessage);
      if (pullJob.channel && records.length > 0) {
        const notification = new Notification({
          action: insertReportMessage,
          content: '',
          createdAt: new Date(),
          channel: pullJob.channel.toString(),
          seenBy: [],
        });
        await notification.save();
        const publisher = await pubsub();
        publisher.publish(pullJob.channel.toString(), { notification });
      }
      return insertReportMessage;
    } catch (err) {
      return 'Record insertion failed';
    }
  } else {
    return 'Cannot find form with id ' + pullJob.convertTo;
  }
};

/**
 * Map the data retrieved so it match with the target Form.
 *
 * @param mapping mapping
 * @param data data to map
 * @param skippedIdentifiers keys to skip
 * @returns mapped data
 */
export const mapData = (
  mapping: any,
  data: any,
  skippedIdentifiers?: string[]
): any => {
  const out = {};
  if (mapping) {
    for (const key of Object.keys(mapping)) {
      const identifier: string = mapping[key];
      if (identifier.match(BASE_PLACEHOLDER_REGEX)) {
        // Put the raw string passed if it's surrounded by double brackets
        out[key] = extractStringFromBrackets(identifier);
      } else {
        // Skip identifiers overwrited in the next step (LinkedFields and UnicityConditions)
        if (!skippedIdentifiers.includes(identifier)) {
          // Access field
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          out[key] = accessFieldIncludingNested(data, identifier);
        }
      }
    }
    return out;
  } else {
    return data;
  }
};

/**
 * Get fields linked with the passed array identifiers because using a mapping on the same array.
 *
 * @param identifier key
 * @param mapping mapping
 * @param data data to insert
 * @returns list of linked fields.
 */
const getLinkedFields = (
  identifier: string,
  mapping: any,
  data: any
): string[] => {
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
      if (
        externalKey !== identifier &&
        externalKey.includes(identifierArrayKey)
      ) {
        linkedFields.push(externalKey);
      }
    }
    return linkedFields;
  } else {
    return [];
  }
};

/**
 * If some specialFields are used in the mapping, set them at the right place in the record model.
 *
 * @param record new record
 * @returns updated record.
 */
const setSpecialFields = async (record: RecordModel): Promise<RecordModel> => {
  const keys = Object.keys(record.data);
  for (const key of keys) {
    if (DEFAULT_FIELDS.includes(key)) {
      switch (key) {
        case 'createdBy': {
          const username = record.data[key];
          const user = await User.findOne({ username }, 'id');
          if (user && user?.id) {
            record.createdBy.user = new mongoose.Types.ObjectId(user._id);
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
