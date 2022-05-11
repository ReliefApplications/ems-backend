import { Borders, Fill, Workbook } from 'exceljs';
import {
  RecordHistoryType,
  RecordHistoryMetaType,
  ChangeType,
} from '../../models';

const changeValueIsObject = (change: ChangeType) => {
  if (change.new) {
    return !Array.isArray(change.new) && change.new instanceof Object;
  }
  if (change.old) {
    return !Array.isArray(change.old) && change.old instanceof Object;
  }

  return false;
};

const addToWhiteText = (_firstChange: boolean, whiteText: number[]) => {
  let firstChange = _firstChange;
  if (firstChange) {
    firstChange = false;
    if (whiteText[0] < 0) whiteText[0] -= 1;
    else whiteText.unshift(-1);
  } else {
    if (whiteText[0] < 0) whiteText[0] = -whiteText[0] + whiteText[1] + 1;
    else whiteText.unshift(whiteText[0] + 1);
  }
  return firstChange;
};

/**
 * Builds an XLSX file for the a record's history.
 *
 * @param history The record's history
 * @param meta The record's metadate
 * @param options Options object
 * @param options.translate i18n translation function
 * @param options.dateLocale date formatting locale string
 * @param options.type xlsx | csv
 * @returns response with file attached.
 */
const historyBuilder = async (
  history: RecordHistoryType,
  meta: RecordHistoryMetaType,
  options: {
    translate: (key: string, options?: { [key: string]: string }) => string;
    dateLocale: string;
    type: 'csv' | 'xlsx';
  }
) => {
  const workbook = new Workbook();

  // the replace function is required for the test lang
  // the worksheet name must not contain special characters
  const worksheet = workbook.addWorksheet(
    options
      .translate('history.filename', { id: meta.record })
      .replace('******', 'test filename')
  );
  worksheet.properties.defaultColWidth = 20;
  const headerStyles = {
    font: {
      color: { argb: 'FFFFFFFF' },
    },
    fill: <Fill>{
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ff008dc9' },
    },
    border: <Partial<Borders>>{
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  // metadata section
  for (const prop in meta) {
    const metaTitle = options.translate(`history.headers.${prop}`);
    if (prop === 'exportDate') worksheet.addRow([]);
    worksheet.addRow([metaTitle, meta[prop]]);
  }

  // styling for metadata section
  [...Object.keys(meta), ''].forEach((_, i) => {
    worksheet.getCell(`A${i + 1}`).font = headerStyles.font;
    worksheet.getCell(`A${i + 1}`).fill = headerStyles.fill;
    worksheet.getCell(`A${i + 1}`).border = headerStyles.border;
  });

  // spacing
  worksheet.addRows([[''], ['']]);

  // header for the changes
  const headerRow = worksheet.addRow(
    ['date', 'time', 'user', 'type', 'displayName', 'new', 'old'].map((t) =>
      options.translate(`history.headers.${t}`)
    )
  );
  headerRow.font = headerStyles.font;
  headerRow.fill = headerStyles.fill;
  headerRow.border = headerStyles.border;

  // changes
  const changeRows = [];

  const whiteText = [worksheet.rowCount];
  history.forEach((version) => {
    let firstChange = true;
    for (const change of version.changes) {
      const date = version.created.toLocaleDateString(options.dateLocale);
      const time = version.created.toLocaleTimeString(options.dateLocale);
      if (changeValueIsObject(change)) {
        const keys = Object.keys(change.new) || Object.keys(change.old);
        for (const key of keys) {
          firstChange = addToWhiteText(firstChange, whiteText);

          const oldVal = change.old ? change.old[key] : '';
          const newVal = change.new ? change.new[key] : '';
          changeRows.push([
            date,
            time,
            version.createdBy,
            change.type,
            `${change.displayName}.${key}`,
            Array.isArray(newVal) ? newVal.join(', ') : newVal,
            Array.isArray(oldVal) ? oldVal.join(', ') : oldVal,
          ]);
        }
      } else {
        firstChange = addToWhiteText(firstChange, whiteText);

        changeRows.push([
          date,
          time,
          version.createdBy,
          change.type,
          change.displayName,
          Array.isArray(change.new) ? change.new.join(', ') : change.new,
          Array.isArray(change.old) ? change.old.join(', ') : change.old,
        ]);
      }
    }
  });
  worksheet.addRows(changeRows);
  whiteText.forEach((row) => {
    ['A', 'B', 'C'].forEach((col) => {
      worksheet.getCell(`${col}${row}`).font = headerStyles.font;
    });
  });

  // write to a new buffer
  return workbook[options.type].writeBuffer();
};

export default historyBuilder;
