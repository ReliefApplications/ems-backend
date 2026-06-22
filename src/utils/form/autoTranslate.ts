import { Record, Form, Resource } from '@models';
import TranslationService from '../../services/translation.service';
import { logger } from '@services/logger.service';
import * as Survey from 'survey-knockout';

/**
 * Auto translate record fields based on configured translation bindings.
 * Runs asynchronously and updates the record data in the database.
 *
 * @param recordId ID of the record to translate
 * @param modifiedKeys List of keys that were modified in the current operation
 */
export const autoTranslateRecord = async (
  recordId: any,
  modifiedKeys?: string[]
): Promise<void> => {
  try {
    const record = await Record.findById(recordId);
    if (!record) {
      logger.warn(`autoTranslateRecord: Record not found with ID ${recordId}`);
      return;
    }

    // Get the form linked to this record
    const form = await Form.findById(record.form);
    if (!form) {
      logger.warn(
        `autoTranslateRecord: Form not found with ID ${record.form} for record ${recordId}`
      );
      return;
    }

    // Determine the fields array. If form has resource, get fields from Resource.
    let fields = form.fields || [];
    if (form.resource) {
      const resource = await Resource.findById(form.resource);
      if (resource && resource.fields) {
        fields = resource.fields;
      }
    }

    // Find all fields that have translateFrom configured
    const translationFields = fields.filter((f: any) => f.translateFrom);

    if (translationFields.length === 0) {
      return;
    }

    let isUpdated = false;
    const updatedData = { ...record.data };

    for (const field of translationFields) {
      const targetField = field.name;
      const sourceField = field.translateFrom;
      const targetLang = field.translateTo;

      if (!targetLang) {
        continue;
      }

      // Check if source field exists and is a non-empty string in the record data
      const sourceValue = updatedData[sourceField];
      if (typeof sourceValue !== 'string' || !sourceValue.trim()) {
        continue;
      }

      // Check if target field is already manually provided in this request (if modifiedKeys is passed)
      if (modifiedKeys) {
        // If the source field is NOT in modifiedKeys, skip translation
        if (!modifiedKeys.includes(sourceField)) {
          continue;
        }
        // If the target field IS in modifiedKeys, skip translation to avoid overwriting user manual entry
        if (modifiedKeys.includes(targetField)) {
          continue;
        }
      }

      // Check translateIf expression
      if (field.translateIf) {
        try {
          const structure =
            typeof form.structure === 'string'
              ? JSON.parse(form.structure)
              : form.structure;
          const survey = new Survey.Model(structure);
          survey.data = updatedData;
          const conditionPassed = survey.runExpression(field.translateIf);
          if (!conditionPassed) {
            continue;
          }
        } catch (err) {
          logger.error(
            `Error evaluating translateIf expression "${field.translateIf}" for record ${recordId}`,
            {
              error: err.message,
            }
          );
          continue;
        }
      }

      // Perform translation using TranslationService
      try {
        const format = field.type === 'editor' ? 'html' : 'plain';
        const translatedText = await TranslationService.translate(
          sourceValue,
          null, // auto-detect source language
          targetLang,
          format
        );

        if (translatedText !== updatedData[targetField]) {
          updatedData[targetField] = translatedText;
          isUpdated = true;
        }
      } catch (err) {
        logger.error(
          `Failed to translate field ${sourceField} -> ${targetField} for record ${recordId}`,
          {
            error: err.message,
          }
        );
      }
    }

    if (isUpdated) {
      // Save the updated record data directly in database
      await Record.updateOne(
        { _id: record._id },
        { $set: { data: updatedData } }
      );
      logger.info(
        `autoTranslateRecord: successfully translated fields for record ${recordId}`
      );
    }
  } catch (error) {
    logger.error(`Error in autoTranslateRecord for record ${recordId}`, {
      error: error.message,
      stack: error.stack,
    });
  }
};
