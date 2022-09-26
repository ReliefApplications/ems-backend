import xlsx from 'node-xlsx';
import { startDatabaseForImport } from './src/utils/import/database.helper';
import { Form, Record } from './src/models';
import { getNextId } from './src/utils/form';

/**
 * Use to read excel file sheet and save records into database.
 *
 * @returns information message
 */
const readImportFile = async () => {
  await startDatabaseForImport();

  //getting forms "Signal","Information","Action"
  const formList: Form[] = await Form.find({
    name: { $in: ['Signal', 'Information', 'Action'] },
  });

  const signalForm = formList.filter((form) => form.name == 'Signal')[0];
  const informationForm = formList.filter(
    (form) => form.name == 'Information'
  )[0];
  const actionForm = formList.filter((form) => form.name == 'Action')[0];

  const fileName = 'HQ Signal History Import (copy).xlsm';
  const sheetData = [];
  let columns = [];

  const workSheetsFromFile = xlsx.parse(fileName, {
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

    const insertData = [];
    let processedRow = 1;
    for await (const sheetValue of sheetData) {
      const signalValueObj = {};

      if (!!informationForm && informationForm.fields) {
        const infoValueObj = {};
        for await (const field of informationForm.fields) {
          Object.assign(infoValueObj, {
            [field.name]: sheetValue[columns.indexOf(field.name)],
          });
        }
        const infoInsertData = new Record({
          incrementalId: await getNextId(
            String(
              informationForm.resource
                ? informationForm.resource
                : informationForm.id
            )
          ),
          form: informationForm.id,
          createdAt: new Date(),
          modifiedAt: new Date(),
          data: infoValueObj,
          resource: informationForm.resource ? informationForm.resource : null,
        });

        const infoIdArr = [];
        if (!!infoInsertData) {
          const infoAddData = await Record.create(infoInsertData);
          if (!!infoAddData._id) {
            infoIdArr.push(infoAddData._id.toString());
          }
        }
        Object.assign(signalValueObj, { informations: infoIdArr });
      }

      if (!!actionForm && actionForm.fields) {
        const actionValueObj = {};
        for await (const field of actionForm.fields) {
          Object.assign(actionValueObj, {
            [field.name]: sheetValue[columns.indexOf(field.name)],
          });
        }
        const actionInsertData = new Record({
          incrementalId: await getNextId(
            String(actionForm.resource ? actionForm.resource : actionForm.id)
          ),
          form: actionForm.id,
          createdAt: new Date(),
          modifiedAt: new Date(),
          data: actionValueObj,
          resource: actionForm.resource ? actionForm.resource : null,
        });
        const actionIdArr = [];
        if (!!actionInsertData) {
          const actionAddData = await Record.create(actionInsertData);
          if (!!actionAddData._id) {
            actionIdArr.push(actionAddData._id.toString());
          }
        }
        Object.assign(signalValueObj, { actions: actionIdArr });
      }

      if (!!signalForm && signalForm.fields) {
        for await (const field of signalForm.fields) {
          Object.assign(signalValueObj, {
            [field.name]: sheetValue[columns.indexOf(field.name)],
          });
        }

        insertData.push(
          new Record({
            incrementalId: await getNextId(
              String(signalForm.resource ? signalForm.resource : signalForm.id)
            ),
            form: signalForm.id,
            createdAt: new Date(),
            modifiedAt: new Date(),
            data: signalValueObj,
            resource: signalForm.resource ? signalForm.resource : null,
          })
        );
      }

      console.log('Processed records ==>> ', processedRow);
      processedRow++;
    }

    if (insertData.length > 0) {
      Record.insertMany(insertData, {}, async (err) => {
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
