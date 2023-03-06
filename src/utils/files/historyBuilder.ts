import { Borders, Fill, Workbook } from 'exceljs';
import { RecordHistory, RecordHistoryMeta, Change } from '@models';
import getTimeWithTimezone from '@utils/date/getTimeWithTimezone';

/**
 * Check if an object value is detected in the change.
 *
 * @param change single change to test
 * @returns true if an object is detected
 */
const changeValueIsObject = (change: Change) => {
  if (change.new) {
    return !Array.isArray(change.new) && change.new instanceof Object;
  }
  if (change.old) {
    return !Array.isArray(change.old) && change.old instanceof Object;
  }
  return false;
};

/**
 * Asserts if a line of the sheet should have white colored text.
 * If so, the line number will be pushed to the whiteText array.
 *
 * @param _firstChange boolean signifying the first change of a version
 * @param whiteText list of line numbers that should have white colored text
 * @returns the updated firstChange value
 */
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
 * Push a row in the passed array of rows.
 *
 * @param firstChange Boolean to indicate if it's the first change of a version.
 * @param whiteText List of line index that should have white colored text.
 * @param changeRows List of rows to fill in.
 * @param row Data to put in rows.
 * @param row.date Date of the change.
 * @param row.time Time of the change.
 * @param row.createdBy User who did the change.
 * @param row.displayType Type of change.
 * @param row.displayName Name of the changed field.
 * @param row.old Old value of the field.
 * @param row.new New value of the field.
 * @param translate i18n translation function
 * @returns Boolean to indicate if it's the first change of a version.
 */
const pushRow = (
  firstChange: boolean,
  whiteText: number[],
  changeRows: any[],
  row: {
    date: string;
    time: string;
    createdBy: string;
    displayType: string;
    displayName: string;
    new: any;
    old: any;
  },
  translate: (key: string, options?: { [key: string]: string }) => string
): boolean => {
  let newValue = row.new;
  let oldValue = row.old;
  let displayType = row.displayType;
  if (Array.isArray(newValue)) {
    // If old AND new value are arrays, we may divide the row in two differents ones.
    // One row for added elements and one for removed elements.
    if (oldValue && Array.isArray(oldValue)) {
      const added = newValue.filter((value) => !oldValue.includes(value));
      const removed = oldValue.filter((value) => !newValue.includes(value));
      // If we have a push, change the row to reflect a push.
      if (added.length > 0) {
        newValue = added.join(', ');
        oldValue = null;
        displayType = translate('history.value.push');
        // If we have also have a pull, put the push change in the rows.
        if (removed.length > 0) {
          firstChange = addToWhiteText(firstChange, whiteText);
          changeRows.push([
            row.date,
            row.time,
            row.createdBy,
            displayType,
            row.displayName,
            newValue,
            oldValue,
          ]);
        }
      }
      // If we have a pull, change the row to reflect a pull.
      if (removed.length > 0) {
        newValue = null;
        oldValue = removed.join(', ');
        displayType = translate('history.value.pull');
      }
    } else {
      newValue = newValue.join(', ');
    }
  } else {
    if (oldValue && Array.isArray(oldValue)) oldValue = oldValue.join(', ');
  }
  changeRows.push([
    row.date,
    row.time,
    row.createdBy,
    displayType,
    row.displayName,
    newValue,
    oldValue,
  ]);
  return addToWhiteText(firstChange, whiteText);
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
  history: RecordHistory,
  meta: RecordHistoryMeta,
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
      const date = version.createdAt.toLocaleDateString(options.dateLocale);
      const time = getTimeWithTimezone(version.createdAt, options.dateLocale);
      if (changeValueIsObject(change)) {
        const keys = Object.keys(change.new) || Object.keys(change.old);
        for (const key of keys) {
          const newVal = change.new ? change.new[key] : '';
          const oldVal = change.old ? change.old[key] : '';
          firstChange = pushRow(
            firstChange,
            whiteText,
            changeRows,
            {
              date,
              time,
              createdBy: version.createdBy,
              displayType: change.displayType,
              displayName: `${change.displayName}.${key}`,
              new: newVal,
              old: oldVal,
            },
            options.translate
          );
        }
      } else {
        firstChange = pushRow(
          firstChange,
          whiteText,
          changeRows,
          {
            date,
            time,
            createdBy: version.createdBy,
            displayType: change.displayType,
            displayName: change.displayName,
            new: change.new,
            old: change.old,
          },
          options.translate
        );
      }
    }
  });
  worksheet.addRows(changeRows);
  whiteText.forEach((row) => {
    if (row > 0) {
      ['A', 'B', 'C'].forEach((col) => {
        worksheet.getCell(`${col}${row}`).font = headerStyles.font;
      });
    }
  });

  // write to a new buffer
  return workbook[options.type].writeBuffer();
};

export default historyBuilder;
