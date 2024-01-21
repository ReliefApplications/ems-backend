import {
  Record,
  Form,
  DEFAULT_INCREMENTAL_ID_SHAPE,
  ID_SHAPE_VARIABLES,
} from '@models';
import i18next from 'i18next';
import { isEqual } from 'lodash';
import { Types } from 'mongoose';
import { logger } from '@services/logger.service';
import NodeCache from 'node-cache';

/** Internal node cache object instance */
const cache = new NodeCache();

/** Maps each available variable to its template */
const TEMPLATES = {
  YEAR: '{year}',
  FORM_INITIAL: '{formInitial}',
  FORM_NAME: '{formName}',
  INCREMENTAL_NUM: '{incremental}',
} as const;

/**
 * Builds the incremental ID from the the shape string and an object with all the variables.
 *
 * @param idShape The shape id object.
 * @param variables The variables object.
 * @returns The incremental ID.
 */
export const buildIncrementalId = (
  idShape: Form['idShape'],
  variables: { [key in ID_SHAPE_VARIABLES]: string }
) => {
  const { shape, padding } = idShape;
  let newID = shape;

  // {incremental} variable is mandatory
  if (shape.includes(TEMPLATES.INCREMENTAL_NUM) && variables.incremental) {
    newID = newID.replace(
      new RegExp(TEMPLATES.INCREMENTAL_NUM, 'g'),
      variables.incremental.padStart(padding, '0')
    );
  } else {
    throw new Error(i18next.t('utils.form.getNextId.errors.invalidShape'));
  }
  // {year} variable is optional
  if (shape.includes(TEMPLATES.YEAR) && variables.year) {
    newID = newID.replace(new RegExp(TEMPLATES.YEAR, 'g'), variables.year);
  }
  // {formInitial} variable is optional
  if (shape.includes(TEMPLATES.FORM_INITIAL) && variables.formInitial) {
    newID = newID.replace(
      new RegExp(TEMPLATES.FORM_INITIAL, 'g'),
      variables.formInitial
    );
  }
  // {formName} variable is optional
  if (shape.includes(TEMPLATES.FORM_NAME) && variables.formName) {
    newID = newID.replace(
      new RegExp(TEMPLATES.FORM_NAME, 'g'),
      variables.formName
    );
  }

  return newID;
};

/**
 * Updates all incremental IDs of a form
 *
 * @param form Id or form object.
 * @param newShape New shape of the incremental ID.
 */
export const updateIncrementalIds = async (
  form: Form | string | Types.ObjectId,
  newShape: Form['idShape']
) => {
  // If form is a string, fetches the form object
  if (!(form instanceof Form)) {
    form = await Form.findById(form);
  }

  const { idShape: oldShape } = form as Form;

  // If the shape is the same, do nothing
  if (isEqual(oldShape, newShape)) {
    return;
  }

  // Whether the new shape uses the year variable
  const usesYear = newShape.shape.includes(TEMPLATES.YEAR);

  // Gets the total number of records
  const totalRecords = await Record.countDocuments({
    form,
  });

  let inc = 0;
  let lastRecordUpdated = { createdAt: null };
  // Updates the incremental ID of each record in batches
  const BATCH_SIZE = 5000;
  for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
    logger.log({
      level: 'info',
      message: `Updating incremental ids record from form "${
        (form as Form).name
      }": [${i}/${totalRecords}]...`,
    });

    const records = await Record.find({ form })
      .skip(i)
      .limit(BATCH_SIZE)
      .select('incID createdAt');

    for (let r = 0; r < records.length; r++) {
      const { createdAt } = records[r];
      const { createdAt: prevCreatedAt } = records[r - 1] || lastRecordUpdated;

      if (
        // If {year} is used in the shape
        usesYear &&
        // Checks if the previous record exists and that the year is different
        createdAt.getFullYear() !== prevCreatedAt?.getFullYear()
      ) {
        // Resets the counter
        inc = 0;
      }

      // Increments the counter
      inc += 1;

      const newIncrementalId = buildIncrementalId(newShape, {
        incremental: inc.toString(),
        year: createdAt.getFullYear().toString(),
        formInitial: (form as Form).name?.charAt(0).toUpperCase() || '',
        formName: (form as Form).name?.toUpperCase() || '',
      });

      records[r].incrementalId = newIncrementalId;
      records[r].incID = inc;
    }

    // Save the changes
    await Record.bulkSave(records);

    // Updates the last record updated
    lastRecordUpdated = records[records.length - 1];
  }
};

/**
 * Gets next id of a form / resource, based on previous records.
 * Updates previous records if needed.
 *
 * @param structureId Id of the form / resource.
 * @returns New id for the record.
 */
export const getNextId = async (structureId: string) => {
  // Gets the form name and id shape
  const { name, idShape: formIDShape } = await Form.findOne({
    $or: [{ _id: structureId }, { resource: structureId, core: true }],
  }).select('name idShape');

  const idShape = formIDShape || DEFAULT_INCREMENTAL_ID_SHAPE;

  /** Gets the last id added to the form */
  const getLastID = async () => {
    const filters = {
      $and: [
        { $or: [{ resource: structureId }, { form: structureId }] },
        // Only add the year filter if the id shape includes the year variable
        idShape.shape.includes(ID_SHAPE_VARIABLES.YEAR)
          ? {
              $expr: {
                $eq: [{ $year: '$createdAt' }, new Date().getFullYear()],
              },
            }
          : {},
      ],
    };

    // Fetches the last record to get the last id used
    let lastRecord = await Record.findOne(filters)
      .sort({ _id: -1 })
      .limit(1)
      .select('incID');

    if (lastRecord && !lastRecord.incID) {
      // If the last record has no incID, it means it was created before the incID field was added
      // to the Record model. In this case, we need to update the incID of all records
      // to avoid duplicates.
      await updateIncrementalIds(structureId, idShape);

      // Re-fetches the last record
      lastRecord = await Record.findOne(filters)
        .sort({ _id: -1 })
        .limit(1)
        .select('incID');
    }
    return lastRecord?.incID ?? null;
  };

  // Tries to get the next id from cache
  const cachedID = cache.get<number>(
    `${structureId}-${new Date().getFullYear()}`
  );

  const incID = (cachedID ?? (await getLastID()) ?? 0) + 1;

  const incrementalId = buildIncrementalId(idShape, {
    incremental: incID.toString(),
    year: new Date().getFullYear().toString(),
    formInitial: name?.charAt(0).toUpperCase() || '',
    formName: name?.toUpperCase() || '',
  });

  cache.set(`${structureId}-${new Date().getFullYear()}`, incID);
  return { incID, incrementalId };
};
