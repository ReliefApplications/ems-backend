import mongoose from 'mongoose';
import { Record } from '@models';
import { CalculatedFieldService } from '@services/calculatedField.service';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Fields requested on the records related to the records of a query */
export type RelatedFieldsSelection = {
  /** Name of the resource / form of the related records */
  entityName: string;
  /** Names of the requested fields */
  fields: string[];
};

/**
 * Computes the calculated fields requested on the records related to the
 * records of a query ( resource / resources questions, in both directions ),
 * and adds them to the data of these records.
 *
 * Calculated fields are not stored on the records: they are built from their
 * expression. The related records are fetched as they are stored, so their
 * calculated fields would otherwise be empty ( e.g. a grid column displaying
 * a calculated field of a linked record ).
 *
 * @param relatedRecords Related records, edited in place
 * @param selections Fields requested on the related records, per entity
 * @param fieldsByName Structure name / fields as key, value
 * @param idsByName Structure name / id as key, value
 * @param context Request context
 */
export const addRelatedCalculatedFields = async (
  relatedRecords: Record[],
  selections: RelatedFieldsSelection[],
  fieldsByName: any,
  idsByName: any,
  context: any
): Promise<void> => {
  if (relatedRecords.length === 0) {
    return;
  }
  // Requested calculated fields, per entity
  const calculatedFieldsByEntity = new Map<string, Map<string, any>>();
  for (const selection of selections) {
    const entityFields: any[] = fieldsByName[selection.entityName] || [];
    for (const field of entityFields) {
      if (
        field.isCalculated &&
        field.expression &&
        selection.fields.includes(field.name)
      ) {
        if (!calculatedFieldsByEntity.has(selection.entityName)) {
          calculatedFieldsByEntity.set(selection.entityName, new Map());
        }
        calculatedFieldsByEntity
          .get(selection.entityName)
          .set(field.name, field);
      }
    }
  }

  const recordsById = new Map(
    relatedRecords.map((record) => [String(record._id), record])
  );
  for (const [entityName, calculatedFields] of calculatedFieldsByEntity) {
    try {
      const entityId = new mongoose.Types.ObjectId(
        String(idsByName[entityName])
      );
      const calculatedFieldService = new CalculatedFieldService(
        { _id: entityId, fields: fieldsByName[entityName], name: entityName },
        context,
        context.timeZone,
        context.user?.attributes || {}
      );
      const stages = [];
      const projection = {};
      for (const field of calculatedFields.values()) {
        stages.push(
          ...(await calculatedFieldService.build(field.expression, field.name))
        );
        projection[`data.${field.name}`] = 1;
      }
      const computedRecords = await Record.aggregate([
        {
          $match: {
            _id: { $in: relatedRecords.map((record) => record._id) },
            $or: [{ resource: entityId }, { form: entityId }],
          },
        },
        ...stages,
        { $project: projection },
      ]);
      for (const computed of computedRecords) {
        const record = recordsById.get(String(computed._id));
        if (record) {
          record.data = { ...(record.data || {}), ...(computed.data || {}) };
        }
      }
    } catch (err) {
      // A broken expression should not prevent the records from being displayed
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    }
  }
};

export default addRelatedCalculatedFields;
