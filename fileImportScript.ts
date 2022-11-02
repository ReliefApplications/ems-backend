import xlsx from 'node-xlsx';
import { startDatabase } from './src/server/database';
import { Form, Record } from './src/models';
import { getNextId } from './src/utils/form';
import dotenv from 'dotenv';

dotenv.config();

const parseDate = (rawValue: string): Date => {
  const parts = rawValue.split('/');
  const year = +parts[2] + 2000;
  const month = +parts[0] - 1;
  const day = +parts[1];
  return new Date(year, month, day);
};

const SIGNAL_FORM_NAME = 'Signals';
const SIGNAL_COLUMN_INDEXES = [0, 25];

const INFORMATION_FORM_NAME = 'Information';
const INFORMATION_COLUMN_INDEXES = [25, 38];
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

const ACTION_FORM_NAME = 'Add new action';
const ACTION_COLUMN_INDEXES = [38, 43];
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

const FILE_NAME = 'import-file.xlsm';

/**
 * Use to read excel file sheet and save records into database.
 *
 * @returns information message
 */
const readImportFile = async () => {
  await startDatabase({
    autoReconnect: true,
    reconnectInterval: 5000,
    reconnectTries: 3,
    poolSize: 10,
  });

  //getting forms "Signal","Information","Action"
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

  // todo ; add check to see if fields are really part of resource fields

  const sheetData = [];
  let columns = [];

  const workSheetsFromFile = xlsx.parse(FILE_NAME, {
    blankrows: false,
    raw: false,
  });

  if (!!workSheetsFromFile && workSheetsFromFile.length > 0) {
    const excelSheetData = workSheetsFromFile[0].data;
    let rowNumber = 0;
    for await (const row of excelSheetData) {
      if (rowNumber == 0) {
        columns = JSON.parse(JSON.stringify(row));
      } else {
        sheetData.push(JSON.parse(JSON.stringify(row)));
      }
      rowNumber++;
    }
    columns = columns.map((x) => (!!x ? x.toLowerCase() : ''));

    const informations = [];
    const actions = [];
    let processedRow = 1;
    for await (const sheetValue of sheetData.slice(0, 1)) {
      const signalValue = {};
      console.log(informationForm.resource.fields);

      if (informationForm.resource.fields) {
        const informationValue = {};
        for await (const field of INFORMATION_COLUMNS) {
          Object.assign(informationValue, {
            [field.path]: field.value(sheetValue[field.index]),
          });
        }
        const information = new Record({
          ...informationValue,
          incrementalId: await getNextId(String(informationForm.resource.id)),
          form: informationForm.id,
          resource: informationForm.resource.id,
        });
        informations.push(information);

        signalValue

        // await Record.create(information);
        // const infoIdArr = [];
        // if (!!infoInsertData) {
        //   const infoAddData = await Record.create(infoInsertData);
        //   if (!!infoAddData._id) {
        //     infoIdArr.push(infoAddData._id.toString());
        //   }
        // }
        // Object.assign(signalValueObj, { informations: infoIdArr });
      }

      // if (!!actionForm && actionForm.fields) {
      //   console.log(actionColumns);
      //   // const actionValueObj = {};
      //   // for await (const field of actionForm.fields) {
      //   //   Object.assign(actionValueObj, {
      //   //     [field.name]: sheetValue[columns.indexOf(field.name)],
      //   //   });
      //   // }
      //   // const actionInsertData = new Record({
      //   //   incrementalId: await getNextId(
      //   //     String(actionForm.resource ? actionForm.resource : actionForm.id)
      //   //   ),
      //   //   form: actionForm.id,
      //   //   createdAt: new Date(),
      //   //   modifiedAt: new Date(),
      //   //   data: actionValueObj,
      //   //   resource: actionForm.resource ? actionForm.resource : null,
      //   // });
      //   // const actionIdArr = [];
      //   // if (!!actionInsertData) {
      //   //   const actionAddData = await Record.create(actionInsertData);
      //   //   if (!!actionAddData._id) {
      //   //     actionIdArr.push(actionAddData._id.toString());
      //   //   }
      //   // }
      //   // Object.assign(signalValueObj, { actions: actionIdArr });
      // }

      // if (!!signalForm && signalForm.fields) {
      //   console.log(signalColumns);
      //   // for await (const field of signalForm.fields) {
      //   //   Object.assign(signalValueObj, {
      //   //     [field.name]: sheetValue[columns.indexOf(field.name)],
      //   //   });
      //   // }

      //   // insertData.push(
      //   //   new Record({
      //   //     incrementalId: await getNextId(
      //   //       String(signalForm.resource ? signalForm.resource : signalForm.id)
      //   //     ),
      //   //     form: signalForm.id,
      //   //     createdAt: new Date(),
      //   //     modifiedAt: new Date(),
      //   //     data: signalValueObj,
      //   //     resource: signalForm.resource ? signalForm.resource : null,
      //   //   })
      //   // );
      // }

      console.log('Processed records ==>> ', processedRow);
      processedRow++;
    }

    if (informations.length > 0) {
      Record.insertMany(informations, {}, async (err) => {
        if (err) {
          console.log('Error records not added => ', err);
        } else {
          console.log('Records added successfully');
        }
      });
    } else {
      console.log('Record not found');
    }
  }
};

readImportFile();
