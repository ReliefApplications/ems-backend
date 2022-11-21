import xlsx from 'node-xlsx';
import { startDatabase } from './src/server/database';
import { Form, Record, User } from './src/models';
import { getNextId } from './src/utils/form';
import dotenv from 'dotenv';

dotenv.config();

const parseDate = (rawValue: string): Date => {
  if (rawValue) {
    try {
      const parts = rawValue.split('/');
      const year = +parts[2] + 2000;
      const month = +parts[0] - 1;
      const day = +parts[1];
      const date = new Date(year, month, day);
      if (isNaN(date.valueOf())) {
        console.log(rawValue);
        return null;
      } else {
        return date;
      }
    } catch {
      console.log(rawValue);
      return null;
    }
  } else {
    return null;
  }
};

const SIGNAL_FORM_NAME = 'Signal HQ';
const INFORMATION_FORM_NAME = 'Information HQ';
const ACTION_FORM_NAME = 'Add new action';

const FILE_NAME = 'import-file.xlsm';

const OWNERSHIP_ROLE = '61013f028ce0728086d58819';

/**
 * Use to read excel file sheet and save records into database.
 *
 * @returns information message
 */
const readImportFile = async () => {
  // Start db connection
  await startDatabase({
    autoReconnect: true,
    reconnectInterval: 5000,
    reconnectTries: 3,
    poolSize: 10,
  });

  // Get forms
  const forms: Form[] = await Form.find({
    name: { $in: [SIGNAL_FORM_NAME, INFORMATION_FORM_NAME, ACTION_FORM_NAME] },
  }).populate({
    path: 'resource',
    model: 'Resource',
  });

  const signalForm = forms.find((x) => x.name == SIGNAL_FORM_NAME);
  const informationForm = forms.find((x) => x.name == INFORMATION_FORM_NAME);
  const actionForm = forms.find((x) => x.name == ACTION_FORM_NAME);

  if (!signalForm || !informationForm || !actionForm) {
    throw new Error('Missing one form');
  }

  const user = await User.findOne({ username: 'tahelewe@who.int' });

  // Definition of columns
  const SIGNAL_COLUMNS = [
    {
      index: 1,
      name: 'createdAt',
      path: 'createdAt',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 2,
      name: 'createdBy',
      path: 'createdBy',
      value: () => ({
        user: user.id,
      }),
    },
    {
      index: 3,
      name: 'modifiedAt',
      path: 'modifiedAt',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 4,
      name: 'modifiedBy',
      path: 'modifiedBy',
      value: () => ({
        user: user.id,
      }),
    },
    {
      index: 5,
      name: 'region',
      path: 'data.region',
      value: (rawValue) => rawValue?.split(';') || undefined,
    },
    {
      index: 6,
      name: 'affected_countries',
      path: 'data.affected_countries',
      value: (rawValue) => rawValue?.split(';') || undefined,
    },
    {
      index: 7,
      name: 'hazard',
      path: 'data.hazard',
      value: (rawValue) => rawValue,
    },
    {
      index: 8,
      name: 'syndrome',
      path: 'data.syndrome',
      value: (rawValue) => rawValue,
    },
    {
      index: 9,
      name: 'disease',
      path: 'data.disease',
      value: (rawValue) => rawValue,
    },
    {
      index: 10,
      name: 'title',
      path: 'data.title',
      value: (rawValue) => rawValue,
    },
    {
      index: 11,
      name: 'description',
      path: 'data.description',
      value: (rawValue) => rawValue,
    },
    {
      index: 12,
      name: 'date_reported_source',
      path: 'data.date_reported_source',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 13,
      name: 'ownership',
      path: 'data.ownership',
      value: () => OWNERSHIP_ROLE,
    },
    {
      index: 14,
      name: 'is_in_ems',
      path: 'data.is_in_ems',
      value: (rawValue) => (rawValue === 'True' ? true : false),
    },
    {
      index: 15,
      name: 'hq_publication_status',
      path: 'data.hq_publication_status',
      value: (rawValue) => rawValue,
    },
    {
      index: 16,
      name: 'philist',
      path: 'data.philist',
      value: (rawValue) => (rawValue === 'True' ? true : false),
    },
    {
      index: 17,
      name: 'philist_date',
      path: 'data.philist_date',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 18,
      name: 'whedaemm',
      path: 'data.whedaemm',
      value: (rawValue) => (rawValue === 'True' ? true : false),
    },
    {
      index: 19,
      name: 'whedaemm_from',
      path: 'data.whedaemm_from',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 20,
      name: 'publish_to_internal_dashboard',
      path: 'data.publish_to_internal_dashboard',
      value: (rawValue) => (rawValue === 'Yes' ? true : false),
    },
    {
      index: 21,
      name: 'internal_dashboard_from',
      path: 'data.internal_dashboard_from',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 22,
      name: 'internal_dashboard_to',
      path: 'data.internal_dashboard_to',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 23,
      name: 'outcome',
      path: 'data.outcome',
      value: (rawValue) => rawValue,
    },
    {
      index: 24,
      name: 'monitoring',
      path: 'data.monitoring',
      value: (rawValue) => rawValue,
    },
  ];
  const INFORMATION_COLUMNS = [
    {
      index: 25,
      name: 'createdAt',
      path: 'createdAt',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 26,
      name: 'modifiedAt',
      path: 'modifiedAt',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 27,
      name: 'source_system',
      path: 'data.source_system',
      value: (rawValue) => rawValue,
    },
    {
      index: 28,
      name: 'source_type',
      path: 'data.source_type',
      value: (rawValue) => rawValue,
    },
    {
      index: 29,
      name: 'source_name',
      path: 'data.source_name',
      value: (rawValue) => rawValue,
    },
    {
      index: 30,
      name: 'region',
      path: 'data.region',
      value: (rawValue) => rawValue?.split(';') || undefined,
    },
    {
      index: 31,
      name: 'affected_countries',
      path: 'data.affected_countries',
      value: (rawValue) => rawValue?.split(';') || undefined,
    },
    {
      index: 32,
      name: 'hazard',
      path: 'data.hazard',
      value: (rawValue) => rawValue,
    },
    {
      index: 33,
      name: 'syndrome',
      path: 'data.syndrome',
      value: (rawValue) => rawValue,
    },
    {
      index: 34,
      name: 'disease',
      path: 'data.disease',
      value: (rawValue) => rawValue,
    },
    {
      index: 35,
      name: 'title',
      path: 'data.title',
      value: (rawValue) => rawValue,
    },
    {
      index: 36,
      name: 'url',
      path: 'data.url',
      value: (rawValue) => rawValue,
    },
    {
      index: 37,
      name: 'infostatus',
      path: 'data.infostatus',
      value: (rawValue) => rawValue,
    },
  ];
  const ACTION_COLUMNS = [
    {
      index: 38,
      name: 'createdAt',
      path: 'createdAt',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 39,
      name: 'modifiedAt',
      path: 'modifiedAt',
      value: (rawValue) => parseDate(rawValue),
    },
    {
      index: 40,
      name: 'notes',
      path: 'data.notes',
      value: (rawValue) => rawValue,
    },
    {
      index: 41,
      name: 'action_status',
      path: 'data.action_status',
      value: (rawValue) => rawValue,
    },
  ];

  // Parse data, and create signals / information / actions
  const sheetData = [];
  const workSheetsFromFile = xlsx.parse(FILE_NAME, {
    blankrows: false,
    raw: false,
  });
  if (!!workSheetsFromFile && workSheetsFromFile.length > 0) {
    const excelSheetData = workSheetsFromFile[0].data;
    for await (const row of excelSheetData.slice(1)) {
      sheetData.push(JSON.parse(JSON.stringify(row)));
    }

    const signals = [];
    const informations = [];
    const actions = [];
    for await (const sheetValue of sheetData) {
      const signalValue = {};

      if (informationForm.resource.fields) {
        // Get information data
        const informationValue = {};
        for await (const field of INFORMATION_COLUMNS) {
          Object.assign(informationValue, {
            [field.path]: field.value(sheetValue[field.index]),
          });
        }
        // Create information
        const information = new Record({
          ...informationValue,
          incrementalId: await getNextId(String(informationForm.resource.id)),
          form: informationForm.id,
          resource: informationForm.resource.id,
        });
        informations.push(information);
        // Add info to signal
        Object.assign(signalValue, {
          ['data.sources']: [information.id],
        });

        // Get action data
        const actionValue = {};
        for await (const field of ACTION_COLUMNS) {
          Object.assign(actionValue, {
            [field.path]: field.value(sheetValue[field.index]),
          });
        }
        // Create action
        const action = new Record({
          ...actionValue,
          incrementalId: await getNextId(String(actionForm.resource.id)),
          form: actionForm.id,
          resource: actionForm.resource.id,
        });
        actions.push(action);
        // Add info to signal
        Object.assign(signalValue, {
          ['data.actions']: [action.id],
        });

        // Get signal data
        for await (const field of SIGNAL_COLUMNS) {
          Object.assign(signalValue, {
            [field.path]: field.value(sheetValue[field.index]),
          });
        }
        // Create signal
        const signal = new Record({
          ...signalValue,
          incrementalId: await getNextId(String(signalForm.resource.id)),
          form: signalForm.id,
          resource: signalForm.resource.id,
        });
        signals.push(signal);
      }
    }

    if ([...informations, ...actions, ...signals].length > 0) {
      Record.insertMany(
        [...informations, ...actions, ...signals],
        {},
        async (err) => {
          if (err) {
            console.log('Error records not added => ', err);
            process.exit(1);
          } else {
            console.log('Records added successfully');
            process.exit();
          }
        }
      );
    } else {
      console.log('No record added');
      process.exit(1);
    }
  }
};

readImportFile();
