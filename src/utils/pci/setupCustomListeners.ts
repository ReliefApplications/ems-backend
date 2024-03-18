import { Schema, Types } from 'mongoose';
import config from 'config';
import { Form, Record } from '@models';
import { getNextId } from '@utils/form';

/** Whether or not the current environment is PCI */
const IS_PCI = config.get('server.url') === 'https://pci.oortcloud.tech/api';

/** Location form id */
const LOCATION_FORM_ID = new Types.ObjectId('65d61bfbccb8d36936d10cb6');

/** Indicator entry form id */
const INDICATOR_ENTRY_FORM_ID = new Types.ObjectId('65d4149a2f563e430b3958f9');

/** Level of tension indicator id */
const TENSION_INDICATOR_ID = '65f7a5e2b5f857f6babcfd4d';

/**
 * Returns the today date in YYYY-MM-DD
 *
 * @returns The date string
 */
export const todayDate = () => {
  const padded = (num: number) => num.toString().padStart(2, '0');
  const now = new Date();

  return `${now.getFullYear()}-${padded(now.getMonth() + 1)}-${padded(
    now.getDate()
  )}T00:00:00.000Z`;
};

/**
 * Creates a tension indicator entry from the current location value
 *
 * @param record Record to create the tension indicator entry from
 */
const createTensionIndicatorEntry = async (record: Record) => {
  const statusMap = {
    low: {
      value: 1,
      label: 'Low tension',
    },
    moderate: {
      value: 2,
      label: 'Moderate tension',
    },
    high: {
      value: 3,
      label: 'High tension',
    },
  };
  const status = record.data?.status;

  const entryForm = await Form.findById(INDICATOR_ENTRY_FORM_ID);

  // Get next ID
  const { incrementalId, incID } = await getNextId(entryForm);

  const indEntry = new Record({
    incrementalId,
    incID,
    form: INDICATOR_ENTRY_FORM_ID,
    lastUpdateForm: INDICATOR_ENTRY_FORM_ID,
    resource: entryForm.resource,
    _createdBy: record._lastUpdatedBy,
    data: {
      date: new Date(todayDate()),
      indicator: TENSION_INDICATOR_ID,
      value: statusMap[status].value,
      qualitative_value: statusMap[status].label,
      unit: 'Scale (1-3)',
      location: record._id.toString(),
    },
    _form: {
      _id: entryForm._id,
      name: entryForm.name,
    },
    archived: false,
  });

  await indEntry.save();
};

/**
 * Custom logic for PCI, to be replace with plugin in the future
 * When updating a location, check for any changes to the location's status
 * and create an indicator entry
 *
 * @param schema Record schema
 */
export const setupCustomPCIListeners = <DocType>(schema: Schema<DocType>) => {
  // If not in the PCI server, do nothing
  if (!IS_PCI && config.util.getEnv('NODE_ENV') === 'production') {
    return;
  }

  schema.post('save', async function (doc) {
    const rec = doc as Record;
    if (LOCATION_FORM_ID.equals(rec.form)) {
      await createTensionIndicatorEntry(rec);
    }
  });

  schema.post('findOneAndUpdate', async function (doc) {
    if (LOCATION_FORM_ID.equals(doc.form)) {
      await createTensionIndicatorEntry(doc);
    }
  });
};
