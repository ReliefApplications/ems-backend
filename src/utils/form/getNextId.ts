import { Record, Form } from '../../models';
import NodeCache from 'node-cache';
import errors from '../../const/errors';
import mongoose from 'mongoose';
const cache = new NodeCache();

const PADDING_MAX_LENGTH = 8;

export const getNextId = async (form: string): Promise<string> => {
  // Get previous ID from cache
  let previousId: string = cache.get(form);
  let nextId: string;
  const currentYear = String(new Date().getFullYear());

  // If not cached, get it from the DB
  if (!previousId) {
    const lastRecord = await Record.findOne({ form }, 'incrementalId').sort({ _id: -1 }).limit(1);
    previousId = lastRecord.incrementalId;
    // If it's the first record or previous record does not have an incremental ID, create one from scratch
    if (!lastRecord || (lastRecord && !lastRecord.incrementalId)) {
      const formName = (await Form.findById(form).select('name')).name;
      previousId = `${currentYear}-${formName[0].toUpperCase()}${String(0).padStart(PADDING_MAX_LENGTH, '0')}`;
      
      // If previous records does not have an incremental ID, update them with incremental IDs
      if (lastRecord && !lastRecord.incrementalId) {
        const records = await Record.find({ form }, 'id').sort({ createdAt: 1 });
        const bulkUpdateOps = [];
        for (const record of records) {
          previousId = `${previousId.substring(0, 6)}${String(Number(previousId.substring(6)) + 1).padStart(PADDING_MAX_LENGTH, '0')}`;
          bulkUpdateOps.push({
            'updateOne': {
              'filter': { _id: mongoose.Types.ObjectId(record.id) },
              'update': { incrementalId: previousId },
            },
          });
        }
        Record.bulkWrite(bulkUpdateOps);
      }
    }
  }

  // Get next ID
  if (previousId) {
    // Increment the ID or restart the counting if it's a new year
    if (currentYear === previousId.substring(0, 4)) {
      nextId = `${previousId.substring(0, 6)}${String(Number(previousId.substring(6)) + 1).padStart(PADDING_MAX_LENGTH, '0')}`;
    } else {
      nextId = `${currentYear}-${previousId[5]}${String(1).padStart(PADDING_MAX_LENGTH, '0')}`;
    }
    cache.set(form, nextId);
  } else {
    throw new Error(errors.incrementalIdError);
  }
  return nextId;
};
